Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "NEURAL_LAB_v2.1 | BACKEND ENVIRONMENT SETUP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Create Python Virtual Environment
if (-not (Test-Path ".venv")) {
    Write-Host "[SYSTEM] Creating virtual environment (.venv)..." -ForegroundColor Yellow
    python -m venv .venv
} else {
    Write-Host "[SYSTEM] Virtual environment (.venv) already exists." -ForegroundColor Green
}

# 2. Activate Virtual Environment and Install Dependencies
Write-Host "[SYSTEM] Installing dependencies from requirements.txt..." -ForegroundColor Yellow
& ".\.venv\Scripts\pip" install -r requirements.txt

# 3. Pre-train Machine Learning Models
Write-Host "[SYSTEM] Commencing pre-training for ML models (Decision Tree, Random Forest, SVM, MLP)..." -ForegroundColor Yellow
& ".\.venv\Scripts\python" -c "import sys; sys.path.append('.'); from app.ml.ml_engine import ml_engine; ml_engine.train_and_evaluate()"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "BACKEND ENVIRONMENT SUCCESSFULLY CONFIGURED" -ForegroundColor Green
Write-Host "Run '.\.venv\Scripts\uvicorn app.main:app --reload' to start." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
