# Troubleshooting

## Backend

### Model file not found

Error examples:
- `FileNotFoundError`
- model load fails at startup

Checks:
1. Confirm checkpoint exists at `backend/models/best.pt`
2. Start backend from `backend/` directory
3. Verify `MODEL_PATH` in `backend/app.py` points to `models/best.pt`

Quick test:

```powershell
cd backend
.\venv\Scripts\activate
python -c "from ultralytics import YOLO; YOLO('models/best.pt'); print('Model loaded')"
```

### Dependency issues

```powershell
cd backend
.\venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

If Pillow fails on Windows:

```powershell
pip install pillow --only-binary :all:
```

### CUDA / GPU issues

Use CPU fallback by installing CPU Torch build if needed:

```powershell
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

### Port 5000 already in use

```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

## Frontend

### `npm` install/start failures

```powershell
cd frontend
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
npm start
```

### Port 3000 already in use

```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## API validation checklist

1. `GET /api/health` returns `model_loaded: true`
2. `GET /api/stats` returns model technical profile JSON
3. `POST /api/predict` works for at least one image
4. Video jobs show progress through `GET /api/progress/<session_id>`

## Typical fixes

- Always activate virtual environment before running backend commands
- Run backend from the `backend/` folder
- Keep model path and file naming unchanged unless you update code accordingly
- Verify Node.js and Python are available in PATH
