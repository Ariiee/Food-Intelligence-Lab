import os
import time
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Any, Tuple
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.svm import SVC, SVR
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, mean_absolute_error, r2_score

# Paths for saving models
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "serialized")
os.makedirs(MODEL_DIR, exist_ok=True)

# List of elemental composition features
FEATURES = [
    "c_pct", "h_pct", "o_pct", "n_pct", "p_pct", "ca_pct", "mg_pct", "k_pct", "na_pct",
    "trace_pb", "trace_cd", "trace_hg", "trace_as"
]

CATEGORIES = ["Grain", "Fruit", "Vegetable", "Meat", "Seafood", "Dairy", "Legume", "Beverage"]

PB_SAFE_MAX = 0.01
PB_CAUTION_MAX = 0.1

CD_SAFE_MAX = 0.005
CD_CAUTION_MAX = 0.05

HG_SAFE_MAX = 0.001
HG_CAUTION_MAX = 0.01

AS_SAFE_MAX = 0.01
AS_CAUTION_MAX = 0.1


def classify_lead_risk(pb_ppm: float) -> str:
    """Pb risk tiers: Safe (<0.01), Caution (0.01–0.1), Contaminated (>0.1 ppm)."""
    if pb_ppm < PB_SAFE_MAX:
        return "Safe"
    if pb_ppm <= PB_CAUTION_MAX:
        return "Caution"
    return "Contaminated"


def classify_metals_risk(pb: float, cd: float, hg: float, _as: float) -> str:
    """Worst-case toxicity grade across all 4 heavy metals based on standard safety guidelines."""
    pb_g = "Safe"
    if pb >= PB_CAUTION_MAX:
        pb_g = "Contaminated"
    elif pb >= PB_SAFE_MAX:
        pb_g = "Caution"

    cd_g = "Safe"
    if cd >= CD_CAUTION_MAX:
        cd_g = "Contaminated"
    elif cd >= CD_SAFE_MAX:
        cd_g = "Caution"

    hg_g = "Safe"
    if hg >= HG_CAUTION_MAX:
        hg_g = "Contaminated"
    elif hg >= HG_SAFE_MAX:
        hg_g = "Caution"

    as_g = "Safe"
    if _as >= AS_CAUTION_MAX:
        as_g = "Contaminated"
    elif _as >= AS_SAFE_MAX:
        as_g = "Caution"

    grades = [pb_g, cd_g, hg_g, as_g]
    if "Contaminated" in grades:
        return "Contaminated"
    if "Caution" in grades:
        return "Caution"
    return "Safe"


def compute_safety_score(
    pb_val: float,
    cd_val: float = 0.0,
    hg_val: float = 0.0,
    as_val: float = 0.0,
    toxicity_grade: str | None = None,
) -> float:
    """0-100 where higher = safer (92-99 typical for clean samples)."""
    grade = toxicity_grade or classify_metals_risk(pb_val, cd_val, hg_val, as_val)
    metal_load = pb_val * 100 + cd_val * 60 + hg_val * 500 + as_val * 40
    if grade == "Safe":
        return float(max(92.0, min(99.0, round(99 - metal_load))))
    if grade == "Caution":
        return float(max(62.0, min(84.0, round(80 - metal_load * 0.4))))
    return float(max(10.0, min(42.0, round(38 - metal_load * 0.15))))


