# API Testing Guide

## Using cURL

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Upload Image for Detection
```bash
curl -X POST -F "file=@path/to/your/image.jpg" http://localhost:5000/api/predict
```

### Get Model Stats
```bash
curl http://localhost:5000/api/stats
```

---

## Using Python Requests

```python
import requests

# Health check
response = requests.get('http://localhost:5000/api/health')
print(response.json())

# Upload image
with open('test_image.jpg', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://localhost:5000/api/predict', files=files)
    print(response.json())

# Get stats
response = requests.get('http://localhost:5000/api/stats')
print(response.json())
```

---

## Using JavaScript/Fetch

```javascript
// Health check
fetch('http://localhost:5000/api/health')
  .then(res => res.json())
  .then(data => console.log(data));

// Upload image
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('http://localhost:5000/api/predict', {
  method: 'POST',
  body: formData
})
  .then(res => res.json())
  .then(data => console.log(data));
```

---

## Expected Responses

### Health Check Success
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

### Image Detection Success
```json
{
  "success": true,
  "type": "image",
  "result_id": "123e4567-e89b-12d3-a456-426614174000",
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
  "result_image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

### Video Detection Success
```json
{
  "success": true,
  "type": "video",
  "result_id": "123e4567-e89b-12d3-a456-426614174000",
  "frames_processed": 150,
  "total_detections": 45,
  "detection_summary": {
    "Longitudinal Crack": 20,
    "Transverse Crack": 15,
    "Pothole": 10
  },
  "result_video_url": "/api/download/123e4567-e89b-12d3-a456-426614174000"
}
```

### Error Response
```json
{
  "error": "No file provided"
}
```

---

## Status Codes

- `200`: Success
- `400`: Bad Request (missing file, invalid type, etc.)
- `404`: Not Found (for download endpoint)
- `500`: Server Error (processing failed)
