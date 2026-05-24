from fastapi import FastAPI
from shared.response import success_response
from shared.auth.security import SecurityHeadersMiddleware
from services.crm_engine.app.api.v1.routes.tickets import router as tickets_router

app = FastAPI(title="NexCredit CRM Engine", version="0.1.0")

app.add_middleware(SecurityHeadersMiddleware)

app.include_router(tickets_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return success_response(data={"service": "crm_engine", "status": "ok"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8007)