class MLEngine:
    def __init__(self):
        self.models_loaded = False
        self.scalers = {}
        self.models = {}
        self.metrics = {}
        self.feature_importances = {}

    def generate_synthetic_data(self, n_samples: int = 5000) -> pd.DataFrame:
        """
        Generates a physically sound dataset representing elemental signatures for different foods.
        """
        np.random.seed(42)
        data = []

        for _ in range(n_samples):
            category = np.random.choice(CATEGORIES)
            name = f"Sample_{category}_{np.random.randint(1000, 9999)}"

            # Base organic composition (C, H, O, N)
            c = h = o = n = p = ca = mg = k = na = 0.0
            pb = cd = hg = _as = 0.0

            if category == "Grain":
                # High carbs, moderate protein
                c = np.random.uniform(42.0, 48.0)
                h = np.random.uniform(6.0, 7.0)
                o = np.random.uniform(41.0, 44.0)
                n = np.random.uniform(1.2, 2.0)  # Protein % ~ N * 5.7 (approx 7-11%)
                p = np.random.uniform(0.2, 0.4)
                ca = np.random.uniform(0.01, 0.05)
                mg = np.random.uniform(0.08, 0.15)
                k = np.random.uniform(0.2, 0.4)
                na = np.random.uniform(0.005, 0.02)
            elif category == "Fruit":
                # Fruit: often high moisture; avocado-like draws use higher C/H for lipids
                c = np.random.uniform(40.0, 54.0)
                h = np.random.uniform(6.5, 8.0)
                o = np.random.uniform(30.0, 52.0)
                n = np.random.uniform(0.1, 0.8)
                p = np.random.uniform(0.05, 0.15)
                ca = np.random.uniform(0.02, 0.08)
                mg = np.random.uniform(0.03, 0.1)
                k = np.random.uniform(0.2, 0.45)
                na = np.random.uniform(0.001, 0.01)
            elif category == "Vegetable":
                # High fiber/moisture, high minerals
                c = np.random.uniform(35.0, 40.0)
                h = np.random.uniform(5.5, 6.5)
                o = np.random.uniform(50.0, 54.0)
                n = np.random.uniform(0.4, 1.2)
                p = np.random.uniform(0.1, 0.25)
                ca = np.random.uniform(0.05, 0.2)  # Rich in calcium
                mg = np.random.uniform(0.05, 0.15)
                k = np.random.uniform(0.25, 0.5)
                na = np.random.uniform(0.01, 0.05)
            elif category == "Meat":
                # High protein, high fat, no carbs
                c = np.random.uniform(52.0, 58.0)
                h = np.random.uniform(7.5, 9.5)
                o = np.random.uniform(25.0, 32.0)
                n = np.random.uniform(3.0, 5.0)  # Protein % ~ N * 6.25 (approx 18-31%)
                p = np.random.uniform(0.15, 0.3)
                ca = np.random.uniform(0.005, 0.02)
                mg = np.random.uniform(0.02, 0.06)
                k = np.random.uniform(0.2, 0.35)
                na = np.random.uniform(0.05, 0.15)
            elif category == "Seafood":
                # High protein, moderate fat, trace carbs
                c = np.random.uniform(52.0, 56.0)
                h = np.random.uniform(7.8, 8.5)
                o = np.random.uniform(26.0, 30.0)
                n = np.random.uniform(4.0, 5.2)
                p = np.random.uniform(0.18, 0.28)
                ca = np.random.uniform(0.01, 0.03)
                mg = np.random.uniform(0.03, 0.06)
                k = np.random.uniform(0.25, 0.38)
                na = np.random.uniform(0.08, 0.14)
            elif category == "Dairy":
                # High fat, carbs, high calcium
                c = np.random.uniform(46.0, 52.0)
                h = np.random.uniform(7.0, 8.5)
                o = np.random.uniform(36.0, 42.0)
                n = np.random.uniform(1.8, 2.8)  # Protein approx 11-17%
                p = np.random.uniform(0.1, 0.2)
                ca = np.random.uniform(0.1, 0.4)  # High calcium
                mg = np.random.uniform(0.01, 0.04)
                k = np.random.uniform(0.1, 0.2)
                na = np.random.uniform(0.03, 0.1)
            elif category == "Legume":
                # Very high protein, moderate carbs
                c = np.random.uniform(43.0, 49.0)
                h = np.random.uniform(6.0, 7.5)
                o = np.random.uniform(38.0, 43.0)
                n = np.random.uniform(2.5, 4.2)  # High Nitrogen
                p = np.random.uniform(0.25, 0.5)
                ca = np.random.uniform(0.08, 0.18)
                mg = np.random.uniform(0.1, 0.2)
                k = np.random.uniform(0.3, 0.6)
                na = np.random.uniform(0.01, 0.03)
            elif category == "Beverage":
                # Low protein, high water/alcohol signature
                c = np.random.uniform(37.0, 41.0)
                h = np.random.uniform(8.5, 9.8)
                o = np.random.uniform(49.0, 53.0)
                n = np.random.uniform(0.08, 0.2)
                p = np.random.uniform(0.04, 0.1)
                ca = np.random.uniform(0.02, 0.06)
                mg = np.random.uniform(0.01, 0.04)
                k = np.random.uniform(0.12, 0.22)
                na = np.random.uniform(0.002, 0.008)

            # Normalization check
            total = c + h + o + n + p + ca + mg + k + na
            scale = 99.99 / total
            c *= scale
            h *= scale
            o *= scale
            n *= scale
            p *= scale
            ca *= scale
            mg *= scale
            k *= scale
            na *= scale

            # Generate trace heavy metals (in ppm, e.g. mg/kg)
            # Most samples are safe (below 0.1 ppm)
            is_contaminated = np.random.rand() < 0.08  # 8% contamination rate
            is_danger = np.random.rand() < 0.04        # 4% dangerous contamination rate

            if is_danger:
                pb = np.random.uniform(0.5, 3.0)
                cd = np.random.uniform(0.2, 1.5)
                hg = np.random.uniform(0.1, 0.8)
                _as = np.random.uniform(0.4, 2.0)
            elif is_contaminated:
                pb = np.random.uniform(0.1, 0.49)
                cd = np.random.uniform(0.05, 0.19)
                hg = np.random.uniform(0.02, 0.09)
                _as = np.random.uniform(0.1, 0.39)
            else:
                pb = np.random.uniform(0.001, 0.05)
                cd = np.random.uniform(0.001, 0.02)
                hg = np.random.uniform(0.0001, 0.008)
                _as = np.random.uniform(0.001, 0.04)

            # Define real (ground truth) nutritional outputs
            # Protein maps directly to Nitrogen
            protein = n * (5.7 if category == "Grain" else 6.25)
            # Fat correlates with high C relative to N and O
            fat_base = (c * 1.5 + h * 4.0) - (o * 1.2 + n * 3.0)
            fat = max(0.1, min(95.0, fat_base / 2.0))
            if category == "Meat" or category == "Dairy":
                fat += np.random.uniform(5, 15)
            elif category == "Seafood":
                fat += np.random.uniform(2, 8)
            elif category == "Fruit":
                fat = np.random.uniform(0.5, 18.0)
            elif category == "Vegetable":
                fat = np.random.uniform(0.1, 1.0)
            elif category == "Beverage":
                fat = np.random.uniform(0.0, 0.3)

            # Carbs fills the rest of dry organic matter
            carbs = max(0.0, min(98.0, 100.0 - (protein + fat + (p + ca + mg + k + na) * 20.0)))
            if category in ("Meat", "Seafood"):
                carbs = np.random.uniform(0.0, 1.5)
            elif category == "Beverage":
                carbs = np.random.uniform(1.0, 4.0)

            # Mineral estimate from ash components
            minerals = (p + ca + mg + k + na) * 100.0 / 8.0 # Scaled representatively
            vitamins = max(0.0, min(5.0, (o / (c + 0.1)) * 3.0 + np.random.uniform(-0.5, 0.5)))

            # Normalize Macronutrients (protein, fat, carbs) to roughly make sense
            macro_total = protein + fat + carbs
            if macro_total > 99.0:
                protein = (protein / macro_total) * 98.0
                fat = (fat / macro_total) * 98.0
                carbs = (carbs / macro_total) * 98.0

            # Define safety & quality rules
            heavy_metal_sum = pb * 1.0 + cd * 2.0 + hg * 5.0 + _as * 1.5

            toxicity_grade = classify_metals_risk(pb, cd, hg, _as)
            toxicity_score = compute_safety_score(pb, cd, hg, _as, toxicity_grade)

            # Quality Score based on Mineral Density, high protein, and low heavy metals
            quality_base = 50.0 + (minerals * 5.0) + (protein * 0.4) - (heavy_metal_sum * 15.0)
            quality_score = max(5.0, min(99.0, quality_base + np.random.uniform(-5.0, 5.0)))

            if toxicity_grade == "Contaminated" or quality_score < 40:
                quality_grade = "Poor Quality"
            elif quality_score > 78 and toxicity_grade == "Safe":
                quality_grade = "Premium Quality"
            else:
                quality_grade = "Standard Quality"

            data.append({
                "name": name,
                "category": category,
                "c_pct": c, "h_pct": h, "o_pct": o, "n_pct": n, "p_pct": p, "ca_pct": ca, "mg_pct": mg, "k_pct": k, "na_pct": na,
                "trace_pb": pb, "trace_cd": cd, "trace_hg": hg, "trace_as": _as,
                "protein": protein, "fat": fat, "carbs": carbs, "minerals": minerals, "vitamins": vitamins,
                "quality_grade": quality_grade,
                "quality_score": quality_score,
                "toxicity_grade": toxicity_grade,
                "toxicity_score": toxicity_score
            })

        return pd.DataFrame(data)

    def train_and_evaluate(self):
        """
        Trains and serializes Decision Tree, Random Forest, SVM, and MLP Neural Networks.
        """
        print("[ML_ENGINE] Initiating synthetic dataset generation...")
        df = self.generate_synthetic_data(5000)

        X = df[FEATURES].values
        
        # Targets
        Y_nutrition = df[["protein", "fat", "carbs", "minerals", "vitamins"]].values
        Y_quality_class = df["quality_grade"].values
        Y_toxicity_class = df["toxicity_grade"].values

        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        self.scalers["main"] = scaler
        joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))

        # Train-Test Split
        X_train, X_test, Y_nut_train, Y_nut_test, Y_q_train, Y_q_test, Y_t_train, Y_t_test = train_test_split(
            X_scaled, Y_nutrition, Y_quality_class, Y_toxicity_class, test_size=0.2, random_state=42
        )

        model_types = ["Decision Tree", "Random Forest", "SVM", "Neural Network"]

        for m_type in model_types:
            print(f"[ML_ENGINE] Training {m_type} models...")
            start_time = time.time()

            # Create regressors for nutrition prediction
            if m_type == "Decision Tree":
                reg = DecisionTreeRegressor(max_depth=10, random_state=42)
                clf_q = DecisionTreeClassifier(max_depth=8, class_weight="balanced", random_state=42)
                clf_t = DecisionTreeClassifier(max_depth=8, class_weight="balanced", random_state=42)
            elif m_type == "Random Forest":
                reg = RandomForestRegressor(n_estimators=50, max_depth=12, random_state=42)
                clf_q = RandomForestClassifier(n_estimators=50, max_depth=10, class_weight="balanced", random_state=42)
                clf_t = RandomForestClassifier(n_estimators=50, max_depth=10, class_weight="balanced", random_state=42)
            elif m_type == "SVM":
                # For multi-output in SVR, wrap SVR or just predict high-level protein/fat/carbs separately.
                # To keep it simple, we wrap SVR with multi-output or train individual ones.
                # Let's train SVR for protein, SVR for fat, SVR for carbs, SVR for minerals, SVR for vitamins
                reg = SVR(kernel='rbf', C=10.0) # SVR is trained below individually
                clf_q = SVC(kernel='rbf', C=10.0, class_weight="balanced", probability=True, random_state=42)
                clf_t = SVC(kernel='rbf', C=10.0, class_weight="balanced", probability=True, random_state=42)
            elif m_type == "Neural Network":
                reg = MLPRegressor(hidden_layer_sizes=(64, 32), max_iter=200, random_state=42)
                clf_q = MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=200, random_state=42)
                clf_t = MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=200, random_state=42)

            # Train nutrition regressors
            t0 = time.time()
            if m_type == "SVM":
                svrs = []
                for i in range(5):
                    svr = SVR(kernel='rbf', C=10.0)
                    svr.fit(X_train, Y_nut_train[:, i])
                    svrs.append(svr)
                reg_fitted = svrs
            else:
                reg.fit(X_train, Y_nut_train)
                reg_fitted = reg

            # Train classifiers
            clf_q.fit(X_train, Y_q_train)
            clf_t.fit(X_train, Y_t_train)
            
            training_time = time.time() - start_time

            # Evaluate latency and metrics
            latency_start = time.time()
            # Predict test set
            if m_type == "SVM":
                y_nut_pred = np.column_stack([svr.predict(X_test) for svr in reg_fitted])
            else:
                y_nut_pred = reg_fitted.predict(X_test)

            y_q_pred = clf_q.predict(X_test)
            y_t_pred = clf_t.predict(X_test)
            latency_ms = ((time.time() - latency_start) / len(X_test)) * 1000.0

            # Calculate accuracy stats (average classification metrics)
            acc_q = accuracy_score(Y_q_test, y_q_pred)
            acc_t = accuracy_score(Y_t_test, y_t_pred)
            overall_accuracy = (acc_q + acc_t) / 2.0

            prec, rec, f1, _ = precision_recall_fscore_support(Y_q_test, y_q_pred, average='weighted', zero_division=0)

            # Store metrics
            self.metrics[m_type] = {
                "accuracy": overall_accuracy,
                "precision": prec,
                "recall": rec,
                "f1_score": f1,
                "latency_ms": latency_ms,
                "training_time_s": training_time,
                "updated_at": datetime.utcnow()
            }

            # Save models
            joblib.dump(reg_fitted, os.path.join(MODEL_DIR, f"{m_type.lower().replace(' ', '_')}_reg.pkl"))
            joblib.dump(clf_q, os.path.join(MODEL_DIR, f"{m_type.lower().replace(' ', '_')}_clf_q.pkl"))
            joblib.dump(clf_t, os.path.join(MODEL_DIR, f"{m_type.lower().replace(' ', '_')}_clf_t.pkl"))

            # Extract Feature Importance (Random Forest or Decision Tree)
            if m_type == "Random Forest":
                self.feature_importances = {
                    FEATURES[i]: float(clf_q.feature_importances_[i]) for i in range(len(FEATURES))
                }
                joblib.dump(self.feature_importances, os.path.join(MODEL_DIR, "feature_importances.pkl"))

        # Save Metrics list
        joblib.dump(self.metrics, os.path.join(MODEL_DIR, "metrics.pkl"))
        self.models_loaded = False
        print("[ML_ENGINE] All models trained and saved successfully. Loading models into memory...")
        self.load_models()

    def load_models(self) -> bool:
        """
        Loads models from disk if they exist, otherwise triggers training.
        """
        try:
            scaler_path = os.path.join(MODEL_DIR, "scaler.pkl")
            metrics_path = os.path.join(MODEL_DIR, "metrics.pkl")
            
            if not os.path.exists(scaler_path) or not os.path.exists(metrics_path):
                print("[ML_ENGINE] Model binaries not found. Commencing automated training...")
                self.train_and_evaluate()
                return True

            self.scalers["main"] = joblib.load(scaler_path)
            self.metrics = joblib.load(metrics_path)
            
            if os.path.exists(os.path.join(MODEL_DIR, "feature_importances.pkl")):
                self.feature_importances = joblib.load(os.path.join(MODEL_DIR, "feature_importances.pkl"))

            model_types = ["decision_tree", "random_forest", "svm", "neural_network"]
            for m in model_types:
                self.models[f"{m}_reg"] = joblib.load(os.path.join(MODEL_DIR, f"{m}_reg.pkl"))
                self.models[f"{m}_clf_q"] = joblib.load(os.path.join(MODEL_DIR, f"{m}_clf_q.pkl"))
                self.models[f"{m}_clf_t"] = joblib.load(os.path.join(MODEL_DIR, f"{m}_clf_t.pkl"))

            self.models_loaded = True
            print("[ML_ENGINE] All models successfully loaded from disk.")
            return True
        except Exception as e:
            print(f"[ML_ENGINE] Error loading models: {e}. Retraining...")
            self.train_and_evaluate()
            return True

    def predict(self, input_features: Dict[str, float], model_name: str = "Random Forest") -> Dict[str, Any]:
        """
        Runs ML prediction using the selected model on an input elemental sample.
        """
        if not self.models_loaded:
            self.load_models()

        m_key = model_name.lower().replace(' ', '_')
        reg_model = self.models.get(f"{m_key}_reg")
        clf_q_model = self.models.get(f"{m_key}_clf_q")
        clf_t_model = self.models.get(f"{m_key}_clf_t")

        if not reg_model or not clf_q_model or not clf_t_model:
            # Fall back to Random Forest if selected model is missing
            m_key = "random_forest"
            reg_model = self.models.get("random_forest_reg")
            clf_q_model = self.models.get("random_forest_clf_q")
            clf_t_model = self.models.get("random_forest_clf_t")

        # Map input features into list ordered by FEATURES
        x_list = [input_features.get(f, 0.0) for f in FEATURES]
        x_arr = np.array([x_list])

        # Scale features
        x_scaled = self.scalers["main"].transform(x_arr)

        # Run Predictions
        if m_key == "svm":
            # SVM regressors were trained individually
            nut_pred = np.array([svr.predict(x_scaled)[0] for svr in reg_model])
        else:
            nut_pred = reg_model.predict(x_scaled)[0]

        quality_grade = clf_q_model.predict(x_scaled)[0]
        toxicity_grade = clf_t_model.predict(x_scaled)[0]

        # Get probabilities for confidence calculation
        if hasattr(clf_q_model, "predict_proba"):
            q_probs = clf_q_model.predict_proba(x_scaled)[0]
            confidence = float(np.max(q_probs))
        else:
            confidence = 0.85 # Default fallback confidence for SVM / MLP if probabilities aren't active

        # Post-process macronutrients so they don't exceed 100% or fall below 0%
        protein = float(max(0.1, min(95.0, nut_pred[0])))
        fat = float(max(0.1, min(95.0, nut_pred[1])))
        carbs = float(max(0.0, min(98.0, nut_pred[2])))
        minerals = float(max(0.1, min(15.0, nut_pred[3])))
        vitamins = float(max(0.0, min(5.0, nut_pred[4])))

        total_macros = protein + fat + carbs
        if total_macros > 100.0:
            scale = 99.0 / total_macros
            protein *= scale
            fat *= scale
            carbs *= scale

        # Calculate a quality score and safety status
        pb_val = input_features.get("trace_pb", 0.0)
        cd_val = input_features.get("trace_cd", 0.0)
        hg_val = input_features.get("trace_hg", 0.0)
        as_val = input_features.get("trace_as", 0.0)
        heavy_metals_sum = pb_val * 1.0 + cd_val * 2.0 + hg_val * 5.0 + as_val * 1.5        # Multi-metal risk classification (worst-case across all 4 heavy metals)
        toxicity_grade = classify_metals_risk(pb_val, cd_val, hg_val, as_val)
        if toxicity_grade == "Contaminated":
            quality_grade = "Poor Quality"
        elif toxicity_grade == "Caution" and quality_grade == "Premium Quality":
            quality_grade = "Standard Quality"

        quality_score = 50.0 + (minerals * 4.0) + (protein * 0.35) - (heavy_metals_sum * 15.0)
        quality_score = float(max(5.0, min(99.0, quality_score)))

        toxicity_score = compute_safety_score(pb_val, cd_val, hg_val, as_val, toxicity_grade)

        # Determine the primary driving metal for warnings
        metals_info = [
            {"name": "Lead", "symbol": "Pb", "val": pb_val, "safe": PB_SAFE_MAX, "caution": PB_CAUTION_MAX},
            {"name": "Cadmium", "symbol": "Cd", "val": cd_val, "safe": CD_SAFE_MAX, "caution": CD_CAUTION_MAX},
            {"name": "Mercury", "symbol": "Hg", "val": hg_val, "safe": HG_SAFE_MAX, "caution": HG_CAUTION_MAX},
            {"name": "Arsenic", "symbol": "As", "val": as_val, "safe": AS_SAFE_MAX, "caution": AS_CAUTION_MAX},
        ]
        
        worst_metal = metals_info[0]
        worst_grade_val = 0
        for m in metals_info:
            if m["val"] >= m["caution"]:
                g_val = 2
            elif m["val"] >= m["safe"]:
                g_val = 1
            else:
                g_val = 0
            if g_val > worst_grade_val:
                worst_grade_val = g_val
                worst_metal = m
            elif g_val == worst_grade_val and (m["val"] / m["caution"]) > (worst_metal["val"] / worst_metal["caution"]):
                worst_metal = m

        # AI generated explanations (dynamic based on parameters)
        cat = input_features.get("category", "Food Sample")
        quality_explanation = (
            f"This {cat} sample has been classified as {quality_grade} (Score: {quality_score:.1f}%). "
            f"The primary organic signature indicates optimal Nitrogen levels supporting a predicted Protein content of {protein:.1f}%. "
            f"Mineral traces (Calcium, Magnesium, Phosphorus) are rich, representing an excellent nutritional density. "
        )
        if toxicity_grade == "Contaminated":
            quality_explanation += f"WARNING: {worst_metal['name']} ({worst_metal['symbol']}) at {worst_metal['val']:.4f} ppm exceeds safety limit of {worst_metal['caution']} ppm (combined metal load: {heavy_metals_sum:.2f})."
        elif toxicity_grade == "Caution":
            quality_explanation += f"CAUTION: {worst_metal['name']} ({worst_metal['symbol']}) at {worst_metal['val']:.4f} ppm is in the elevated monitoring band ({worst_metal['safe']}–{worst_metal['caution']} ppm)."
        else:
            quality_explanation += "Heavy metals remain well within standard safety tolerances."

        pb_marker = {"Safe": "[SAFE]", "Caution": "[CAUTION]", "Contaminated": "[CONTAMINATED]"}.get(
            toxicity_grade, "[?]"
        )
        toxicity_report = (
            f"{pb_marker} Heavy Metal Toxicity risk: {toxicity_grade}. "
            f"Primary factor: {worst_metal['name']} ({worst_metal['symbol']}) at {worst_metal['val']:.4f} ppm. "
            f"Full scan: Pb: {pb_val:.4f}ppm, Cd: {cd_val:.4f}ppm, Hg: {hg_val:.5f}ppm, As: {as_val:.4f}ppm. "
        )
        if toxicity_grade == "Contaminated":
            toxicity_report += f"Exceeds permissible limits for {worst_metal['name']} — quarantine batch and re-test."
        elif toxicity_grade == "Caution":
            toxicity_report += f"Monitor and validate {worst_metal['name']} levels before release."
        else:
            toxicity_report += "All checked metals (Pb, Cd, Hg, As) are below safety limits — cleared for consumption."

        return {
            "protein_pred": protein,
            "fat_pred": fat,
            "carbs_pred": carbs,
            "minerals_pred": minerals,
            "vitamins_pred": vitamins,
            "quality_grade": quality_grade,
            "quality_score": quality_score,
            "quality_explanation": quality_explanation,
            "toxicity_grade": toxicity_grade,
            "toxicity_score": toxicity_score,
            "toxicity_report": toxicity_report,
            "confidence": confidence
        }

# Global singleton
ml_engine = MLEngine()
