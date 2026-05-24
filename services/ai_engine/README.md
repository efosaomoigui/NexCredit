# ai_engine

ML feature store, repayment probability scoring, fraud anomaly detection, and borrower segmentation.

## Structure

```
ai_engine/
  app/
    api/v1/routes/   # FastAPI routers
    models/          # SQLAlchemy ORM models (service-local)
    schemas/         # Pydantic request/response schemas
    services/        # Domain business logic layer
  tests/             # pytest unit + integration tests
  Dockerfile
  main.py            # FastAPI application entrypoint
  requirements.txt
```
