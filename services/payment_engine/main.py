from fastapi import FastAPI
from services.payment_engine.app.api.v1.routes.repayments import router as repayments_router
from services.payment_engine.app.api.v1.routes.webhooks import router as webhooks_router
from services.payment_engine.app.api.v1.routes.virtual_accounts import router as va_router
from services.payment_engine.app.api.v1.routes.disbursement import router as disbursement_router
from shared.response import success_response
from shared.auth.security import SecurityHeadersMiddleware

app = FastAPI(
    title="NexCredit Payment Engine",
    version="0.1.0",
    openapi_url="/api/v1/openapi.json"
)

app.add_middleware(SecurityHeadersMiddleware)

# Register Routers
app.include_router(repayments_router, prefix="/api/v1")
app.include_router(webhooks_router, prefix="/api/v1")
app.include_router(va_router, prefix="/api/v1")
app.include_router(disbursement_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return success_response(data={"service": "payment_engine", "status": "ok"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
