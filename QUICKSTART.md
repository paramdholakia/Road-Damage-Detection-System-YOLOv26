# Quick Start

## 1) Backend setup (Windows)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 2) Frontend setup

```powershell
cd frontend
npm install
```

## 3) Start the app

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

Open `http://localhost:3000`.

---

## Quick Technical Snapshot

- Model: YOLO26m Road Damage Detector (`backend/models/best.pt`)
- Framework: Ultralytics 8.4.19
- Architecture: 132 layers, 20,353,307 params, 67.9 GFLOPs
- Classes: Longitudinal Crack, Transverse Crack, Alligator Crack, Other, Pothole
- Validation: P=0.654, R=0.557, mAP50=0.601, mAP50-95=0.313
- Inference speed: 0.7ms preprocess, 41.0ms inference, 0.1ms postprocess per image

---

## Quick API checks

```powershell
curl http://localhost:5000/api/health
curl http://localhost:5000/api/stats
```

For complete request/response examples, see `API_TESTING.md`.
