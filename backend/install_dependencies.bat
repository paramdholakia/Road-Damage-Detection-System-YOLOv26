@echo off
echo ========================================
echo Backend Installation Script
echo ========================================
echo.

echo [1/6] Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python 3.8+
    pause
    exit /b 1
)
echo.

echo [2/6] Creating Python virtual environment...
if not exist venv (
    python -m venv venv
) else (
    echo venv already exists, skipping creation...
)
echo.

echo [3/6] Activating virtual environment...
call venv\Scripts\activate
echo.

echo [4/6] Upgrading pip...
python -m pip install --upgrade pip
echo.

echo [5/6] Installing dependencies...
echo Installing core packages...
pip install flask flask-cors werkzeug
echo Installing PyTorch...
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
echo Installing computer vision libraries...
pip install opencv-python pillow --only-binary :all:
echo Installing YOLO...
pip install ultralytics
echo.

echo [6/6] Verifying installation...
python -c "import flask; print('✓ Flask OK')"
python -c "import cv2; print('✓ OpenCV OK')"
python -c "import torch; print('✓ PyTorch OK')"
python -c "from ultralytics import YOLO; print('✓ YOLO OK')"
if errorlevel 1 (
    echo ERROR: Installation verification failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Backend dependencies installed successfully!
echo You can now run: cd .. && start.bat
echo.
pause
