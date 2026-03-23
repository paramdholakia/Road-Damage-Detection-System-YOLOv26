"""RoadLens backend service.

This module exposes Flask API endpoints for:
- Health checks and model metadata
- Image and video damage detection using a YOLO model
- Video result download and processing progress polling

Design goals:
- Keep endpoint behavior stable and predictable for the frontend
- Enforce safe file handling and bounded storage growth
- Prefer explicit, readable code paths over implicit side effects
"""

from __future__ import annotations

import base64
import importlib
import logging
import os
import socket
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import cv2
import numpy as np
import torch
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO
from werkzeug.utils import secure_filename

try:
    importlib.import_module('pillow_avif')
except ImportError:
    pass

try:
    pillow_heif_module = importlib.import_module('pillow_heif')
    pillow_heif_module.register_heif_opener()
except ImportError:
    pass

app = Flask(__name__)


class UTCFormatter(logging.Formatter):
    """Formatter that emits timestamps in UTC for consistent cross-system logs."""

    converter = time.gmtime


def configure_logging() -> logging.Logger:
    """Configure readable, production-friendly logging for this service."""
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Avoid duplicate lines when running under reloaders or preconfigured environments.
    root_logger.handlers.clear()

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(
        UTCFormatter(
            '%(asctime)s UTC | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    )
    root_logger.addHandler(stream_handler)

    return logging.getLogger(__name__)


LOGGER = configure_logging()

BASE_DIR = Path(__file__).resolve().parent
STORAGE_ROOT = Path(os.environ.get('STORAGE_ROOT', '/tmp/roadlens'))
UPLOAD_FOLDER = STORAGE_ROOT / 'uploads'
RESULTS_FOLDER = STORAGE_ROOT / 'results'
MODEL_PATH = Path(os.environ.get('MODEL_PATH', BASE_DIR / 'models' / 'best.pt'))

# Parse and normalize CORS origins from environment.
# Example: ALLOWED_ORIGINS="http://localhost:3000,https://example.com"
allowed_origins = [origin.strip() for origin in os.environ.get('ALLOWED_ORIGINS', '*').split(',') if origin.strip()]
if not allowed_origins:
    # Fallback to wildcard if configuration was empty after trimming.
    allowed_origins = ['*']
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

# Configuration
# Supported image formats for upload and inference decoding.
IMAGE_EXTENSIONS = {
    'jpg', 'jpeg', 'png', 'webp', 'jfif', 'jpe',
    'bmp', 'dib', 'tif', 'tiff', 'gif',
    'avif', 'heic', 'heif'
}
# Supported video formats for upload and frame-by-frame inference.
VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm', 'm4v'}
# Combined extension allow-list used by validation helper.
ALLOWED_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS
# Hard request-body cap (Flask rejects payload with HTTP 413 above this size).
MAX_UPLOAD_MB = int(os.environ.get('MAX_UPLOAD_MB', '200'))
# Retention policy for temporary media and stale in-memory progress records.
FILE_RETENTION_MINUTES = int(os.environ.get('FILE_RETENTION_MINUTES', '60'))
# Whether processed videos are deleted after successful response completion.
DELETE_VIDEO_AFTER_DOWNLOAD = os.environ.get('DELETE_VIDEO_AFTER_DOWNLOAD', 'true').lower() == 'true'
# Detection tuning values used in both image and video inference paths.
INFERENCE_CONF = float(os.environ.get('INFERENCE_CONF', '0.20'))
INFERENCE_IOU = float(os.environ.get('INFERENCE_IOU', '0.45'))
INFERENCE_IMAGE_SIZE = int(os.environ.get('INFERENCE_IMAGE_SIZE', '1280'))

# Progress tracking dictionary
progress_tracker: Dict[str, Dict[str, Any]] = {}

# Create necessary folders
# Ensure required storage directories exist before handling requests.
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['RESULTS_FOLDER'] = str(RESULTS_FOLDER)
app.config['MAX_CONTENT_LENGTH'] = MAX_UPLOAD_MB * 1024 * 1024

# GPU/Device Detection
def get_device() -> Tuple[str, str, str]:
    """Resolve the best available inference device.

    Returns:
        tuple[str, str, str]:
            - device string understood by Ultralytics (e.g. ``cuda:0`` or ``cpu``)
            - user-friendly device name
            - CUDA version string when available
    """
    if torch.cuda.is_available():
        device = 'cuda:0'
        gpu_name = torch.cuda.get_device_name(0)
        cuda_version = torch.version.cuda
        LOGGER.info('GPU available: %s | CUDA: %s | Device: %s', gpu_name, cuda_version, device)
        return device, gpu_name, cuda_version

    LOGGER.warning('GPU not available. Falling back to CPU inference.')
    return 'cpu', 'CPU', 'N/A'

DEVICE, GPU_NAME, CUDA_VERSION = get_device()
LOGGER.info('Using device: %s', DEVICE)

# Load YOLO model
LOGGER.info('Loading YOLO model from: %s', MODEL_PATH)
model = YOLO(MODEL_PATH)
LOGGER.info('Model loaded successfully.')

# Class names from your training
CLASS_NAMES = {
    0: 'Longitudinal Crack',
    1: 'Transverse Crack',
    2: 'Alligator Crack',
    3: 'Other',               
    4: 'Pothole'
}

MODEL_TECHNICAL_DETAILS = {
    'model_name': 'RoadLens YOLO26m Detector',
    'framework': {
        'library': 'Ultralytics',
        'version': '8.4.19',
        'task': 'detect',
        'checkpoint_path': str(MODEL_PATH),
        'checkpoint_size_mb': 44.2
    },
    'architecture': {
        'summary_name': 'YOLO26m (fused)',
        'layers': 132,
        'parameters': 20353307,
        'gflops': 67.9
    },
    'dataset': {
        'validation_images': 5758,
        'validation_instances': 9740,
        'classes': CLASS_NAMES,
        'instances_per_class': {
            'Longitudinal Crack': 3890,
            'Transverse Crack': 1769,
            'Alligator Crack': 1553,
            'Other': 1563,
            'Pothole': 965
        },
        'images_per_class_presence': {
            'Longitudinal Crack': 2011,
            'Transverse Crack': 1158,
            'Alligator Crack': 1222,
            'Other': 1093,
            'Pothole': 544
        }
    },
    'training_configuration': {
        'epochs': 100,
        'inference_image_size': 1280,
        'inference_thresholds': {
            'conf': 0.25,
            'iou': 0.45
        },
        'hardware': {
            'gpu': 'Tesla T4',
            'cuda_memory_mib': 14913,
            'python': '3.12.12',
            'torch': '2.9.0+cu126'
        }
    },
    'validation_metrics': {
        'overall': {
            'precision': 0.654,
            'recall': 0.557,
            'mAP50': 0.601,
            'mAP50_95': 0.313,
            'fitness': 0.3135
        },
        'per_class': {
            'Longitudinal Crack': {
                'precision': 0.640,
                'recall': 0.553,
                'mAP50': 0.595,
                'mAP50_95': 0.322
            },
            'Transverse Crack': {
                'precision': 0.634,
                'recall': 0.512,
                'mAP50': 0.554,
                'mAP50_95': 0.257
            },
            'Alligator Crack': {
                'precision': 0.664,
                'recall': 0.584,
                'mAP50': 0.629,
                'mAP50_95': 0.316
            },
            'Other': {
                'precision': 0.701,
                'recall': 0.724,
                'mAP50': 0.756,
                'mAP50_95': 0.462
            },
            'Pothole': {
                'precision': 0.632,
                'recall': 0.413,
                'mAP50': 0.471,
                'mAP50_95': 0.211
            }
        }
    },
    'inference_speed_ms_per_image': {
        'preprocess': 0.7,
        'inference': 41.0,
        'postprocess': 0.1
    }
}

def allowed_file(filename: str) -> bool:
    """Return ``True`` when the filename has an allowed extension."""
    # Accept only known extensions and reject extension-less filenames.
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def safe_session_id(raw_session_id: str) -> str:
    """Sanitize a user-provided session id or generate a safe fallback UUID."""
    # secure_filename neutralizes separators/special chars to prevent path injection.
    return secure_filename(raw_session_id) or str(uuid.uuid4())

def is_video(filename: str) -> bool:
    """Return ``True`` if the filename extension maps to a supported video type."""
    return filename.rsplit('.', 1)[1].lower() in VIDEO_EXTENSIONS

def decode_image_for_inference(image_path: str) -> np.ndarray:
    """Decode an image path into a BGR frame suitable for OpenCV/YOLO inference.

    Decoding strategy:
    1. Attempt OpenCV native decoder first (fast path).
    2. Fall back to Pillow for extended formats such as AVIF/HEIF.

    Raises:
        ValueError: If the file cannot be decoded into a valid image frame.
    """
    frame = cv2.imread(image_path, cv2.IMREAD_COLOR)
    if frame is not None:
        # Preferred fast-path when OpenCV can decode natively.
        return frame

    try:
        with Image.open(image_path) as pil_image:
            # Normalize to RGB then convert to BGR to match OpenCV expectations.
            rgb_image = pil_image.convert('RGB')
            return cv2.cvtColor(np.array(rgb_image), cv2.COLOR_RGB2BGR)
    except (UnidentifiedImageError, OSError) as image_error:
        raise ValueError(
            f"Unsupported or corrupted image format: {Path(image_path).suffix.lower()}"
        ) from image_error

def cleanup_file(path: Optional[str]) -> None:
    """Delete a file if it exists, suppressing cleanup-time failures safely."""
    if path and os.path.exists(path):
        try:
            os.remove(path)
        except Exception as cleanup_error:
            # Cleanup failure should not fail request lifecycle; warn and continue.
            LOGGER.warning('Cleanup warning for %s: %s', path, cleanup_error)

def cleanup_expired_files() -> None:
    """Purge expired files from upload/result folders based on retention policy."""
    now = time.time()
    retention_seconds = FILE_RETENTION_MINUTES * 60

    # Apply same retention sweep across uploads and rendered results.
    for folder in (app.config['UPLOAD_FOLDER'], app.config['RESULTS_FOLDER']):
        try:
            for entry in os.scandir(folder):
                if not entry.is_file():
                    continue
                file_age = now - entry.stat().st_mtime
                if file_age > retention_seconds:
                    cleanup_file(entry.path)
        except FileNotFoundError:
            # Recreate missing directory to self-heal runtime state.
            os.makedirs(folder, exist_ok=True)
        except Exception as cleanup_error:
            LOGGER.warning('Directory cleanup warning for %s: %s', folder, cleanup_error)

def purge_stale_progress() -> None:
    """Remove stale in-memory progress records outside retention window."""
    retention_seconds = FILE_RETENTION_MINUTES * 60
    now = time.time()
    stale_ids = []

    # Build a list first to avoid mutating dictionary during iteration.
    for session_id, info in progress_tracker.items():
        updated_at = info.get('updated_at')
        if updated_at and (now - updated_at) > retention_seconds:
            stale_ids.append(session_id)

    # Remove stale records to keep memory bounded over long runtimes.
    for session_id in stale_ids:
        progress_tracker.pop(session_id, None)

def encode_image_to_base64(image_path: str) -> str:
    """Encode an image file into a base64 UTF-8 string."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Return runtime health and infrastructure metadata for monitoring."""
    # Keep health check lightweight and deterministic for probes/load balancers.
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'device': DEVICE,
        'gpu_name': GPU_NAME,
        'cuda_available': torch.cuda.is_available(),
        'cuda_version': CUDA_VERSION,
        'storage_root': str(STORAGE_ROOT),
        'max_upload_mb': MAX_UPLOAD_MB,
        'file_retention_minutes': FILE_RETENTION_MINUTES,
        'timestamp_utc': datetime.utcnow().isoformat() + 'Z'
    })

