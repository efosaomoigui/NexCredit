# notification_engine

Outbound communications: SMS OTP (Termii), email, and WhatsApp messaging with template management.

## Structure

```
notification_engine/
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
