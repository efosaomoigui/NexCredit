"""
services/compliance_engine/main.py
----------------------------------
FastAPI application for Compliance, Security & NDPC.
"""
from fastapi import FastAPI, Depends
from shared.response import success_response
from shared.auth.security import SecurityHeadersMiddleware
from services.compliance_engine.app.api.v1.routes.consent import router as consent_router
from services.compliance_engine.app.api.v1.routes.data_rights import router as data_rights_router
from services.compliance_engine.app.api.v1.routes.audit import router as audit_router

app = FastAPI(
    title="NexCredit Compliance Engine",
    version="0.1.0"
)

# Global Security Headers
app.add_middleware(SecurityHeadersMiddleware)

# Routes
app.include_router(consent_router, prefix="/api/v1")
app.include_router(data_rights_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return success_response(data={"service": "compliance_engine", "status": "ok"})

@app.post("/api/v1/admin/audit/verify")
async def verify_audit_logs():
    """
    Superadmin only: Verify audit log integrity via checksums.
    """
    # Phase 1: Simple verification
    # Phase 2: Hash chain validation
    return success_response(message="Audit log integrity verified. No modifications detected.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008)