@app.errorhandler(413)
def request_entity_too_large(_error):
    """Return a JSON payload when request size exceeds configured limit."""
    return jsonify({'error': f'File too large. Maximum allowed size is {MAX_UPLOAD_MB}MB.'}), 413

@app.route('/api/predict', methods=['POST'])
def predict():
    """Handle uploaded media and return detection output.

    Request:
        multipart/form-data with key ``file`` and optional ``session_id``.

    Response:
        JSON with either image result payload or video processing metadata.
    """
    filepath = None
    try:
        # Validate form-data contract early to return clear client errors.
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Opportunistic cleanup keeps disk and memory usage under control.
        cleanup_expired_files()
        purge_stale_progress()

        # Get session ID from request (if provided) or generate a safe fallback.
        session_id = safe_session_id(request.form.get('session_id', str(uuid.uuid4())))
        
        # Build a deterministic temporary filename based on session ID + extension.
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        filename = f"{session_id}.{file_extension}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save uploaded file
        LOGGER.info('Saving uploaded file: %s', filename)
        file.save(filepath)
        LOGGER.info('File saved successfully: %s', filepath)
        
        # Route processing logic by media type while keeping response contracts stable.
        if is_video(filename):
            LOGGER.info('Processing video for session: %s', session_id)
            result = process_video(filepath, session_id)
            # Expose both inline-stream and forced-download URLs for frontend flexibility.
            base_video_url = f"{request.host_url.rstrip('/')}/api/download/{session_id}"
            result['result_video_url'] = base_video_url
            result['download_video_url'] = f"{base_video_url}?download=1"
            LOGGER.info('Video processing complete for session: %s', session_id)
        else:
            LOGGER.info('Processing image for session: %s', session_id)
            result = process_image(filepath, session_id)
            LOGGER.info('Image processing complete for session: %s', session_id)

        return jsonify(result)
    
    except Exception as e:
        # logger.exception prints stack trace with context for troubleshooting.
        LOGGER.exception('Error processing file: %s', e)
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500
    finally:
        # Uploaded source file is temporary and should be removed after processing.
        cleanup_file(filepath)

