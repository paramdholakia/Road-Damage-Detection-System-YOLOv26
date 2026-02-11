@echo off
echo ========================================
echo Road Damage Detection System - Startup
echo ========================================
echo.

echo [1/3] Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python 3.8+
    pause
    exit /b 1
)
echo.

echo [2/3] Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found! Please install Node.js 14+
    pause
    exit /b 1
)
echo.

echo [3/3] Activating Python Virtual Environment...
cd backend
if not exist venv (
    echo ERROR: Python venv not found!
    echo Please run: install_dependencies.bat first
    cd ..
    pause
    exit /b 1
)
call venv\Scripts\activate
cd ..
echo.

echo ========================================
echo Starting Servers...
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
