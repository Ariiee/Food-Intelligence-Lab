@echo off
REM ================================================================================
REM NEURAL_LAB_v2.1 | Unified Startup Script for Development & Demo
REM ================================================================================
REM This script automates the full startup sequence:
REM   1. Backend Python environment setup & ML model initialization
REM   2. FastAPI server (port 8000)
REM   3. Next.js frontend dev server (port 3000)
REM   4. Auto-opens browser to http://localhost:3000
REM ================================================================================

cls
echo.
echo ================================================================================
echo   NEURAL_LAB_v2.1 - AI Food Spectroscopy & Nutritional Intelligence Platform
echo ================================================================================
echo.
echo   Initializing integrated development environment...
echo.

REM Set working directory to script location
cd /d "%~dp0"

REM ================================================================================
REM BACKEND SETUP
REM ================================================================================
echo [STEP 1] Configuring Backend Environment
echo ─────────────────────────────────────────────────────────────────────────────

cd backend

REM Check if virtual environment exists
if not exist ".venv" (
    echo   [INFO] Creating Python virtual environment (.venv)...
    python -m venv .venv
    if errorlevel 1 (
        echo   [ERROR] Failed to create virtual environment. Ensure Python 3.9+ is installed.
        exit /b 1
    )
    echo   [OK] Virtual environment created.
) else (
    echo   [OK] Virtual environment already exists.
)

REM Activate virtual environment
echo   [INFO] Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo   [ERROR] Failed to activate virtual environment.
    exit /b 1
)
echo   [OK] Virtual environment activated.

REM Install Python dependencies
echo   [INFO] Installing dependencies from requirements.txt...
pip install -q -r requirements.txt --disable-pip-version-check
if errorlevel 1 (
    echo   [ERROR] Failed to install dependencies.
    exit /b 1
)
echo   [OK] Dependencies installed successfully.

REM Pre-train ML models if missing
echo   [INFO] Validating machine learning models...
python -c "import sys; sys.path.append('.'); from app.ml.ml_engine import ml_engine; ml_engine.load_models()" >nul 2>&1
if errorlevel 1 (
    echo   [INFO] Pre-training machine learning models (first-time setup, ~30 seconds)...
    python -c "import sys; sys.path.append('.'); from app.ml.ml_engine import ml_engine; ml_engine.train_and_evaluate()"
    if errorlevel 1 (
        echo   [WARN] ML model initialization had warnings but will continue in simulator mode.
    )
)
echo   [OK] Machine learning engines validated.

REM ================================================================================
REM START BACKEND SERVER
REM ================================================================================
echo.
echo [STEP 2] Starting FastAPI Backend Server
echo ─────────────────────────────────────────────────────────────────────────────

echo   [INFO] Launching FastAPI server on http://localhost:8000...
echo   [INFO] API documentation available at http://localhost:8000/docs
echo.

REM Start FastAPI server in a new terminal window
start "" cmd /k "cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
if errorlevel 1 (
    echo   [ERROR] Failed to start FastAPI server.
    exit /b 1
)

REM Give the backend a moment to start
timeout /t 3 /nobreak >nul

REM ================================================================================
REM FRONTEND SETUP & STARTUP
REM ================================================================================
echo [STEP 3] Configuring Frontend Environment
echo ─────────────────────────────────────────────────────────────────────────────

cd ..
cd frontend

echo   [INFO] Installing frontend dependencies (npm)...
call npm install --silent >nul 2>&1
if errorlevel 1 (
    echo   [WARN] npm install had issues. Frontend may still run.
)
echo   [OK] Frontend dependencies ready.

REM ================================================================================
REM START FRONTEND SERVER
REM ================================================================================
echo.
echo [STEP 4] Starting Next.js Frontend Dev Server
echo ─────────────────────────────────────────────────────────────────────────────

echo   [INFO] Launching Next.js development server (all network interfaces, port 3000)...
echo   [INFO] Open http://localhost:3000 on this PC (NOT http://0.0.0.0:3000)
echo   [INFO] For other devices: use the http://192.168.x.x URL printed in the frontend terminal
echo   [INFO] Hot-reload enabled for real-time development.
echo.

REM Start Next.js server in a new terminal window (0.0.0.0 so other devices on LAN can connect)
start "" cmd /k "cd frontend && npm run dev"
if errorlevel 1 (
    echo   [ERROR] Failed to start Next.js frontend server.
    exit /b 1
)

REM Give the frontend a moment to start
timeout /t 5 /nobreak >nul

REM ================================================================================
REM LAUNCH BROWSER
REM ================================================================================
echo [STEP 5] Launching Application in Default Browser
echo ─────────────────────────────────────────────────────────────────────────────

echo   [INFO] Opening http://localhost:3000 in your default browser...
start http://localhost:3000

REM ================================================================================
REM DONE
REM ================================================================================
echo.
echo ================================================================================
echo   SUCCESS! NEURAL_LAB_v2.1 is now running.
echo ================================================================================
echo.
echo   FRONTEND:
echo     URL: http://localhost:3000
echo     Status: Running in development mode with hot-reload
echo.
echo   BACKEND API:
echo     URL: http://localhost:8000
echo     Docs: http://localhost:8000/docs (Swagger UI)
echo.
echo   FEATURES:
echo     • 3D particle constellation background with mouse interaction
echo     • Real-time spectrometry analysis with 4 ML classifiers
echo     • Heavy metal toxicity detection & food grading
echo     • Batch CSV/Excel dataset processing
echo     • Historical scan archives with full audit trail
echo.
echo   KEYBOARD SHORTCUTS:
echo     • Press Ctrl+C in any terminal window to stop that service
echo     • Frontend will auto-reload on code changes
echo     • Backend will auto-reload on Python file changes
echo.
echo   COMMON ISSUES:
echo     • Port 3000/8000 already in use? Close other services or edit the ports.
echo     • Python not found? Install Python 3.9+ from python.org
echo     • npm not found? Install Node.js from nodejs.org
echo.
echo   For full documentation, see: README.md
echo.
echo ================================================================================

REM Prevent the main window from closing
cmd /k
