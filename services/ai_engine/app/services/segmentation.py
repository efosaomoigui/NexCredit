"""
services/ai_engine/app/services/segmentation.py
----------------------------------------------
Borrower segmentation using K-Means clustering.
"""
import uuid
from typing import List

SEGMENTS = [
    "Stable Salary Earner",
    "Micro-Trader",
    "Irregular Income",
    "High Velocity",
    "First Timer"
]

class SegmentationService:
    @staticmethod
    def assign_segment(features: list) -> str:
        """
        Assigns a borrower to a behavioral segment based on feature vector.
        """
        # [bureau_score, salary_score, stability, gambling, history, ...]
        # Simple rule-based proxy for K-Means for MVP Phase 1
        bureau, salary, stability, gambling, history = features[:5]
        
        if history == 0.5: # First Timer
            return "First Timer"
            
        if salary > 0.7 and stability > 0.7:
            return "Stable Salary Earner"
            
        if stability > 0.6 and salary < 0.4:
            return "Micro-Trader"
            
        if gambling > 0.5 or stability < 0.3:
            return "Irregular Income"
            
        return "Micro-Trader" # Default
