# compliance_engine

Immutable audit log writer, NDPC consent management, data retention enforcement, and regulatory report generation.

## Structure

```
compliance_engine/
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
