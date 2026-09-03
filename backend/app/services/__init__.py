from app.services.auth import register_user, authenticate_user
from app.services.client import (
    create_client,
    get_clients,
    get_client_by_id,
    update_client,
    delete_client,
)
from app.services.invoice import (
    generate_next_invoice_number,
    create_invoice,
    get_invoices,
    get_invoice_by_id,
    update_invoice,
    delete_invoice,
)

from app.services.public_invoice import (
    get_public_invoice_by_token,
    pay_public_invoice,
)
from app.services.dashboard import get_dashboard_stats
from app.services.settings import (
    get_or_create_settings,
    update_settings,
    update_logo_url,
    clear_logo_url,
)
from app.services.storage import (
    extract_safe_storage_path,
    upload_logo_to_storage,
    delete_storage_object,
)

__all__ = [
    "register_user",
    "authenticate_user",
    "create_client",
    "get_clients",
    "get_client_by_id",
    "update_client",
    "delete_client",
    "generate_next_invoice_number",
    "create_invoice",
    "get_invoices",
    "get_invoice_by_id",
    "update_invoice",
    "delete_invoice",
    "get_public_invoice_by_token",
    "pay_public_invoice",
    "get_dashboard_stats",
    "get_or_create_settings",
    "update_settings",
    "update_logo_url",
    "clear_logo_url",
    "extract_safe_storage_path",
    "upload_logo_to_storage",
    "delete_storage_object",
]
