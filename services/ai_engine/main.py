"""
services/ai_engine/main.py
--------------------------
FastAPI application for the AI Intelligence Engine.
"""
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from shared.database import get_db
from shared.response import success_response, error_response
from shared.auth.security import SecurityHeadersMiddleware
from services.ai_engine.app.services.repayment_model import RepaymentModelService
from services.ai_engine.app.services.anomaly import AnomalyDetection
from services.ai_engine.app.services.segmentation import SegmentationService
from services.ai_engine.app.services.features import FeatureStore
from services.ai_engine.app.api.v1.routes.inference import router as inference_router

app = FastAPI(
    title="NexCredit AI Intelligence Engine",
    version="0.1.0"
)

app.add_middleware(SecurityHeadersMiddleware)

app.include_router(inference_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return success_response(data={"service": "ai_engine", "status": "ok"})

@app.get("/api/v1/admin/ai/recommendation/{application_id}")
async def get_ai_recommendation(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns AI-driven recommendations for a specific loan application.
    """
    # 1. Fetch Application/User
    from shared.models import LoanApplication
    from sqlalchemy import select
    res = await db.execute(select(LoanApplication).where(LoanApplication.id == application_id))
    app_record = res.scalar_one_or_none()
    
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found")
        
    user_id = app_record.user_id
    
    # 2. Run Predictions
    prediction = await RepaymentModelService.predict(db, user_id)
    anomaly = await AnomalyDetection.detect(user_id, behavioral_features={"velocity": 2}) # velocity mock
    
    # 3. Compute Segment
    features = await FeatureStore.compute_feature_vector(db, user_id)
    segment = SegmentationService.assign_segment(features.tolist())
    
    return success_response(data={
        "application_id": application_id,
        "repayment_probability": prediction["probability"],
        "confidence": prediction["confidence"],
        "anomaly": anomaly,
        "segment": segment,
        "model_version": prediction["model_version"]
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)
