# 🛣️ Road Damage Detection System

A full-stack web application for detecting road damage using YOLOv26. Users can upload images or videos to detect and highlight various types of road damage including cracks, potholes, and other corruptions.

## 🎯 Features

- **Image Detection**: Upload road images to detect damage with bounding boxes
- **Video Processing**: Process entire videos frame-by-frame with damage detection
- **Real-time Results**: See detection results with confidence scores
- **Multiple Damage Types**: Detects 5 types of road damage:
  - Longitudinal Crack
  - Transverse Crack
  - Alligator Crack
  - Other Corruption
  - Pothole
- **Detailed Analytics**: View detection statistics and summaries
- **Modern UI**: Clean, responsive React interface

## 🏗️ Architecture

```
├── backend/          # Flask API server
│   ├── app.py       # Main Flask application
│   ├── requirements.txt
│   ├── uploads/     # Uploaded files (created automatically)
│   └── results/     # Processed results (created automatically)
├── frontend/        # React web application
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── model/           # YOLOv26 model files
│   ├── best.pt
│   └── last.pt
└── RDD.ipynb        # Model training notebook
```

## 📋 Prerequisites

### Backend Requirements
- Python 3.8 or higher
- CUDA-compatible GPU (optional, but recommended for faster processing)

### Frontend Requirements
- Node.js 14.x or higher
- npm 6.x or higher

## 🚀 Installation & Setup

### 1. Clone/Navigate to Repository

```bash
cd "D:\Coding\Royal\Internship Folder\Road Damage Detection System GITHUB"
```

### 2. Backend Setup

#### Step 1: Navigate to backend directory
```bash
cd backend
```

#### Step 2: Create virtual environment (recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

#### Step 3: Install Python dependencies
```bash
pip install -r requirements.txt
```

#### Step 4: Verify model path
Make sure the model file exists at: `../model/best.pt`

#### Step 5: Run the Flask server
```bash
python app.py
```

The backend server will start at: `http://localhost:5000`

### 3. Frontend Setup

#### Step 1: Open a new terminal and navigate to frontend directory
```bash
cd frontend
```

#### Step 2: Install Node.js dependencies
```bash
npm install
```

#### Step 3: Start the React development server
```bash
npm start
```

The frontend will start at: `http://localhost:3000`

## 🎮 Usage

1. **Open your browser** and go to `http://localhost:3000`

2. **Upload a file**:
   - Click "Choose File" button
   - Select an image (.jpg, .jpeg, .png) or video (.mp4, .avi, .mov)
   - Preview will be shown

3. **Detect damage**:
   - Click "Detect Damage" button
   - Wait for processing (videos may take longer)

4. **View results**:
   - For images: See annotated image with bounding boxes and detection details
   - For videos: Download the processed video with detections
   - View detection statistics and damage type breakdown

## 🔌 API Endpoints

### Health Check
```http
GET /api/health
```
Returns server health status and model status.

### Predict (Image/Video)
```http
POST /api/predict
Content-Type: multipart/form-data

Body: { file: <binary> }
```

**Response for Image:**
```json
{
  "success": true,
  "type": "image",
  "result_id": "uuid",
  "detections": [
    {
      "class": "Pothole",
      "confidence": 0.85,
      "bbox": { "x1": 100, "y1": 200, "x2": 300, "y2": 400 }
    }
  ],
  "detection_count": 5,
  "detection_summary": {
    "Pothole": 2,
    "Longitudinal Crack": 3
  },
  "result_image": "data:image/jpeg;base64,..."
}
```

**Response for Video:**
```json
{
  "success": true,
  "type": "video",
  "result_id": "uuid",
  "frames_processed": 120,
  "total_detections": 45,
  "detection_summary": {
    "Pothole": 15,
    "Longitudinal Crack": 30
  },
  "result_video_url": "/api/download/uuid"
}
```

### Download Video
```http
GET /api/download/<result_id>
```
Downloads processed video file.

### Model Statistics
```http
GET /api/stats
```
Returns model information and training metrics.

## 📊 Model Performance

- **Model**: YOLOv26n (nano version)
- **Training Dataset**: RDD-2022
- **Metrics**:
  - mAP@50: 55.6%
  - mAP@50-95: 30.0%
  - Precision: 60.8%
  - Recall: 52.4%

### Per-Class Performance:
| Class | Precision | Recall | mAP@50 |
|-------|-----------|--------|---------|
| Longitudinal Crack | 58.7% | 47.2% | 51.1% |
| Transverse Crack | 57.3% | 47.7% | 48.9% |
| Alligator Crack | 65.0% | 58.8% | 63.4% |
| Other Corruption | 62.9% | 72.5% | 73.2% |
| Pothole | 59.0% | 35.2% | 41.0% |

## 🛠️ Troubleshooting

### Backend Issues

**Issue**: "Model not found"
```bash
# Solution: Check if model file exists
ls ../model/best.pt
```

**Issue**: "CUDA out of memory"
```python
# Solution: In app.py, modify prediction to use CPU
results = model.predict(source=image_path, device='cpu')
```

**Issue**: Port 5000 already in use
```python
# Solution: Change port in app.py
app.run(debug=True, host='0.0.0.0', port=5001)
```

### Frontend Issues

**Issue**: "Cannot connect to backend"
```json
// Solution: Update proxy in package.json
"proxy": "http://localhost:5000"
```

**Issue**: CORS errors
```bash
# Solution: Ensure flask-cors is installed
pip install flask-cors
```

## 🔧 Configuration

### Adjust Detection Confidence
In `backend/app.py`, modify the confidence threshold:
```python
results = model.predict(
    source=image_path,
    conf=0.25,  # Change this value (0.0 - 1.0)
    iou=0.45
)
```

### Change Max Upload Size
In `backend/app.py`:
```python
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB
```

## 📁 Project Structure Details

### Backend Files
- `app.py`: Main Flask application with API routes
- `requirements.txt`: Python dependencies
- `uploads/`: Temporary storage for uploaded files
- `results/`: Storage for processed results

### Frontend Files
- `App.js`: Main React component with upload and display logic
- `App.css`: Styling for the application
- `package.json`: Node.js dependencies and scripts

## 🚀 Deployment

### Backend Deployment
For production, use a WSGI server like Gunicorn:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Frontend Deployment
Build the production version:
```bash
cd frontend
npm run build
```

Serve the `build/` folder with a static file server or integrate with the backend.

## 📝 Future Improvements

- [ ] Add user authentication
- [ ] Store processing history
- [ ] Real-time video streaming detection
- [ ] Batch processing for multiple files
- [ ] Export detection reports (PDF/CSV)
- [ ] Model performance monitoring
- [ ] Add more damage types
- [ ] Geolocation tagging
- [ ] Mobile app version

## 🤝 Contributing

This is your first trained model - congratulations! Feel free to:
- Improve the model by training with more data
- Enhance the UI/UX
- Add new features
- Optimize performance

## 📄 License

This project is for educational and research purposes.

## 🙏 Acknowledgments

- YOLOv26 by Ultralytics
- RDD-2022 Dataset
- React and Flask communities

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check console logs for errors

---

**Note**: This is a development setup. For production deployment, implement proper security measures, error handling, and scaling solutions.
