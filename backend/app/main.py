from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .db import engine, Base
from .routes import auth, analysis, models
from .ml.ml_engine import ml_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Events
    print("[SYSTEM] NEURAL_LAB_v2.1 API initiating environment...")
    
    # 1. Generate tables if they do not exist
    print("[SYSTEM] Validating database structures...")
    Base.metadata.create_all(bind=engine)
    print("[SYSTEM] Database tables successfully generated/validated.")

    # 2. Trigger loading/training of machine learning models
    print("[SYSTEM] Loading machine learning serialized engines...")
    ml_engine.load_models()
    print("[SYSTEM] Machine learning engines successfully validated.")
    
    yield
    # Shutdown Events
    print("[SYSTEM] Closing active resources...")

app = FastAPI(
    title="NEURAL_LAB_v2.1 | Food Intelligence API",
    description="Python FastAPI REST endpoints for elemental spectrometry scanning, machine learning, and food classification.",
    version="2.1.0",
    lifespan=lifespan
)

# Set up CORS middleware to support Next.js local frontend calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins in local dev (frontend is usually on localhost:3000)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Wire up routers with an /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(models.router, prefix="/api")

@app.get("/api/health")
def healthcheck():
    """
    Diagnostic diagnostic endpoint checking health of the scientific API context.
    """
    return {
        "status": "online",
        "system": "NEURAL_LAB_v2.1",
        "engine_version": "2.1.0-Pro",
        "ml_models_active": ml_engine.models_loaded,
        "active_models": list(ml_engine.metrics.keys()) if ml_engine.models_loaded else []
    }
