# risk_engine

Credit scoring engine: bureau pull (CRC/FirstCentral), Mono bank-statement analysis, fraud flag evaluation, and risk tier assignment.

## Structure

```
risk_engine/
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
