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
MODEL_PATH = '../model/best.pt'

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
    3: 'Other Corruption',
    4: 'Pothole'
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
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400
    
    try:
        # Generate unique filename
        unique_id = str(uuid.uuid4())
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        filename = f"{unique_id}.{file_extension}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save uploaded file
        file.save(filepath)
        
        # Process based on file type
        if is_video(filename):
            result = process_video(filepath, unique_id)
            result['result_video_url'] = f"{request.host_url.rstrip('/')}/api/download/{unique_id}"
        else:
            result = process_image(filepath, unique_id)
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500

def process_image(image_path, unique_id):
    """Process a single image"""
    # Run prediction
    results = model.predict(
        source=image_path,
        conf=0.25,  # Confidence threshold
        iou=0.45,   # NMS IoU threshold
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

def process_video(video_path, unique_id):
    """Process a video file"""
    # Open video
    cap = cv2.VideoCapture(video_path)
    
    # Get video properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Output video path
    output_path = os.path.join(app.config['RESULTS_FOLDER'], f"{unique_id}_result.mp4")
    
    # Video writer - using H.264 codec for browser compatibility
    fourcc = cv2.VideoWriter_fourcc(*'avc1')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    frame_count = 0
    total_detections = 0
    detection_summary = {}
    
    # Process video frame by frame
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        # Run prediction on frame
        results = model.predict(
            source=frame,
            conf=0.25,
            iou=0.45,
            save=False,
            verbose=False
        )
        
        # Get annotated frame
        annotated_frame = results[0].plot()
        
        # Write frame
        out.write(annotated_frame)
        
        # Count detections
        boxes = results[0].boxes
        total_detections += len(boxes)
        
        for box in boxes:
            cls = int(box.cls[0])
            class_name = CLASS_NAMES.get(cls, f'Class {cls}')
            detection_summary[class_name] = detection_summary.get(class_name, 0) + 1
        
        frame_count += 1
    
    # Release resources
    cap.release()
    out.release()
    
    return {
        'success': True,
        'type': 'video',
        'result_id': unique_id,
        'frames_processed': frame_count,
        'total_detections': total_detections,
        'detection_summary': detection_summary
    }

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

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get model statistics"""
    return jsonify({
        'model_name': 'YOLOv26n',
        'classes': CLASS_NAMES,
        'training_metrics': {
            'mAP50': 0.556,
            'mAP50-95': 0.300,
            'precision': 0.608,
            'recall': 0.524
        }
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
