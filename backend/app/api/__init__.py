from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.clients import router as clients_router
from app.api.invoices import router as invoices_router
from app.api.public import router as public_router
from app.api.dashboard import router as dashboard_router
from app.api.settings import router as settings_router
from app.api.payments import router as payments_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(clients_router)
api_router.include_router(invoices_router)
api_router.include_router(public_router)
api_router.include_router(dashboard_router)
api_router.include_router(settings_router)
api_router.include_router(payments_router)
