import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from pydantic import BaseModel, EmailStr
from typing import Optional, List

from .db import Base

# ==========================================
# SQLAlchemy Declarative Models
# ==========================================

class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="USER") # USER or ADMIN
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    samples = relationship("FoodSampleModel", back_populates="user")


class FoodSampleModel(Base):
    __tablename__ = "food_samples"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False) # e.g. Fruit, Grain, Meat, Vegetable, Dairy

    # Elemental percentages (features)
    c_pct = Column(Float, nullable=False)
    h_pct = Column(Float, nullable=False)
    o_pct = Column(Float, nullable=False)
    n_pct = Column(Float, nullable=False)
    p_pct = Column(Float, nullable=False)
    ca_pct = Column(Float, nullable=False)
    mg_pct = Column(Float, nullable=False)
    k_pct = Column(Float, nullable=False)
    na_pct = Column(Float, nullable=False)

    # Trace heavy metals in ppm
    trace_pb = Column(Float, nullable=False) # Lead
    trace_cd = Column(Float, nullable=False) # Cadmium
    trace_hg = Column(Float, nullable=False) # Mercury
    trace_as = Column(Float, nullable=False) # Arsenic

    # Nutritional Predictions (macronutrients / micronutrients)
    protein_pred = Column(Float, nullable=True)
    fat_pred = Column(Float, nullable=True)
    carbs_pred = Column(Float, nullable=True)
    minerals_pred = Column(Float, nullable=True)
    vitamins_pred = Column(Float, nullable=True)

    # Food Quality Classification
    quality_grade = Column(String, nullable=True) # Premium Quality, Standard Quality, Poor Quality
    quality_score = Column(Float, nullable=True) # 0-100
    quality_explanation = Column(Text, nullable=True)

    # Toxic Detection Results
    toxicity_grade = Column(String, nullable=True) # Safe, Contaminated, Danger
    toxicity_score = Column(Float, nullable=True) # Risk level scoring
    toxicity_report = Column(Text, nullable=True)

    confidence = Column(Float, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("UserModel", back_populates="samples")


class MLModelMetricModel(Base):
    __tablename__ = "ml_model_metrics"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, unique=True, index=True, nullable=False) # Decision Tree, Random Forest, SVM, Neural Network
    accuracy = Column(Float, nullable=False)
    precision = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1_score = Column(Float, nullable=False)
    latency_ms = Column(Float, nullable=False)
    training_time_s = Column(Float, nullable=False)
    active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

# ==========================================
# Pydantic Schemas (Validation / Serialization)
# ==========================================

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class FoodSampleInput(BaseModel):
    name: str
    category: str
    c_pct: float
    h_pct: float
    o_pct: float
    n_pct: float
    p_pct: float
    ca_pct: float
    mg_pct: float
    k_pct: float
    na_pct: float
    trace_pb: float
    trace_cd: float
    trace_hg: float
    trace_as: float

class FoodSampleResponse(BaseModel):
    id: int
    name: str
    category: str
    c_pct: float
    h_pct: float
    o_pct: float
    n_pct: float
    p_pct: float
    ca_pct: float
    mg_pct: float
    k_pct: float
    na_pct: float
    trace_pb: float
    trace_cd: float
    trace_hg: float
    trace_as: float
    protein_pred: float
    fat_pred: float
    carbs_pred: float
    minerals_pred: float
    vitamins_pred: float
    quality_grade: str
    quality_score: float
    quality_explanation: str
    toxicity_grade: str
    toxicity_score: float
    toxicity_report: str
    confidence: float
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class MLModelMetricsResponse(BaseModel):
    model_name: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    latency_ms: float
    training_time_s: float
    updated_at: datetime.datetime

    class Config:
        from_attributes = True
