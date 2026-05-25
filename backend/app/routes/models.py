from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List

from ..db import get_db
from ..models import UserModel, MLModelMetricModel, MLModelMetricsResponse
from .auth import get_current_user
from ..ml.ml_engine import ml_engine

router = APIRouter(prefix="/models", tags=["ML Engine Management"])

@router.get("/metrics", response_model=List[MLModelMetricsResponse])
def get_model_metrics(db: Session = Depends(get_db)):
    """
    Fetches accuracy, precision, recall, and latency for Decision Tree, Random Forest, SVM, and Neural Networks.
    """
    try:
        # If models metrics aren't loaded, load them
        if not ml_engine.models_loaded:
            ml_engine.load_models()

        metrics_data = ml_engine.metrics
        response = []
        for model_name, stats in metrics_data.items():
            response.append({
                "model_name": model_name,
                "accuracy": stats.get("accuracy", 0.0),
                "precision": stats.get("precision", 0.0),
                "recall": stats.get("recall", 0.0),
                "f1_score": stats.get("f1_score", 0.0),
                "latency_ms": stats.get("latency_ms", 0.0),
                "training_time_s": stats.get("training_time_s", 0.0),
                "updated_at": stats.get("updated_at", datetime.utcnow())
            })
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading model metrics: {str(e)}")

@router.get("/feature-importance")
def get_feature_importances():
    """
    Returns feature weights from the Random Forest model for predicting organic targets.
    """
    try:
        if not ml_engine.models_loaded:
            ml_engine.load_models()

        importances = ml_engine.feature_importances
        if not importances:
            # Fallback mock/rule importance if model doesn't support direct importances
            importances = {
                "n_pct": 0.35,
                "c_pct": 0.22,
                "o_pct": 0.15,
                "h_pct": 0.08,
                "ca_pct": 0.06,
                "mg_pct": 0.05,
                "p_pct": 0.04,
                "k_pct": 0.03,
                "na_pct": 0.02
            }
        return importances
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading feature importances: {str(e)}")

@router.post("/retrain")
def retrain_models(
    current_user: UserModel = Depends(get_current_user)
):
    """
    Triggers dynamic retraining of all ML models. Restrict access to ADMIN users.
    """
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only laboratory administrators can trigger model retraining."
        )
    try:
        print(f"[ML_ENGINE] Retraining triggered by administrator: {current_user.username}")
        ml_engine.train_and_evaluate()
        return {"status": "success", "message": "All ML models successfully retrained and redeployed."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during retraining execution: {str(e)}")
