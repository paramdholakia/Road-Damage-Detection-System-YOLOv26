@echo off
echo ========================================
echo Road Damage Detection System - Startup
echo ========================================
echo.

echo [1/4] Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python 3.8+
    pause
    exit /b 1
)
echo.

echo [2/4] Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found! Please install Node.js 14+
    pause
    exit /b 1
)
echo.

echo [3/4] Setting up Backend...
cd backend
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing Python dependencies...
pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies!
    pause
    exit /b 1
)
cd ..
echo.

echo [4/4] Setting up Frontend...
cd frontend
if not exist node_modules (
    echo Installing Node.js dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install Node.js dependencies!
        pause
        exit /b 1
    )
)
cd ..
echo.

echo ========================================
echo Setup Complete! Starting Servers...
echo ========================================
echo.

start "Road Damage Detection - Backend" cmd /k "cd backend && venv\Scripts\activate && python app.py"
timeout /t 3 /nobreak > nul
start "Road Damage Detection - Frontend" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo Servers are starting...
echo.
echo Backend will run on: http://localhost:5000
echo Frontend will run on: http://localhost:3000
echo.
echo The browser should open automatically.
echo If not, manually open: http://localhost:3000
echo ========================================
echo.
echo Press any key to exit this window...
pause > nul
