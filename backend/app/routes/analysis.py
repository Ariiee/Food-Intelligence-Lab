import io
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..db import get_db
from ..models import UserModel, FoodSampleModel, FoodSampleInput, FoodSampleResponse
from .auth import get_current_user, get_current_user_optional
from ..ml.ml_engine import ml_engine

router = APIRouter(prefix="/analysis", tags=["AI Food Analysis"])

@router.post("/scan", response_model=FoodSampleResponse)
def scan_single_sample(
    sample_in: FoodSampleInput,
    model_name: str = "Random Forest",
    db: Session = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_current_user_optional)
):
    try:
        # Check that percentages are between 0 and 100
        for key, val in sample_in.dict().items():
            if key.endswith("_pct") and (val < 0.0 or val > 100.0):
                raise HTTPException(status_code=400, detail=f"Percentage value for {key} must be between 0 and 100.")
                
        # Trigger ML engine prediction
        pred = ml_engine.predict(sample_in.dict(), model_name=model_name)

        user_id = current_user.id if current_user else None
        
        # Save to database
        db_sample = FoodSampleModel(
            name=sample_in.name,
            category=sample_in.category,
            c_pct=sample_in.c_pct,
            h_pct=sample_in.h_pct,
            o_pct=sample_in.o_pct,
            n_pct=sample_in.n_pct,
            p_pct=sample_in.p_pct,
            ca_pct=sample_in.ca_pct,
            mg_pct=sample_in.mg_pct,
            k_pct=sample_in.k_pct,
            na_pct=sample_in.na_pct,
            trace_pb=sample_in.trace_pb,
            trace_cd=sample_in.trace_cd,
            trace_hg=sample_in.trace_hg,
            trace_as=sample_in.trace_as,
            protein_pred=pred["protein_pred"],
            fat_pred=pred["fat_pred"],
            carbs_pred=pred["carbs_pred"],
            minerals_pred=pred["minerals_pred"],
            vitamins_pred=pred["vitamins_pred"],
            quality_grade=pred["quality_grade"],
            quality_score=pred["quality_score"],
            quality_explanation=pred["quality_explanation"],
            toxicity_grade=pred["toxicity_grade"],
            toxicity_score=pred["toxicity_score"],
            toxicity_report=pred["toxicity_report"],
            confidence=pred["confidence"],
            user_id=user_id
        )
        db.add(db_sample)
        db.commit()
        db.refresh(db_sample)
        return db_sample
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error executing scan: {str(e)}")

@router.post("/upload")
def upload_dataset(
    file: UploadFile = File(...),
    model_name: str = Form("Random Forest"),
    db: Session = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_current_user_optional)
):
    try:
        contents = file.file.read()
        filename = file.filename.lower()

        # Parse file based on extension
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV or Excel.")

        # Required columns for model features
        required_cols = [
            "name", "category", "c_pct", "h_pct", "o_pct", "n_pct", "p_pct", "ca_pct", "mg_pct", "k_pct", "na_pct",
            "trace_pb", "trace_cd", "trace_hg", "trace_as"
        ]
        
        # Strip whitespaces and lowercase to ensure flexible matching
        df.columns = [col.strip().lower() for col in df.columns]
        
        # Check missing columns
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(
                status_code=400,
                detail=f"Uploaded dataset is missing required column headers: {', '.join(missing_cols)}"
            )

        user_id = current_user.id if current_user else None
        results = []
        batch_objects = []

        for idx, row in df.iterrows():
            features = {
                "category": str(row["category"]),
                "c_pct": float(row["c_pct"]),
                "h_pct": float(row["h_pct"]),
                "o_pct": float(row["o_pct"]),
                "n_pct": float(row["n_pct"]),
                "p_pct": float(row["p_pct"]),
                "ca_pct": float(row["ca_pct"]),
                "mg_pct": float(row["mg_pct"]),
                "k_pct": float(row["k_pct"]),
                "na_pct": float(row["na_pct"]),
                "trace_pb": float(row["trace_pb"]),
                "trace_cd": float(row["trace_cd"]),
                "trace_hg": float(row["trace_hg"]),
                "trace_as": float(row["trace_as"])
            }
            
            # Predict
            pred = ml_engine.predict(features, model_name=model_name)

            db_sample = FoodSampleModel(
                name=str(row["name"]),
                category=features["category"],
                c_pct=features["c_pct"],
                h_pct=features["h_pct"],
                o_pct=features["o_pct"],
                n_pct=features["n_pct"],
                p_pct=features["p_pct"],
                ca_pct=features["ca_pct"],
                mg_pct=features["mg_pct"],
                k_pct=features["k_pct"],
                na_pct=features["na_pct"],
                trace_pb=features["trace_pb"],
                trace_cd=features["trace_cd"],
                trace_hg=features["trace_hg"],
                trace_as=features["trace_as"],
                protein_pred=pred["protein_pred"],
                fat_pred=pred["fat_pred"],
                carbs_pred=pred["carbs_pred"],
                minerals_pred=pred["minerals_pred"],
                vitamins_pred=pred["vitamins_pred"],
                quality_grade=pred["quality_grade"],
                quality_score=pred["quality_score"],
                quality_explanation=pred["quality_explanation"],
                toxicity_grade=pred["toxicity_grade"],
                toxicity_score=pred["toxicity_score"],
                toxicity_report=pred["toxicity_report"],
                confidence=pred["confidence"],
                user_id=user_id
            )
            batch_objects.append(db_sample)
            results.append({
                "name": str(row["name"]),
                "protein": pred["protein_pred"],
                "fat": pred["fat_pred"],
                "carbs": pred["carbs_pred"],
                "quality_grade": pred["quality_grade"],
                "toxicity_grade": pred["toxicity_grade"],
                "confidence": pred["confidence"]
            })

        # Commit batch to DB
        db.add_all(batch_objects)
        db.commit()

        # Compute summary stats
        summary_stats = {
            "total_records": len(results),
            "premium_count": sum(1 for r in results if r["quality_grade"] == "Premium Quality"),
            "standard_count": sum(1 for r in results if r["quality_grade"] == "Standard Quality"),
            "poor_count": sum(1 for r in results if r["quality_grade"] == "Poor Quality"),
            "safe_count": sum(1 for r in results if r["toxicity_grade"] == "Safe"),
            "danger_count": sum(1 for r in results if r["toxicity_grade"] in ("Contaminated", "Danger")),
            "avg_confidence": float(pd.Series([r["confidence"] for r in results]).mean())
        }

        return {
            "filename": file.filename,
            "summary": summary_stats,
            "records": results[:50] # return top 50 records as visual confirmation
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error parsing dataset upload: {str(e)}")

@router.get("/history", response_model=List[FoodSampleResponse])
def get_scan_history(
    category: Optional[str] = None,
    quality_grade: Optional[str] = None,
    toxicity_grade: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_current_user_optional)
):
    query = db.query(FoodSampleModel)
    
    if current_user:
        query = query.filter(FoodSampleModel.user_id == current_user.id)
    
    if category:
        query = query.filter(FoodSampleModel.category == category)
    if quality_grade:
        query = query.filter(FoodSampleModel.quality_grade == quality_grade)
    if toxicity_grade:
        query = query.filter(FoodSampleModel.toxicity_grade == toxicity_grade)

    return query.order_by(FoodSampleModel.created_at.desc()).limit(limit).all()

@router.delete("/clear")
def clear_scan_history(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    try:
        db.query(FoodSampleModel).filter(FoodSampleModel.user_id == current_user.id).delete()
        db.commit()
        return {"status": "success", "message": "Scan history cleared."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error clearing history: {str(e)}")
