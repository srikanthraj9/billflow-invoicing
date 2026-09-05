from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.payment import PaymentCreateRequest
from app.schemas.public_invoice import PublicInvoiceResponse
from app.services.public_invoice import (
    get_public_invoice_by_token,
    pay_public_invoice,
)

router = APIRouter(prefix="/public/invoices", tags=["public-invoices"])


@router.get(
    "/{token}",
    response_model=PublicInvoiceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get public invoice details by secure token",
)
def get_public_invoice(
    token: str,
    db: Session = Depends(get_db),
):
    """
    Public invoice portal endpoint.
    - No JWT authentication required.
    - Access granted via unguessable public_token.
    - Draft invoices return HTTP 404 (hidden publicly).
    - Sent invoices past due date return 'overdue'.
    - Paid invoices return 'paid'.
    - Returns recipient-facing invoice, line items, client summary, and merchant business details.
    - Excludes all internal database UUIDs and credentials.
    """
    return get_public_invoice_by_token(db=db, token=token)


@router.post(
    "/{token}/pay",
    response_model=PublicInvoiceResponse,
    status_code=status.HTTP_200_OK,
    summary="Pay public invoice",
)
def pay_public_invoice_endpoint(
    token: str,
    payment_data: Optional[PaymentCreateRequest] = None,
    db: Session = Depends(get_db),
):
    """
    Public payment endpoint.
    - No JWT authentication required.
    - No sensitive banking credentials accepted or stored.
    - Row-level lock (SELECT ... FOR UPDATE) ensures concurrency safety and prevents double payment.
    - Atomically creates payment record and transitions invoice to paid with server UTC timestamp.
    - Rejects paid invoices with HTTP 400.
    - Rejects draft/unknown invoices with HTTP 404.
    - Returns updated authoritative public invoice response.
    """
    return pay_public_invoice(db=db, token=token, payment_data=payment_data)
