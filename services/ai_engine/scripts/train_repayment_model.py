"""
services/ai_engine/scripts/train_repayment_model.py
---------------------------------------------------
Trains the baseline logistic regression model for repayment prediction.
"""
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
import joblib
import os
from datetime import datetime

def generate_synthetic_data(n=1000):
    """
    Generates synthetic Nigerian borrower data for Phase 1.
    """
    np.random.seed(42)
    # Features: bureau, salary, stability, gambling, history, device_risk, id_conf, loans, days, apps
    X = np.random.rand(n, 10)
    
    # Simple logic: higher bureau, salary, and stability = better repayment
    # gambling and device_risk = worse repayment
    logits = (X[:, 0] * 3 + X[:, 1] * 2 + X[:, 2] * 2 - X[:, 3] * 4 - X[:, 5] * 2 + X[:, 6] * 1) - 2
    probs = 1 / (1 + np.exp(-logits))
    y = (probs > 0.5).astype(int)
    
    return X, y

def train():
    print("Generating synthetic training data...")
    X, y = generate_synthetic_data(5000)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    
    model = LogisticRegression()
    model.fit(X_train, y_train)
    
    auc = roc_auc_score(y_test, model.predict_proba(X_test)[:, 1])
    print(f"Model AUC-ROC: {auc:.4f}")
    
    # Save model
    os.makedirs("../models", exist_ok=True)
    version = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = f"../models/repayment_model_{version}.pkl"
    joblib.dump(model, path)
    
    # Update latest link
    joblib.dump(model, "../models/repayment_model.pkl")
    print(f"Model saved to {path}")

if __name__ == "__main__":
    train()