def process_image(image_path: str, unique_id: str) -> Dict[str, Any]:
    """Run object detection on a single image and return API-ready payload."""
    try:
        # Decode image using OpenCV fast-path, with Pillow fallback for extra formats.
        image_frame = decode_image_for_inference(image_path)

        # Run YOLO inference with shared, environment-tunable thresholds.
        results = model.predict(
            source=image_frame,
            conf=INFERENCE_CONF,
            iou=INFERENCE_IOU,
            imgsz=INFERENCE_IMAGE_SIZE,
            device=DEVICE,
            save=False
        )
        
        # Ultralytics returns a list; current API contract uses first inference result.
        result = results[0]
        
        # Draw boxes on image
        annotated_image = result.plot()
        
        # Save annotated image temporarily, then convert to base64 payload.
        output_path = os.path.join(app.config['RESULTS_FOLDER'], f"{unique_id}_result.jpg")
        cv2.imwrite(output_path, annotated_image)
        
        # Convert raw detections into JSON-friendly dictionaries.
        detections = []
        boxes = result.boxes
        
        for i in range(len(boxes)):
            box = boxes[i]
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            xyxy = box.xyxy[0].tolist()
            
            detections.append({
                'class': CLASS_NAMES.get(cls, f'Class {cls}'),
                'confidence': round(conf, 2),
                'bbox': {
                    'x1': round(xyxy[0], 2),
                    'y1': round(xyxy[1], 2),
                    'x2': round(xyxy[2], 2),
                    'y2': round(xyxy[3], 2)
                }
            })
        
        # Encode result image for immediate frontend rendering without a second request.
        result_image_base64 = encode_image_to_base64(output_path)
        # Remove temporary output once encoded in memory.
        cleanup_file(output_path)
        
        # Count detections by class
        detection_summary: Dict[str, int] = {}
        for det in detections:
            class_name = det['class']
            detection_summary[class_name] = detection_summary.get(class_name, 0) + 1
        
        return {
            'success': True,
            'type': 'image',
            'result_id': unique_id,
            'detections': detections,
            'detection_count': len(detections),
            'detection_summary': detection_summary,
            'result_image': f"data:image/jpeg;base64,{result_image_base64}"
        }
    
    except Exception as e:
        LOGGER.exception('Error in process_image: %s', e)
        raise

