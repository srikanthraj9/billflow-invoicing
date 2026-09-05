import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.business_settings import BusinessSettings
from app.schemas.payment import PaymentResponse, PaymentDetailResponse

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get(
    "",
    response_model=List[PaymentDetailResponse],
    status_code=status.HTTP_200_OK,
    summary="Get all payment records for authenticated merchant",
)
def get_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[PaymentDetailResponse]:
    """
    Returns authoritative backend payment records for the current user's invoices.
    - Tenant-isolated: only retrieves payments for invoices belonging to current_user.id.
    - Joins invoice and client to provide complete receipt/record details.
    - Ordered by created_at DESC.
    """
    settings = (
        db.query(BusinessSettings)
        .filter(BusinessSettings.user_id == current_user.id)
        .first()
    )
    currency = settings.currency.strip().upper() if settings and settings.currency else "INR"

    rows = (
        db.query(Payment, Invoice)
        .join(Invoice, Payment.invoice_id == Invoice.id)
        .options(joinedload(Invoice.client))
        .filter(Invoice.user_id == current_user.id)
        .order_by(Payment.created_at.desc())
        .all()
    )

    result = []
    for payment, invoice in rows:
        client_name = invoice.client.name if invoice.client else "Customer"
        client_email = invoice.client.email if invoice.client else None
        result.append(
            PaymentDetailResponse(
                id=payment.id,
                invoice_id=payment.invoice_id,
                invoice_number=invoice.invoice_number,
                client_name=client_name,
                client_email=client_email,
                amount=payment.amount,
                currency=currency,
                method=payment.method,
                status=payment.status,
                reference=payment.reference,
                paid_at=payment.paid_at,
                created_at=payment.created_at,
            )
        )
    return result


@router.get(
    "/invoice/{invoice_id}",
    response_model=PaymentDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get payment record for a specific invoice",
)
def get_payment_for_invoice(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentDetailResponse:
    """
    Returns payment details for an invoice owned by current_user.
    - Returns 404 if invoice doesn't exist or is not owned by current_user.
    - Returns 404 if invoice has no payment record.
    """
    invoice = (
        db.query(Invoice)
        .options(joinedload(Invoice.client))
        .filter(Invoice.id == invoice_id, Invoice.user_id == current_user.id)
        .first()
    )
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    payment = (
        db.query(Payment)
        .filter(Payment.invoice_id == invoice.id, Payment.status == "completed")
        .order_by(Payment.paid_at.desc(), Payment.created_at.desc())
        .first()
    )
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed payment found for this invoice",
        )

    settings = (
        db.query(BusinessSettings)
        .filter(BusinessSettings.user_id == current_user.id)
        .first()
    )
    currency = settings.currency.strip().upper() if settings and settings.currency else "INR"
    client_name = invoice.client.name if invoice.client else "Customer"
    client_email = invoice.client.email if invoice.client else None

    return PaymentDetailResponse(
        id=payment.id,
        invoice_id=payment.invoice_id,
        invoice_number=invoice.invoice_number,
        client_name=client_name,
        client_email=client_email,
        amount=payment.amount,
        currency=currency,
        method=payment.method,
        status=payment.status,
        reference=payment.reference,
        paid_at=payment.paid_at,
        created_at=payment.created_at,
    )
