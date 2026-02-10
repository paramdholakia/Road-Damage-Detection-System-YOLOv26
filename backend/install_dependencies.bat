@echo off
echo ========================================
echo Backend Installation Script
echo ========================================
echo.

echo [1/5] Upgrading pip...
python -m pip install --upgrade pip
echo.

echo [2/5] Installing core dependencies...
pip install flask flask-cors werkzeug
echo.

echo [3/5] Installing PyTorch (this may take a while)...
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
echo.

echo [4/5] Installing computer vision libraries...
pip install opencv-python pillow --only-binary :all:
echo.

echo [5/5] Installing YOLO...
pip install ultralytics
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Testing installation...
python -c "import flask; print('✓ Flask OK')"
python -c "import cv2; print('✓ OpenCV OK')"
python -c "import torch; print('✓ PyTorch OK')"
python -c "from ultralytics import YOLO; print('✓ YOLO OK')"
echo.
echo All dependencies installed successfully!
echo You can now run: python app.py
echo.
pause