def process_video(video_path: str, unique_id: str) -> Dict[str, Any]:
    """Run frame-by-frame detection on video and persist an annotated MP4 output."""
    cap = None
    out = None
    
    try:
        # Create progress entry immediately so frontend polling can begin.
        progress_tracker[unique_id] = {
            'current': 0,
            'total': 0,
            'percentage': 0,
            'status': 'initializing',
            'updated_at': time.time()
        }
        
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise Exception("Failed to open video file")
        
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        progress_tracker[unique_id]['total'] = total_frames
        progress_tracker[unique_id]['status'] = 'processing'
        progress_tracker[unique_id]['updated_at'] = time.time()
        
        if width == 0 or height == 0 or fps == 0:
            raise Exception("Invalid video properties")
        
        output_path = os.path.join(app.config['RESULTS_FOLDER'], f"{unique_id}_result.mp4")
        
        # Try codecs in compatibility order. First successful writer is used.
        codecs_to_try = [
            ('avc1', 'H.264/AVC'), 
            ('H264', 'H.264'),      
            ('X264', 'x264'),      
            ('mp4v', 'MPEG-4'),      
        ]
        
        out = None
        
        for codec, codec_name in codecs_to_try:
            try:
                fourcc = cv2.VideoWriter_fourcc(*codec)
                temp_out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
                if temp_out.isOpened():
                    out = temp_out
                    LOGGER.info('Using %s codec for video encoding', codec_name)
                    break
                else:
                    temp_out.release()
            except Exception as codec_error:
                LOGGER.debug('Failed to initialize codec %s: %s', codec_name, codec_error)
        
        if out is None or not out.isOpened():
            raise Exception("Failed to create output video writer")
        
        frame_count = 0
        total_detections = 0
        detection_summary: Dict[str, int] = {}
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                # End-of-stream or decode failure; stop processing loop.
                break
            
            # Run detection per frame and write annotated frame to output video.
            results = model.predict(
                source=frame,
                conf=INFERENCE_CONF,
                iou=INFERENCE_IOU,
                imgsz=INFERENCE_IMAGE_SIZE,
                device=DEVICE,
                save=False,
                verbose=False
            )
            
            annotated_frame = results[0].plot()
            out.write(annotated_frame)
            
            boxes = results[0].boxes
            total_detections += len(boxes)
            
            for box in boxes:
                cls = int(box.cls[0])
                class_name = CLASS_NAMES.get(cls, f'Class {cls}')
                detection_summary[class_name] = detection_summary.get(class_name, 0) + 1
            
            frame_count += 1
            
            progress_tracker[unique_id]['current'] = frame_count
            progress_tracker[unique_id]['percentage'] = int((frame_count / total_frames) * 100)
            progress_tracker[unique_id]['updated_at'] = time.time()
            
            if frame_count % 30 == 0:
                LOGGER.info(
                    'Processed %s/%s frames (%s%%)...',
                    frame_count,
                    total_frames,
                    progress_tracker[unique_id]['percentage']
                )
        
        LOGGER.info('Video processing complete: %s frames processed', frame_count)
        progress_tracker[unique_id]['status'] = 'complete'
        progress_tracker[unique_id]['percentage'] = 100
        progress_tracker[unique_id]['updated_at'] = time.time()
        
        return {
            'success': True,
            'type': 'video',
            'result_id': unique_id,
            'frames_processed': frame_count,
            'total_detections': total_detections,
            'detection_summary': detection_summary
        }
    
    except Exception as e:
        LOGGER.exception('Error in process_video: %s', e)
        if unique_id in progress_tracker:
            # Preserve error details for frontend polling endpoint diagnostics.
            progress_tracker[unique_id]['status'] = 'error'
            progress_tracker[unique_id]['error'] = str(e)
            progress_tracker[unique_id]['updated_at'] = time.time()
        raise
    
    finally:
        # Always release media resources to avoid leaked handles and file locks.
        if cap is not None: cap.release()
        if out is not None: out.release()

