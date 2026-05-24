from fastapi import FastAPI
from services.collections_engine.app.api.v1.routes.collections import router as collections_router
from shared.response import success_response
from shared.auth.security import SecurityHeadersMiddleware

app = FastAPI(
    title="NexCredit Collections Engine",
    version="0.1.0"
)

app.add_middleware(SecurityHeadersMiddleware)

app.include_router(collections_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return success_response(data={"service": "collections_engine", "status": "ok"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
