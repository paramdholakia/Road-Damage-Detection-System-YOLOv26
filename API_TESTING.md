# API Testing Guide

Base URL: `http://localhost:5000`

## 1) Health check

```bash
curl http://localhost:5000/api/health
```

Expected:

```json
{
  "status": "healthy",
  "model_loaded": true
}
```

## 2) Predict (image/video)

```bash
curl -X POST -F "file=@path/to/file.jpg" http://localhost:5000/api/predict
```

Image response shape:

```json
{
  "success": true,
  "type": "image",
  "result_id": "<uuid>",
  "detections": [
    {
      "class": "Pothole",
      "confidence": 0.85,
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

Video response shape:

```json
{
  "success": true,
  "type": "video",
  "result_id": "<uuid>",
  "frames_processed": 150,
  "total_detections": 45,
  "detection_summary": {
    "Longitudinal Crack": 20,
    "Transverse Crack": 15,
    "Pothole": 10
  },
  "result_video_url": "http://localhost:5000/api/download/<uuid>"
}
```

## 3) Progress

```bash
curl http://localhost:5000/api/progress/<session_id>
```

Expected shape:

```json
{
  "current": 75,
  "total": 150,
  "percentage": 50,
  "status": "processing"
}
```

## 4) Download processed video

```bash
curl -O http://localhost:5000/api/download/<result_id>
```

## 5) Model technical stats

```bash
curl http://localhost:5000/api/stats
```

Response includes:

- model name and framework versions
- architecture (layers, params, GFLOPs)
- dataset counts and class distribution
- training/inference configuration
- validation metrics (overall and per class)
- speed profile (preprocess/inference/postprocess)

## Python requests example

```python
import requests

base = "http://localhost:5000"

print(requests.get(f"{base}/api/health").json())
print(requests.get(f"{base}/api/stats").json())

with open("test_image.jpg", "rb") as file_obj:
    response = requests.post(f"{base}/api/predict", files={"file": file_obj})
    print(response.json())
```

## Status codes

- `200` success
- `400` invalid request / unsupported file
- `404` missing result file
- `500` server-side processing error
