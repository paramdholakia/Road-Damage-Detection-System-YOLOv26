@echo off
echo ========================================
echo Frontend Installation Script
echo ========================================
echo.

echo [1/2] Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found! Please install Node.js 14+
    pause
    exit /b 1
)
echo.

echo [2/2] Installing Node.js dependencies...
cd frontend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install Node.js dependencies!
    pause
    exit /b 1
)
cd ..
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Frontend dependencies installed successfully!
echo You can now run: start.bat
echo.
pause
