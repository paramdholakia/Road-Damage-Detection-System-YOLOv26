from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import cv2
import numpy as np
from ultralytics import YOLO
import base64
from pathlib import Path
import uuid

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'mp4', 'avi', 'mov'}
# Use os.path.join so it works on both Windows and Linux servers
MODEL_PATH = os.path.join('models', 'best.pt')

# Progress tracking dictionary
progress_tracker = {}

# Create necessary folders
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['RESULTS_FOLDER'] = RESULTS_FOLDER
app.config['MAX_CONTENT_LENGTH'] = None  # No file size limit for testing

# Load YOLO model
print("Loading YOLO model...")
model = YOLO(MODEL_PATH)
print("Model loaded successfully!")

# Class names from your training
CLASS_NAMES = {
    0: 'Longitudinal Crack',
    1: 'Transverse Crack',
    2: 'Alligator Crack',
    3: 'Other',               # Cleaned up from "Other Corruption"
    4: 'Pothole'
}

MODEL_TECHNICAL_DETAILS = {
    'model_name': 'YOLO26m Road Damage Detector',
    'framework': {
        'library': 'Ultralytics',
        'version': '8.4.19',
        'task': 'detect',
        'checkpoint_path': MODEL_PATH,
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

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_video(filename):
    return filename.rsplit('.', 1)[1].lower() in {'mp4', 'avi', 'mov'}

def encode_image_to_base64(image_path):
    """Encode image to base64 string"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    """Handle image/video upload and perform detection"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Get session ID from request or generate one
        session_id = request.form.get('session_id', str(uuid.uuid4()))
        
        # Generate unique filename
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        filename = f"{session_id}.{file_extension}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save uploaded file
        print(f"Saving file: {filename}")
        file.save(filepath)
        print(f"File saved successfully: {filepath}")
        
        # Process based on file type
        if is_video(filename):
            print("Processing video...")
            result = process_video(filepath, session_id)
            result['result_video_url'] = f"{request.host_url.rstrip('/')}/api/download/{session_id}"
            print("Video processing complete")
        else:
            print("Processing image...")
            result = process_image(filepath, session_id)
            print("Image processing complete")
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500

def process_image(image_path, unique_id):
    """Process a single image"""
    try:
        # Run prediction
        results = model.predict(
            source=image_path,
            conf=0.25,  
            iou=0.45,   
            imgsz=1280, # CRITICAL: Maintain your high-resolution training standard
            save=False
        )
        
        # Get the result
        result = results[0]
        
        # Draw boxes on image
        annotated_image = result.plot()
        
        # Save annotated image
        output_path = os.path.join(app.config['RESULTS_FOLDER'], f"{unique_id}_result.jpg")
        cv2.imwrite(output_path, annotated_image)
        
        # Extract detection information
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
        
        # Encode result image to base64
        result_image_base64 = encode_image_to_base64(output_path)
        
        # Count detections by class
        detection_summary = {}
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
        print(f"Error in process_image: {str(e)}")
        raise

def process_video(video_path, unique_id):
    """Process a video file"""
    cap = None
    out = None
    
    try:
        progress_tracker[unique_id] = {
            'current': 0,
            'total': 0,
            'percentage': 0,
            'status': 'initializing'
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
        
        if width == 0 or height == 0 or fps == 0:
            raise Exception("Invalid video properties")
        
        output_path = os.path.join(app.config['RESULTS_FOLDER'], f"{unique_id}_result.mp4")
        
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
                    print(f"Using {codec_name} codec for video encoding")
                    break
                else:
                    temp_out.release()
            except:
                pass
        
        if out is None or not out.isOpened():
            raise Exception("Failed to create output video writer")
        
        frame_count = 0
        total_detections = 0
        detection_summary = {}
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Run prediction on frame
            results = model.predict(
                source=frame,
                conf=0.25,
                iou=0.45,
                imgsz=1280, # CRITICAL: Ensure video frames use high-res inference
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
            
            if frame_count % 30 == 0:
                print(f"Processed {frame_count}/{total_frames} frames ({progress_tracker[unique_id]['percentage']}%)...")
        
        print(f"Video processing complete: {frame_count} frames processed")
        progress_tracker[unique_id]['status'] = 'complete'
        progress_tracker[unique_id]['percentage'] = 100
        
        return {
            'success': True,
            'type': 'video',
            'result_id': unique_id,
            'frames_processed': frame_count,
            'total_detections': total_detections,
            'detection_summary': detection_summary
        }
    
    except Exception as e:
        print(f"Error in process_video: {str(e)}")
        if unique_id in progress_tracker:
            progress_tracker[unique_id]['status'] = 'error'
            progress_tracker[unique_id]['error'] = str(e)
        raise
    
    finally:
        if cap is not None: cap.release()
        if out is not None: out.release()

@app.route('/api/download/<result_id>', methods=['GET'])
def download_result(result_id):
    """Stream result video"""
    video_path = os.path.join(app.config['RESULTS_FOLDER'], f"{result_id}_result.mp4")

    if not os.path.exists(video_path):
        return jsonify({'error': 'Video not found'}), 404

    response = send_file(
        video_path,
        mimetype='video/mp4',
        as_attachment=False,
        conditional=True
    )
    response.headers['Accept-Ranges'] = 'bytes'
    return response

@app.route('/api/progress/<session_id>', methods=['GET'])
def get_progress(session_id):
    """Get processing progress for a session"""
    if session_id in progress_tracker:
        return jsonify(progress_tracker[session_id])
    else:
        return jsonify({
            'status': 'not_found',
            'percentage': 0
        })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get model statistics"""
    return jsonify(MODEL_TECHNICAL_DETAILS)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)