"""
services/identity_engine/app/api/v1/routes/__init__.py
"""
from services.identity_engine.app.api.v1.routes.auth import router as auth_router
from services.identity_engine.app.api.v1.routes.kyc import router as kyc_router
from services.identity_engine.app.api.v1.routes.admin import router as admin_router
from services.identity_engine.app.api.v1.routes.users_admin import router as users_admin_router
from services.identity_engine.app.api.v1.routes.assignments import router as assignments_router
from services.identity_engine.app.api.v1.routes.dedup import router as dedup_router
from services.identity_engine.app.api.v1.routes.engine_controls import router as engine_controls_router
from services.identity_engine.app.api.v1.routes.simulation import router as simulation_router
