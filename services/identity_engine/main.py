from fastapi import FastAPI
from services.identity_engine.app.api.v1.routes import (
    auth_router,
    kyc_router,
    admin_router,
    users_admin_router,
    assignments_router,
    dedup_router,
    engine_controls_router,
    simulation_router,
)
from services.identity_engine.app.core.config import settings
from shared.response import success_response
from shared.auth.security import SecurityHeadersMiddleware
from shared.database import engine
from shared.models import Base

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(SecurityHeadersMiddleware)

# Register Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(kyc_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(users_admin_router, prefix=settings.API_V1_STR)
app.include_router(assignments_router, prefix=settings.API_V1_STR)
app.include_router(dedup_router, prefix=settings.API_V1_STR)
app.include_router(engine_controls_router, prefix=settings.API_V1_STR)
app.include_router(simulation_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def _ensure_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/health")
async def health_check():
    return success_response(data={"service": "identity_engine", "status": "ok"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
