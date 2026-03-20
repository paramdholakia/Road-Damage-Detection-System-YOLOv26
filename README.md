# RoadLens

**Road Damage Detection System** - A full-stack ML application for detecting and classifying road damage in images and videos using YOLO26m with **GPU acceleration (NVIDIA CUDA)**.

![Python](https://img.shields.io/badge/Python-3.10-blue) ![PyTorch](https://img.shields.io/badge/PyTorch-CUDA-brightgreen) ![React](https://img.shields.io/badge/React-18.2-61dafb) ![Flask](https://img.shields.io/badge/Flask-3.0-lightgrey)

## Quick Links

- [Features](#features)
- [GPU Setup](#gpu-acceleration)
- [Installation](#installation-gpu)
- [Usage](#usage)
- [API Documentation](#api-endpoints)
- [Architecture](#system-architecture)
- [Performance](#performance)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Features

### Detection Capabilities

Detects 5 road damage classes:
- **Longitudinal Crack** - Cracks parallel to road direction
- **Transverse Crack** - Cracks perpendicular to road direction
- **Alligator Crack** - Interconnected, map-like cracking pattern
- **Pothole** - Surface depressions and holes
- **Other** - Miscellaneous pavement damage

### Core Functionality

- Image Detection - Single image inference with annotated output
- Video Detection - Frame-by-frame processing with progress tracking
- GPU Acceleration - NVIDIA CUDA with automatic fallback to CPU
- Real-time Progress - Track video processing status
- Base64 Image Response - Direct embedding in UI (images)
- Streaming Download - Byte-range support for video downloads
- Auto File Cleanup - Configurable retention and auto-deletion
- CORS Support - Production-ready cross-origin configuration
- Model Statistics - Full technical details endpoint
- Health Monitoring - GPU device info and service status

---

## GPU Acceleration

This project is optimized for **NVIDIA GPU inference** using CUDA. GPU acceleration provides **5-7x faster inference** compared to CPU-only execution.

### Supported GPUs
- GTX 1650 (tested & verified)
- RTX 2060/2070/2080 series
- RTX 3060/3070/3080/4090 series
- Any NVIDIA GPU with compute capability 3.5+

### Requirements
- NVIDIA GPU Driver (latest)
- CUDA Toolkit 11.8+ or 12.1+
- cuDNN (auto-included with PyTorch CUDA build)
- Python 3.10

### Quick GPU Verification

```bash
# Check if CUDA is available and your GPU is detected
python -c "import torch; print('CUDA Available:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0))"
```

Expected output for GTX 1650:
```
CUDA Available: True
GPU: NVIDIA GeForce GTX 1650
```

---

## Installation (GPU)

### Step 1: Create GPU-Optimized Virtual Environment

```bash
cd backend
py -3.10 -m venv venv_gpu
venv_gpu\Scripts\activate
```

### Step 2: Verify CUDA Availability

```bash
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
```

### Step 3: Install GPU Dependencies

For **CUDA 11.8**:
```bash
pip install --upgrade pip
pip install -r requirements.txt --index-url https://download.pytorch.org/whl/cu118
```

For **CUDA 12.1**:
```bash
pip install --upgrade pip
pip install -r requirements.txt --index-url https://download.pytorch.org/whl/cu121
```

### Step 4: Verify Installation

```bash
python -c "from ultralytics import YOLO; model = YOLO('models/best.pt'); print('✓ Model Loaded')"
```

### Step 5: Frontend Setup

```bash
cd frontend
npm install
```

### One-Command Setup (Windows)

If you prefer automation (updates `venv_gpu`):
```bash
.\install_all.bat
```

---

## Usage

### Start Both Services

```bash
.\start.bat
```

This will:
1. Activate `venv_gpu` environment
2. Launch backend on **`http://127.0.0.1:5055`**
3. Launch frontend on **`http://localhost:3000`**
4. Use **GPU (cuda:0)** for all inference

### Manual Backend Start

```bash
cd backend
venv_gpu\Scripts\activate
set FLASK_HOST=127.0.0.1
set PORT=5055
python app.py
```

Initial startup output will show:
```
✓ GPU Available: NVIDIA GeForce GTX 1650
  CUDA Version: 11.8
  Device: cuda:0

Loading YOLO model...
Model loaded successfully!

Using device: cuda:0

Starting server on http://127.0.0.1:5055
```

### Manual Frontend Start

```bash
cd frontend
npm start
```

Open browser: **`http://localhost:3000`**

### Monitor GPU During Processing

While processing images/videos, check GPU usage in **another terminal**:

```bash
nvidia-smi -l 1
```

Expected output during inference:
- `python.exe` using 2-4 GB VRAM
- `GPU-Util` showing 80-100%
- Processing speed: 45-70ms per frame

---

## API Endpoints

All endpoints return JSON. Base URL: `http://127.0.0.1:5055`

### `GET /api/health`
Health check with device info.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "cuda:0",
  "gpu_name": "NVIDIA GeForce GTX 1650",
  "cuda_available": true,
  "cuda_version": "11.8",
  "max_upload_mb": 200,
  "file_retention_minutes": 60
}
```

### `POST /api/predict`
Upload image or video for detection.

**Request:**
```bash
curl -X POST -F "file=@image.jpg" http://127.0.0.1:5055/api/predict
```

**Image Response:**
```json
{
  "success": true,
  "type": "image",
  "result_id": "a1b2c3d4-e5f6-...",
  "detections": [
    {
      "class": "Pothole",
      "confidence": 0.87,
      "bbox": {
        "x1": 245.5,
        "y1": 180.2,
        "x2": 456.8,
        "y2": 320.9
      }
    }
  ],
  "detection_count": 3,
  "detection_summary": {
    "Pothole": 1,
    "Longitudinal Crack": 2
  },
  "result_image": "data:image/jpeg;base64,..."
}
```

**Video Response:**
```json
{
  "success": true,
  "type": "video",
  "result_id": "a1b2c3d4-e5f6-...",
  "frames_processed": 150,
  "total_detections": 45,
  "detection_summary": {
    "Longitudinal Crack": 20,
    "Transverse Crack": 15,
    "Pothole": 10
  },
  "result_video_url": "http://127.0.0.1:5055/api/download/a1b2c3d4-e5f6-...",
  "download_video_url": "http://127.0.0.1:5055/api/download/a1b2c3d4-e5f6-...?download=1"
}
```

### `GET /api/progress/<session_id>`
Check video processing progress.

**Response:**
```json
{
  "current": 75,
  "total": 150,
  "percentage": 50,
  "status": "processing",
  "updated_at": 1710950000.123,
  "poll_after_ms": 10000
}
```

**Status values:** `initializing`, `processing`, `complete`, `error`, `not_found`

### `GET /api/download/<result_id>`
Stream or download processed video.

**Query Parameters:**
- `download=1` - Force download (default: stream)
- `keep=true` - Keep file after download (default: delete)

```bash
# Stream (play in browser)
curl http://127.0.0.1:5055/api/download/a1b2c3d4-e5f6-...

# Download as file
curl http://127.0.0.1:5055/api/download/a1b2c3d4-e5f6-...?download=1
```

### `GET /api/stats`
Get full model technical profile.

**Response includes:**
- Framework/version
- Architecture details (layers, parameters, GFLOPs)
- Dataset distribution
- Validation metrics (precision, recall, mAP)
- Per-class performance
- Inference speed breakdown

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│           React Frontend (Port 3000)             │
│  - Upload UI (drag & drop)                      │
│  - Real-time progress tracking                  │
│  - Results visualization                        │
│  - Class distribution charts (Recharts)         │
│  - Model statistics dashboard                   │
└──────────────────┬──────────────────────────────┘
                   │ (HTTP/CORS)
                   │
┌──────────────────▼──────────────────────────────┐
│        Flask Backend (Port 5055)                 │
│  - File handling (images/videos)                │
│  - YOLO model inference (GPU-accelerated)       │
│  - Progress tracking system                     │
│  - Auto file cleanup                            │
│  - Result serving                               │
└──────────────────┬──────────────────────────────┘
                   │
       ┌───────────┴──────────────┐
       │                          │
       ▼                          ▼
 ┌──────────────┐        ┌──────────────┐
 │ GPU Memory   │        │ Storage      │
 │ (VRAM)       │        │ (tmpdir)     │
 │ Model: 44MB  │        │ /uploads/    │
 │ Inference    │        │ /results/    │
 └──────────────┘        └──────────────┘
```

### Key Components

| Component | Role | Technology |
|-----------|------|-----------|
| **Frontend** | Upload, visualization, progress UI | React 18, Axios, Recharts |
| **Backend** | Inference & API serving | Flask 3.0+ |
| **Model** | Detection & classification | YOLO26m (Ultralytics 8.4.19) |
| **GPU Runtime** | Computation acceleration | PyTorch + CUDA 11.8/12.1 |
| **Storage** | Temp file handling | Memory + Disk (auto-cleanup) |

### Data Flow

1. **Image Upload** → Flask receives → GPU inference → Return annotated base64 image
2. **Video Upload** → Flask queues → Process frame-by-frame on GPU → Return progress & download URL
3. **Progress Check** → Frontend polls `/api/progress` → Adaptive polling interval

---

## Project Structure

```text
RoadLens/
├── backend/                          # Flask backend
│   ├── app.py                       # Main Flask app (GPU detection & inference)
│   ├── requirements.txt             # Python dependencies
│   ├── models/
│   │   └── best.pt                 # YOLO26m model (44.2 MB)
│   ├── uploads/                     # Temp input files (auto-cleaned)
│   ├── results/                     # Temp result files (auto-cleaned)
│   ├── venv_gpu/                    # GPU virtual environment (Python 3.10)
│   └── install_dependencies.bat     # Dependency installer
│
├── frontend/                         # React frontend
│   ├── package.json                # Dependencies (React, Axios, Recharts)
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js                  # Main component
│   │   ├── App.css
│   │   ├── index.js
│   │   ├── index.css
│   │   ├── pages/                  # Route pages
│   │   └── styles/                 # Component styles
│   └── build/                       # Production build output
│
├── README.md                        # This file (project overview)
├── GPU_SETUP.md                     # GPU setup & troubleshooting guide
├── QUICKSTART.md                    # Fast setup instructions
├── API_TESTING.md                   # API endpoint examples
├── TROUBLESHOOTING.md               # Common issues & solutions
├── start.bat                        # Run both services (Windows)
├── install_all.bat                  # Install all dependencies (Windows)
└── render.yaml                      # Cloud deployment config (Render)
```

---

## Performance

### Model Details

| Property | Value |
|----------|-------|
| **Model Name** | RoadLens YOLO26m Detector |
| **Framework** | Ultralytics 8.4.19 |
| **Architecture** | YOLO26m (fused) |
| **Layers** | 132 |
| **Parameters** | 20,353,307 (20.3M) |
| **Compute** | 67.9 GFLOPs |
| **Checkpoint Size** | 44.2 MB |
| **Input Resolution** | 1280×1280 |
| **Training Epochs** | 100 |

### Validation Metrics

**Overall Performance:**

| Metric | Value |
|--------|-------|
| Precision | 0.654 |
| Recall | 0.557 |
| mAP@50 | 0.601 |
| mAP@50:95 | 0.313 |

**Per-Class Breakdown:**

| Class | Precision | Recall | mAP@50 | mAP@50:95 |
|-------|:---------:|:------:|:------:|:----------:|
| Longitudinal Crack | 0.640 | 0.553 | 0.595 | 0.322 |
| Transverse Crack | 0.634 | 0.512 | 0.554 | 0.257 |
| Alligator Crack | 0.664 | 0.584 | 0.629 | 0.316 |
| Other | 0.701 | 0.724 | 0.756 | 0.462 |
| Pothole | 0.632 | 0.413 | 0.471 | 0.211 |

**Dataset:**
- Validation images: 5,758
- Total instances: 9,740
- Distributed across 5 damage classes

### Inference Speed

**Per Image (Single 1280×1280 input):**

| Stage | GPU Time | CPU Time |
|-------|----------|----------|
| Preprocess | 0.7 ms | 0.7 ms |
| Inference | 41.0 ms | 250-400 ms |
| Postprocess | 0.1 ms | 0.1 ms |
| **Total** | **41.8 ms** | **251+ ms** |

**Speed Improvement:** GPU is **5-7x faster** than CPU

**Throughput:**
- GPU: ~24 images/sec (1280×1280)
- Video at 30 FPS: Full real-time processing on GPU, ~3-4x slower on CPU

---

## Deployment

### Local Deployment (Recommended for GPU)

Best for leveraging local NVIDIA GPU hardware.

```bash
# 1. Setup GPU environment (one-time)
cd backend
py -3.10 -m venv venv_gpu
venv_gpu\Scripts\activate
pip install -r requirements.txt --index-url https://download.pytorch.org/whl/cu118

# 2. Build frontend
cd ../frontend
npm install
npm run build

# 3. Start services
# Option A: Both at once
..\..\start.bat

# Option B: Separate terminals
# Terminal 1 - Backend
cd backend
venv_gpu\Scripts\activate
python app.py

# Terminal 2 - Frontend
cd frontend
npm start
```

**Access:** `http://localhost:3000`

### Cloud Deployment (Render) - CPU Only

For cloud deployment with **Render.com** (GPU unavailable on standard tiers).

#### 1. Prepare Repository

Ensure `.gitignore` preserves model:
```
# Allow model checkpoint
!backend/models/best.pt
```

Push to GitHub:
```bash
git add -A
git commit -m "Ready for Render deployment"
git push
```

#### 2. Create Render Blueprint

1. Visit [Render.com](https://render.com)
2. Click **New +** → **Blueprint**
3. Select your GitHub repository
4. Render will auto-create:
   - `roadlens-backend` (Python web service)
   - `roadlens-frontend` (Static site)

#### 3. Configure Frontend Service

Set environment variable on `roadlens-frontend`:

```
REACT_APP_API_URL=https://roadlens-backend-xxx.onrender.com
```

Redeploy frontend to apply the build-time variable.

#### 4. Configure Backend Service (Optional)

Customize on `roadlens-backend` if needed:

| Variable | Default | Purpose |
|----------|---------|---------|
| `MAX_UPLOAD_MB` | 200 | Max file size in MB |
| `FILE_RETENTION_MINUTES` | 60 | Auto-cleanup after (min) |
| `DELETE_VIDEO_AFTER_DOWNLOAD` | true | Remove video post-download |
| `ALLOWED_ORIGINS` | * | CORS origins (comma-separated) |

Example:
```
ALLOWED_ORIGINS=https://yourfrontend.com,https://yourdomain.com
MAX_UPLOAD_MB=100
```

#### 5. Storage Notes

- Cache dir: `/tmp/roadlens/`
- Images stored temporarily & removed after response
- Videos removed after download (unless `keep=true`)
- Render doesn't persist `/tmp/`, so files auto-clear on service restart

**Important:** GPU is **not available** on free/standard Render tiers. Consider:
- **Render GPU Tiers** (Enterprise)
- **AWS/Azure GPU instances**
- **Lambda + GPU** (AWS)
- **Local execution** (recommended)

---

## Troubleshooting

### GPU Not Detected

**Symptom:** `"device": "cpu"` in health endpoint

**Fix:**
```bash
# Check NVIDIA drivers
nvidia-smi

# Verify CUDA detection
python -c "import torch; print(torch.cuda.is_available())"

# If False, reinstall PyTorch with CUDA
pip uninstall torch torchvision
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### CUDA Out of Memory

**Symptom:** `RuntimeError: CUDA out of memory`

**Solutions:**
- Free GPU memory: Close other GPU-using apps
- Add to backend launch:
  ```bash
  set PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
  python app.py
  ```
- Use smaller model (if available)

### High Inference Time

**Expected:**
- GPU: 41-70 ms per 1280×1280 image
- CPU: 250-400 ms per image

**If slower than expected:**
- Verify GPU is active: `nvidia-smi -l 1`
- Check Task Manager → Performance → GPU (CUDA, not 3D)
- Close background apps consuming GPU

### Video Processing Stuck

**Check progress:**
```bash
curl http://127.0.0.1:5055/api/progress/<session_id>
```

**If hung:**
- Backend logs show frame count
- Try smaller video file
- Check disk space in `backend/results/`

### Port Already in Use

**Backend (5055):**
```bash
netstat -ano | findstr :5055
taskkill /PID <PID> /F
```

**Frontend (3000):**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Or set alternative port:
```bash
set PORT=5056
python app.py
```

### Frontend Cannot Reach Backend

**Verify backend is running:**
```bash
curl http://127.0.0.1:5055/api/health
```

**If frontend on different machine:**
- Update CORS: Set `ALLOWED_ORIGINS` env var
- Update frontend API URL in `env` or build config

---

## Frontend Features

### Upload & Detection

- **Drag-and-drop** interface for images/videos
- **File type validation** (jpg, png, mp4, avi, mov)
- **Real-time progress tracking** with progress bar
- **Annotated image display** with bounding boxes
- **Confidence scores** per detection

### Results Display

- **Annotated images** (base64 embedded)
- **Video streaming/download** with byte-range support
- **Detection summary** - count by class
- **Box coordinates** for each detection

### Dashboard

- **Model statistics** - Architecture, dataset, metrics
- **Class performance** - Per-class precision/recall
- **Speed benchmarks** - ms/image breakdown
- **System health** - GPU status, device info

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 18.2 |
| **UI State** | React Hooks | - |
| **HTTP Client** | Axios | 1.6.5 |
| **Visualization** | Recharts | 3.7.0 |
| **Routing** | React Router | 7.13 |
| **Icons** | React Icons | 5.5 |
| **Dropzone** | react-dropzone | 14.4 |
| **Scroll** | Locomotive Scroll | 5.0.1 |
| **Backend** | Flask | 3.0+ |
| **ML Framework** | Ultralytics | 8.4.19 |
| **DL Framework** | PyTorch | 2.0+ (CUDA) |
| **Computer Vision** | OpenCV | 4.8+ |
| **GPU Support** | NVIDIA CUDA | 11.8+ / 12.1+ |
| **Build** | React Scripts | 5.0.1 |

---

## Environment Variables

### Backend

```bash
# Server
FLASK_HOST=127.0.0.1          # Bind address
PORT=5055                      # Server port
FLASK_DEBUG=false              # Debug mode

# Storage
STORAGE_ROOT=/tmp/roadlens    # Root storage directory
MODEL_PATH=./models/best.pt   # Model checkpoint path

# File Management
MAX_UPLOAD_MB=200             # Max upload size (MB)
FILE_RETENTION_MINUTES=60     # Auto-cleanup after (min)
DELETE_VIDEO_AFTER_DOWNLOAD=true # Delete video post-download

# CORS
ALLOWED_ORIGINS=*             # Comma-separated origins

# GPU (Auto-detected, no explicit config needed)
PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512  # Memory fragmentation fix (optional)
```

### Frontend

```bash
REACT_APP_API_URL=http://127.0.0.1:5055  # Backend URL
REACT_APP_ENV=development                 # Environment
```

---

## Documentation Files

| File | Purpose |
|------|---------|
| **README.md** | Project overview & setup (this file) |
| **GPU_SETUP.md** | Detailed GPU configuration guide |
| **QUICKSTART.md** | Fast 5-minute setup |
| **API_TESTING.md** | API endpoint examples & curl commands |
| **TROUBLESHOOTING.md** | Common issues & solutions |
| **render.yaml** | Cloud deployment config (Render.com) |

---

## Quick Commands Reference

```bash
# Setup (One-time)
cd backend
py -3.10 -m venv venv_gpu
venv_gpu\Scripts\activate
pip install -r requirements.txt --index-url https://download.pytorch.org/whl/cu118

# Verify GPU
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"

# Start services
.\start.bat                                # Both at once (recommended)

# Manual start
cd backend && venv_gpu\Scripts\activate && python app.py  # Terminal 1
cd frontend && npm start                                  # Terminal 2

# Monitor GPU
nvidia-smi -l 1

# Test API
curl http://127.0.0.1:5055/api/health          # Check health
curl http://127.0.0.1:5055/api/stats           # Model stats
curl -X POST -F "file=@test.jpg" \
  http://127.0.0.1:5055/api/predict             # Test detection

# Kill port (if stuck)
netstat -ano | findstr :5055                   # Find process
taskkill /PID <PID> /F                         # Kill it

# Clean cache (optional)
rmdir /s /q backend\.*pycache*
rmdir /s /q backend\uploads\*
rmdir /s /q backend\results\*
```

---

## Performance Tips

### Maximize GPU Throughput

1. **Batch video files** - Process multiple smaller videos sequentially
2. **Monitor memory** - Keep 2-4 GB available for model + inference
3. **Close GPU-using apps** - Web browsers (CUDA), Nvidia apps, other ML tools
4. **Disable debug logging** - Set `FLASK_DEBUG=false`

### Optimize Inference

- **Pre-resize inputs** - 1280×1280 is optimal
- **Avoid very large images** - May thrash GPU memory
- **Re-use video frames** - Frame rate naturally limits throughput

### Monitor Resource Usage

```bash
# Real-time GPU stats
nvidia-smi -l 1

# CPU/RAM
wmic path win32_perfformatteddata_perf_processor get \
  name,PercentProcessorTime /format:csv

# Disk I/O
wmic path Win32_PerfFormattedData_PerfDisk_PhysicalDisk get \
  name,DiskReadBytesPersec,DiskWriteBytesPersec
```

---

## Development

### Backend Development

```bash
# Create new feature branch
git checkout -b feature/my-feature

# Test changes
cd backend
venv_gpu\Scripts\activate
python app.py

# Run tests (if added)
pytest tests/
```

### Frontend Development

```bash
cd frontend
npm start                    # Development server w/ hot reload

# Build for production
npm run build               # Creates /build/ directory

# Test build locally
npm install -g serve
serve -s build -l 3000
```

### Adding New Detection Features

1. **Update model** - Retrain YOLO26m with new data
2. **Replace** `backend/models/best.pt`
3. **Update CLASS_NAMES** in `app.py`
4. **Update MODEL_TECHNICAL_DETAILS** in `app.py`
5. **Test** with `/api/stats` and `/api/predict`

---

## License

[Add your license here - e.g., MIT, Apache 2.0, etc.]

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/improvement`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push to branch (`git push origin feature/improvement`)
5. Open Pull Request

---

## Support

### Issues

- **Check existing issues** before opening new ones
- **Provide error logs** and OS/hardware info
- **GPU issues?** Run `nvidia-smi` and attach output

### Resources

- [Ultralytics YOLO Docs](https://docs.ultralytics.com/)
- [PyTorch CUDA Installation](https://pytorch.org/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
- [Render.com Docs](https://render.com/docs)

---

## Changelog

### v2.0.0 - GPU Optimization (Current)
- GPU acceleration (CUDA 11.8/12.1)
- Automatic device detection
- GPU status in `/api/health`
- Updated venv_gpu setup
- Comprehensive documentation

### v1.0.0 - Initial Release
- YOLO26m model integration
- Image/video detection
- React frontend UI
- API endpoints
- Progress tracking

---

**Last Updated:** March 2026  
**Maintained by:** RoadLens Development Team
