"""
services/ai_engine/app/api/v1/routes/inference.py
-------------------------------------------------
Endpoints for model inferences.
"""
from fastapi import APIRouter, Depends
import uuid

from shared.response import success_response
from services.ai_engine.app.services.anomaly import AnomalyDetection

router = APIRouter(prefix="/inference", tags=["AI Engine"])

@router.post("/anomaly")
async def detect_anomaly(
    user_id: uuid.UUID,
    features: dict
):
    """
    Evaluates a set of behavioral features for anomaly.
    Internal endpoint called by Risk Engine.
    """
    result = await AnomalyDetection.detect(user_id, features)
    return success_response(data=result)
