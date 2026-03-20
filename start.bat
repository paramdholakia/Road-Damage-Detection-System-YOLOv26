@echo off
echo ========================================
echo RoadLens - Startup
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

echo [3/3] Activating Python Virtual Environment (GPU)...
cd backend
if not exist venv_gpu (
    echo ERROR: Python venv_gpu not found!
    echo Please create it with: py -3.10 -m venv venv_gpu
    echo Then install GPU dependencies with: venv_gpu\Scripts\activate ^&^& pip install -r requirements.txt
    cd ..
    pause
    exit /b 1
)
call venv_gpu\Scripts\activate
cd ..
echo.

echo ========================================
echo Starting Servers...
echo ========================================
echo.

start "RoadLens - Backend (GPU)" cmd /k "cd backend && venv_gpu\Scripts\activate && set FLASK_HOST=127.0.0.1 && set PORT=5055 && python app.py"
timeout /t 3 /nobreak > nul
start "RoadLens - Frontend" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo Servers are starting...
echo.
echo Backend will run on: http://localhost:5055
echo Frontend will run on: http://localhost:3000
echo.
echo The browser should open automatically.
echo If not, manually open: http://localhost:3000
echo ========================================
echo.
echo Press any key to exit this window...
pause > nul
