# RoadLens

RoadLens is a full-stack road damage detection application with a Flask backend and React frontend. It performs object detection on images and videos using a trained Ultralytics YOLO26 model and returns annotated outputs with structured detection statistics.

## Table of Contents

- [Overview](#overview)
- [Model Technical Profile](#model-technical-profile)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Deploy on Render](#deploy-on-render)
- [API Endpoints](#api-endpoints)
- [Performance Summary](#performance-summary)
- [Troubleshooting](#troubleshooting)

## Overview

### Detected Classes

1. Longitudinal Crack
2. Transverse Crack
3. Alligator Crack
4. Other
5. Pothole

### Core Capabilities

- Image inference with annotated output and confidence scores
- Video inference with frame-by-frame detection
- Progress tracking for long-running video jobs
- Download endpoint for processed videos
- Model stats endpoint exposing technical details

## Model Technical Profile

### Model Identity

- Model name: **RoadLens YOLO26m Detector**
- Framework: **Ultralytics 8.4.19**
- Task: **Object detection**
- Checkpoint: `backend/models/best.pt`
- Checkpoint size (optimizer stripped): **44.2 MB**

### Architecture

- Summary name: **YOLO26m (fused)**
- Layers: **132**
- Parameters: **20,353,307**
- Compute: **67.9 GFLOPs**

### Dataset (Validation)

- Images: **5,758**
- Instances: **9,740**
- Instances/class:
  - Longitudinal Crack: 3,890
  - Transverse Crack: 1,769
  - Alligator Crack: 1,553
  - Other: 1,563
  - Pothole: 965

### Training / Inference Configuration

- Trained epochs: **100**
- Inference image size: **1280**
- Inference thresholds: `conf=0.25`, `iou=0.45`
- Training hardware reference: Tesla T4 (14913 MiB), Python 3.12.12, Torch 2.9.0+cu126

## System Architecture

- **Frontend**: React application for upload, visualization, and stats
- **Backend**: Flask API for model loading, inference, progress tracking, and result serving
- **Model**: Ultralytics YOLO checkpoint loaded once at server startup
- **Storage**:
  - `backend/uploads/` for temporary inputs
  - `backend/results/` for annotated outputs

## Project Structure

```text
RoadLens/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── models/
│   │   └── best.pt
│   ├── uploads/
│   └── results/
├── frontend/
│   ├── package.json
│   ├── public/
│   └── src/
├── API_TESTING.md
├── QUICKSTART.md
├── TROUBLESHOOTING.md
├── RDD.ipynb
├── install_all.bat
└── start.bat
```

## Installation

### Backend (Windows PowerShell)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Frontend

```powershell
cd frontend
npm install
```

### One-step scripts (Windows)

```powershell
.\install_all.bat
.\start.bat
```

## Usage

### Run manually

Terminal 1 (backend):

```powershell
cd backend
.\venv\Scripts\activate
python app.py
```

Terminal 2 (frontend):

```powershell
cd frontend
npm start
```

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000`

## Deploy on Render

This repository now includes a Render Blueprint: `render.yaml`.

### 1) Create services from Blueprint

1. Push this repo to GitHub.
2. In Render, choose **New +** → **Blueprint**.
3. Select the repo. Render will create:
  - `roadlens-backend` (Python web service)
  - `roadlens-frontend` (Static web service)

### Important: include model in Git

- Keep `backend/models/best.pt` committed to the repository so Render can load the model at build/runtime.
- Current `.gitignore` is configured to include this specific file while still ignoring other temporary/runtime files.
- If your checkpoint exceeds GitHub's file size limits, use Git LFS before deploying.

### 2) Set frontend backend URL

In Render dashboard, set on `roadlens-frontend`:

- `REACT_APP_API_URL=https://<your-backend-service>.onrender.com`

Then redeploy `roadlens-frontend` so build-time env is applied.

### 3) Backend resource-control env vars

Set on `roadlens-backend` (defaults are already in `render.yaml`):

- `MAX_UPLOAD_MB` (default `200`)
- `FILE_RETENTION_MINUTES` (default `60`)
- `DELETE_VIDEO_AFTER_DOWNLOAD` (default `true`)
- `ALLOWED_ORIGINS` (comma-separated origins, or `*`)

### Cloud storage behavior (resource-safe)

- Uploaded files are stored in `/tmp/roadlens/uploads` and auto-cleaned.
- Image output files are removed immediately after response encoding.
- Old upload/result files are purged by retention policy.
- Video files are deleted after download by default.
- Keep a processed video after download by calling:
  - `GET /api/download/<result_id>?keep=true`

## API Endpoints

### `GET /api/health`

Returns service health and model load status.

### `POST /api/predict`

Multipart form upload:
- `file` (required): image/video
- `session_id` (optional): custom ID for progress/result tracking

Returns:
- image response with `result_image` (base64)
- video response with `result_video_url`

### `GET /api/progress/<session_id>`

Returns current processing progress for video jobs.

### `GET /api/download/<result_id>`

Streams processed video output with byte-range support.

### `GET /api/stats`

Returns full technical model profile, including:
- framework/version
- architecture details
- dataset distribution
- validation metrics (overall and per class)
- inference speed profile

## Performance Summary

### Final Validation Metrics (best.pt)

- Precision: **0.654**
- Recall: **0.557**
- mAP@50: **0.601**
- mAP@50:95: **0.313**
- Fitness: **0.3135**

### Per-Class Metrics

| Class | Precision | Recall | mAP@50 | mAP@50:95 |
|---|---:|---:|---:|---:|
| Longitudinal Crack | 0.640 | 0.553 | 0.595 | 0.322 |
| Transverse Crack | 0.634 | 0.512 | 0.554 | 0.257 |
| Alligator Crack | 0.664 | 0.584 | 0.629 | 0.316 |
| Other | 0.701 | 0.724 | 0.756 | 0.462 |
| Pothole | 0.632 | 0.413 | 0.471 | 0.211 |

### Speed (ms/image)

- Preprocess: **0.7 ms**
- Inference: **41.0 ms**
- Postprocess: **0.1 ms**

## Troubleshooting

See:
- `QUICKSTART.md` for setup and run instructions
- `API_TESTING.md` for endpoint-level testing examples
- `TROUBLESHOOTING.md` for common errors and fixes

---

For API examples and expected JSON responses, use `API_TESTING.md`.