@app.route('/api/download/<result_id>', methods=['GET'])
def download_result(result_id):
    """Return an annotated result video, optionally as a download attachment."""
    # Run periodic cleanup while serving download traffic.
    cleanup_expired_files()
    purge_stale_progress()
    safe_result_id = secure_filename(result_id)
    video_path = os.path.join(app.config['RESULTS_FOLDER'], f"{safe_result_id}_result.mp4")

    if not os.path.exists(video_path):
        return jsonify({'error': 'Video not found'}), 404

    force_download = request.args.get('download', 'false').lower() == 'true'

    response = send_file(
        video_path,
        mimetype='video/mp4',
        as_attachment=force_download,
        download_name=f"{safe_result_id}_result.mp4" if force_download else None,
        conditional=True
    )
    # Explicit byte range support improves playback seeking behavior.
    response.headers['Accept-Ranges'] = 'bytes'

    should_delete = request.args.get('keep', 'false').lower() != 'true' and DELETE_VIDEO_AFTER_DOWNLOAD
    if should_delete:
        # Delay deletion until transfer completes to avoid race conditions.
        response.call_on_close(lambda: cleanup_file(video_path))

    return response

@app.route('/api/progress/<session_id>', methods=['GET'])
def get_progress(session_id):
    """Return polling metadata for active or completed video processing."""
    # Keep progress map trimmed before serving poll requests.
    purge_stale_progress()
    if session_id in progress_tracker:
        progress_data = dict(progress_tracker[session_id])
        percentage = int(progress_data.get('percentage', 0) or 0)
        status = progress_data.get('status')

        # Adaptive polling cadence balances frontend responsiveness and server load.
        if status in {'not_found', 'initializing'}:
            poll_after_ms = 8000
        elif status == 'processing':
            if percentage < 15:
                poll_after_ms = 7000
            elif percentage < 90:
                poll_after_ms = 10000
            else:
                poll_after_ms = 5000
        else:
            poll_after_ms = 12000

        progress_data['poll_after_ms'] = poll_after_ms
        return jsonify(progress_data)
    else:
        return jsonify({
            'status': 'not_found',
            'percentage': 0,
            'poll_after_ms': 8000
        })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Return static model and validation details for frontend display."""
    return jsonify(MODEL_TECHNICAL_DETAILS)

def can_bind(host: str, port: int) -> bool:
    """Check if a host/port can be bound before starting Flask."""
    # Probe port availability before Flask starts so failures are explicit.
    test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    test_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        test_socket.bind((host, port))
        return True
    except OSError:
        return False
    finally:
        test_socket.close()

def resolve_server_binding() -> Tuple[str, int]:
    """Resolve a usable host while keeping a stable, configured port."""
    requested_host = (os.environ.get('FLASK_HOST') or '').strip()

    raw_port = (os.environ.get('PORT') or '5055').strip()
    try:
        base_port = int(raw_port)
    except ValueError:
        raise RuntimeError(
            f"Invalid PORT value '{raw_port}'. Please set PORT to a valid integer, e.g. 5055."
        )

    if requested_host:
        # Honor explicit host configuration first.
        hosts_to_try = [requested_host]
    elif os.name == 'nt':
        # On Windows, prefer localhost then all interfaces as fallback.
        hosts_to_try = ['127.0.0.1', '0.0.0.0']
    else:
        hosts_to_try = ['0.0.0.0']

    for host in hosts_to_try:
        if can_bind(host, base_port):
            return host, base_port

    raise RuntimeError(
        f"Unable to bind Flask server on port {base_port} using hosts {hosts_to_try}. "
        "Set PORT to an allowed port, then use the same backend URL in the frontend proxy or REACT_APP_API_URL."
    )

if __name__ == '__main__':
    # Debug mode is opt-in through environment to avoid accidental exposure.
    debug_enabled = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    selected_host, selected_port = resolve_server_binding()
    LOGGER.info('Starting server on http://%s:%s', selected_host, selected_port)
    app.run(debug=debug_enabled, host=selected_host, port=selected_port)