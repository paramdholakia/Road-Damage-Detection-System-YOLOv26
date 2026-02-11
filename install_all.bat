@echo off
echo ========================================
echo Road Damage Detection System
echo Full Installation Script
echo ========================================
echo.

echo [1/5] Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python 3.8+
    pause
    exit /b 1
)
echo.

echo [2/5] Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found! Please install Node.js 14+
    pause
    exit /b 1
)
echo.

echo [3/5] Installing Backend Dependencies...
cd backend
echo Creating Python virtual environment...
python -m venv venv
call venv\Scripts\activate
echo Upgrading pip...
python -m pip install --upgrade pip
echo Installing core packages...
pip install flask flask-cors werkzeug
echo Installing PyTorch...
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
echo Installing computer vision libraries...
pip install opencv-python pillow --only-binary :all:
echo Installing YOLO...
pip install ultralytics
echo Testing backend installation...
python -c "import flask; print('✓ Flask OK')"
python -c "import cv2; print('✓ OpenCV OK')"
python -c "import torch; print('✓ PyTorch OK')"
python -c "from ultralytics import YOLO; print('✓ YOLO OK')"
if errorlevel 1 (
    echo ERROR: Backend installation failed!
    pause
    exit /b 1
)
cd ..
echo.

echo [4/5] Installing Frontend Dependencies...
cd frontend
echo Installing Node.js packages...
call npm install
if errorlevel 1 (
    echo ERROR: Frontend installation failed!
    pause
    exit /b 1
)
cd ..
echo.

echo [5/5] Verifying Installation...
cd backend
call venv\Scripts\activate
python -c "from ultralytics import YOLO; m = YOLO('../model/best.pt'); print('✓ Model loaded successfully')"
cd ..
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Run: start.bat     (to start both servers)
echo.
echo Servers will run on:
echo   - Backend: http://localhost:5000
echo   - Frontend: http://localhost:3000
echo.
pause
