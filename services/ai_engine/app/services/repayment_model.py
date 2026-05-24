"""
services/ai_engine/app/services/repayment_model.py
--------------------------------------------------
Inference logic for repayment probability.
"""
import uuid
import joblib
import os
import logging
from .features import FeatureStore
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Path to model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../../models/repayment_model.pkl")

class RepaymentModelService:
    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            if os.path.exists(MODEL_PATH):
                cls._model = joblib.load(MODEL_PATH)
            else:
                logger.error("Repayment model not found. Using dummy inference.")
        return cls._model

    @staticmethod
    async def predict(session: AsyncSession, user_id: uuid.UUID):
        """
        Runs inference for a given borrower.
        """
        vector = await FeatureStore.compute_feature_vector(session, user_id)
        model = RepaymentModelService.get_model()
        
        if model:
            prob = model.predict_proba(vector.reshape(1, -1))[0][1]
        else:
            prob = 0.5 # Default fallback
            
        return {
            "probability": float(round(prob, 4)),
            "confidence": "high" if prob > 0.8 or prob < 0.2 else "medium",
            "model_version": "v1.0.0-baseline"
        }
