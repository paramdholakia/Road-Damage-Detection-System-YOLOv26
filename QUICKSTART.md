# Road Damage Detection System - Quick Start Guide

## 🚀 Quick Start (Windows)

### Option 1: Automated Installation (Recommended)

**Step 1**: Install backend dependencies
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
.\install_dependencies.bat
```

**Step 2**: Install frontend dependencies
```powershell
cd ..\frontend
npm install
```

**Step 3**: Start the servers

Terminal 1 - Backend:
```powershell
cd backend
.\venv\Scripts\activate
python app.py
```

Terminal 2 - Frontend:
```powershell
cd frontend
npm start
```

### Option 2: Manual Installation (If errors occur)

**Backend:**
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

**Frontend:**
```powershell
cd frontend
npm install
npm start
```

---

## ⚠️ Common Issues

### Backend: Pillow Build Error
If you see `error: subprocess-exited-with-error` for Pillow:

**Quick Fix:**
```powershell
pip install pillow --only-binary :all:
```

**Or install Microsoft C++ Build Tools**: https://visualstudio.microsoft.com/visual-cpp-build-tools/

### Frontend: Webpack Dev Server Error
Already fixed with `.env` file. If issues persist:
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
npm install
```

**See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more solutions!**

---

## 🚀 Quick Start (Linux/Mac)

### 1. Install Backend Dependencies
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 3. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### 4. Access the Application
Open your browser and go to: `http://localhost:3000`

---

## ✅ Verification Steps

1. **Backend Running**: You should see "Model loaded successfully!" and server running on port 5000
2. **Frontend Running**: Browser should automatically open to `http://localhost:3000`
3. **Test**: Try uploading a road image to verify the system works

---

## 🐛 Common Issues

**Issue**: Python not found
- **Solution**: Install Python from python.org

**Issue**: npm not found
- **Solution**: Install Node.js from nodejs.org

**Issue**: Model file not found
- **Solution**: Ensure `model/best.pt` exists in the project directory

**Issue**: Port already in use
- **Solution**: Close other applications using ports 3000 or 5000

---

## 📦 What's Included

✅ Flask backend with YOLO integration  
✅ React frontend with modern UI  
✅ Image detection support  
✅ Video processing support  
✅ Real-time results display  
✅ Detection statistics  

---

## 🎯 Next Steps

After getting the app running:
1. Upload test images/videos
2. Review detection results
3. Iterate on your model training (check RDD.ipynb)
4. Customize the UI to your liking
5. Deploy to production when ready

---

**Need help?** Check the main README.md for detailed documentation!
