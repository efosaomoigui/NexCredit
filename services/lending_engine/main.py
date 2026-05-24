from fastapi import FastAPI
from services.lending_engine.app.api.v1.routes.loans import router as loans_router
from services.lending_engine.app.api.v1.routes.servicing import router as servicing_router
from services.lending_engine.app.api.v1.routes.admin_loans import router as admin_loans_router
from services.lending_engine.app.api.v1.routes.admin_products import router as admin_products_router
from services.lending_engine.app.api.v1.routes.admin_pricing_policy import router as admin_pricing_policy_router
from services.lending_engine.app.core.config import settings
from shared.response import success_response
from shared.auth.security import SecurityHeadersMiddleware

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(SecurityHeadersMiddleware)

# Register Routers
app.include_router(loans_router, prefix=settings.API_V1_STR)
app.include_router(servicing_router, prefix=settings.API_V1_STR)
app.include_router(admin_loans_router, prefix=settings.API_V1_STR)
app.include_router(admin_products_router, prefix=settings.API_V1_STR)
app.include_router(admin_pricing_policy_router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    return success_response(data={"service": "lending_engine", "status": "ok"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
