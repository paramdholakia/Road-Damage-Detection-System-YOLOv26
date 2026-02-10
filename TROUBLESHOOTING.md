# 🔧 Troubleshooting Guide

## Backend Issues

### Issue: Pillow Build Error
**Error**: `error: subprocess-exited-with-error` when installing Pillow

**Solutions**:
1. **Install Microsoft C++ Build Tools** (Required for Windows):
   - Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Install "Desktop development with C++" workload
   - Restart your computer

2. **Use pre-built wheels**:
   ```powershell
   cd backend
   .\venv\Scripts\activate
   pip install --upgrade pip
   pip install pillow --only-binary :all:
   pip install -r requirements.txt
   ```

3. **Alternative**: Install dependencies one by one:
   ```powershell
   pip install flask flask-cors werkzeug
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
   pip install ultralytics
   ```

### Issue: NumPy Build Error
**Solution**: Install pre-compiled version:
```powershell
pip install numpy --only-binary :all:
```

### Issue: CUDA/GPU errors
**Solution**: Install CPU-only PyTorch:
```powershell
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

### Issue: Model file not found
**Error**: `Model not found` or `FileNotFoundError`

**Solution**: 
- Ensure `model/best.pt` exists
- Check the path in `backend/app.py` line 16:
  ```python
  MODEL_PATH = '../model/best.pt'  # Adjust if needed
  ```

---

## Frontend Issues

### Issue: Webpack Dev Server Error
**Error**: `options.allowedHosts[0] should be a non-empty string`

**Solution**: Already fixed with `.env` file. If issues persist:

1. **Clear cache and reinstall**:
   ```powershell
   cd frontend
   Remove-Item -Recurse -Force node_modules, package-lock.json
   npm install
   ```

2. **Update React Scripts**:
   ```powershell
   npm install react-scripts@latest
   ```

### Issue: npm vulnerabilities
**Warning**: `9 vulnerabilities (3 moderate, 6 high)`

**Solution**: 
```powershell
# Check what can be fixed
npm audit

# Fix automatically (may cause breaking changes)
npm audit fix

# Or fix with force (careful!)
npm audit fix --force
```

**Note**: These warnings are usually in dev dependencies and don't affect production.

### Issue: Port 3000 already in use
**Solution**:
```powershell
# Find and kill the process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## General Issues

### Issue: Python not found
**Solution**:
1. Install Python 3.8+ from https://www.python.org/downloads/
2. **Important**: Check "Add Python to PATH" during installation
3. Verify: `python --version`

### Issue: Node.js not found
**Solution**:
1. Install Node.js 14+ from https://nodejs.org/
2. Restart terminal after installation
3. Verify: `node --version` and `npm --version`

### Issue: Permission errors (Windows)
**Solution**: Run PowerShell as Administrator:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Issue: Git Bash on Windows
If using Git Bash instead of PowerShell:
```bash
cd backend
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
python app.py
```

---

## Quick Fixes

### Reset Everything
```powershell
# Backend
cd backend
Remove-Item -Recurse -Force venv, uploads, results
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ..\frontend
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

### Manual Installation (if batch fails)

**Terminal 1 - Backend**:
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install --upgrade pip
pip install flask flask-cors werkzeug opencv-python
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install ultralytics
python app.py
```

**Terminal 2 - Frontend**:
```powershell
cd frontend
npm install
npm start
```

---

## Testing Without Installing

### Test Backend Only
```powershell
cd backend
.\venv\Scripts\activate
python -c "from ultralytics import YOLO; print('YOLO works!')"
python -c "import cv2; print('OpenCV works!')"
```

### Test Model Loading
```powershell
cd backend
.\venv\Scripts\activate
python -c "from ultralytics import YOLO; model = YOLO('../model/best.pt'); print('Model loaded successfully!')"
```

---

## Still Having Issues?

1. **Check Python version**: Must be 3.8 - 3.11 (3.12+ may have compatibility issues)
   ```powershell
   python --version
   ```

2. **Check Node version**: Should be 14.x or higher
   ```powershell
   node --version
   ```

3. **Check disk space**: Need ~2GB for all dependencies

4. **Firewall/Antivirus**: May block local servers on ports 3000/5000

5. **Use virtual environment**: Always activate venv before running Python commands

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ModuleNotFoundError: No module named 'flask'` | venv not activated | Run `venv\Scripts\activate` |
| `Address already in use` | Port 5000/3000 busy | Kill process or change port |
| `CUDA out of memory` | GPU memory full | Use CPU mode or smaller batch |
| `npm ERR! code ENOENT` | npm not installed | Install Node.js |
| `'python' is not recognized` | Python not in PATH | Reinstall Python with PATH option |

---

## Contact Support

If none of these solutions work:
1. Note the exact error message
2. Check your Python version (`python --version`)
3. Check your Node version (`node --version`)
4. Check your OS and any special configurations
5. Review the main README.md for system requirements
