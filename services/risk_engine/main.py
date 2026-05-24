from fastapi import FastAPI
from services.risk_engine.app.api.v1.routes.risk import router as risk_router
from services.risk_engine.app.api.v1.routes.fraud_admin import router as fraud_router
from services.risk_engine.app.core.config import settings
from shared.response import success_response
from shared.auth.security import SecurityHeadersMiddleware

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(SecurityHeadersMiddleware)

# Register Routers
app.include_router(risk_router, prefix=settings.API_V1_STR)
app.include_router(fraud_router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    return success_response(data={"service": "risk_engine", "status": "ok"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
