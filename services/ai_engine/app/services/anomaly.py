"""
services/ai_engine/app/services/anomaly.py
------------------------------------------
Behavioral anomaly detection using Isolation Forest.
"""
import uuid
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import os

class AnomalyDetection:
    @staticmethod
    async def detect(user_id: uuid.UUID, behavioral_features: dict):
        """
        Detects anomalies in application behavior (session time, typing speed, location).
        """
        # Features: [time_of_day, session_duration, screens_visited, typing_speed, location_consistency]
        # values normalized 0-1
        data = np.array([
            behavioral_features.get("time_of_day", 0.5),
            behavioral_features.get("session_duration", 0.5),
            behavioral_features.get("screens_visited", 0.5),
            behavioral_features.get("typing_speed", 0.5),
            behavioral_features.get("location_consistency", 1.0)
        ]).reshape(1, -1)
        
        # In Phase 1, we use a pre-set threshold or pre-trained forest
        # Mocking logic for MVP
        velocity = behavioral_features.get("velocity", 1) # Apps in last 7 days
        
        is_anomalous = False
        signals = []
        
        if velocity > 10:
            is_anomalous = True
            signals.append("High application velocity")
            
        if behavioral_features.get("typing_speed", 0.5) > 0.95:
            is_anomalous = True
            signals.append("Abnormal typing speed (potential script)")
            
        return {
            "anomaly_score": 0.85 if is_anomalous else 0.1,
            "is_anomalous": is_anomalous,
            "signals": signals
        }
