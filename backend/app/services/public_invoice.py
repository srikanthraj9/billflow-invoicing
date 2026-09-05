import secrets
import uuid
from datetime import date, datetime, timezone
from typing import Optional
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.business_settings import BusinessSettings
from app.core.finance import compute_effective_status
from app.schemas.payment import PaymentCreateRequest
from app.schemas.public_invoice import (
    PublicInvoiceItemResponse,
    PublicClientResponse,
    PublicBusinessResponse,
    PublicInvoiceResponse,
)


def _build_public_response(
    db: Session,
    invoice: Invoice,
    effective_status: str,
    payment: Optional[Payment] = None,
) -> PublicInvoiceResponse:
    """Helper to assemble a PublicInvoiceResponse from an Invoice model and its relations."""
    # Fetch merchant business settings
    biz = (
        db.query(BusinessSettings)
        .filter(BusinessSettings.user_id == invoice.user_id)
        .first()
    )

    business_resp = PublicBusinessResponse(
        business_name=biz.business_name if biz and biz.business_name else "BillFlow Merchant",
        business_email=biz.business_email if biz and biz.business_email else "",
        business_phone=biz.business_phone if biz else None,
        business_address=biz.business_address if biz else None,
        logo_url=biz.logo_url if biz else None,
        currency=biz.currency if biz and biz.currency else "INR",
    )

    client_resp = PublicClientResponse(
        name=invoice.client.name if invoice.client else "Client",
        company=invoice.client.company if invoice.client else None,
        email=invoice.client.email if invoice.client else None,
        phone=invoice.client.phone if invoice.client else None,
        address=invoice.client.address if invoice.client else None,
    )

    items_resp = [
        PublicInvoiceItemResponse(
            description=item.description,
            quantity=item.quantity,
            rate=item.rate,
            amount=item.amount,
        )
        for item in (invoice.items or [])
    ]

    # Resolve authoritative payment details if paid
    if payment is None and effective_status == "paid":
        payment = (
            db.query(Payment)
            .filter(Payment.invoice_id == invoice.id, Payment.status == "completed")
            .order_by(Payment.paid_at.desc(), Payment.created_at.desc())
            .first()
        )

    payment_method = payment.method if payment else None
    payment_reference = payment.reference if payment else None

    return PublicInvoiceResponse(
        invoice_number=invoice.invoice_number,
        status=effective_status,
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        notes=invoice.notes,
        currency=business_resp.currency,
        subtotal=invoice.subtotal,
        discount=invoice.discount,
        tax=invoice.tax,
        total=invoice.total,
        paid_at=invoice.paid_at,
        payment_method=payment_method,
        payment_reference=payment_reference,
        items=items_resp,
        client=client_resp,
        business=business_resp,
    )


def get_public_invoice_by_token(db: Session, token: str) -> PublicInvoiceResponse:
    """
    Public lookup by token.
    - No authentication required.
    - Draft invoices return HTTP 404 (hidden publicly).
    - Sent invoices past due date return 'overdue'.
    - Paid invoices return 'paid'.
    - Does not expose database UUIDs or public_token in JSON.
    """
    invoice = (
        db.query(Invoice)
        .options(joinedload(Invoice.client), selectinload(Invoice.items))
        .filter(Invoice.public_token == token)
        .first()
    )
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Dynamic overdue evaluation
    effective_status = compute_effective_status(invoice.status, invoice.due_date)

    # Draft invoices are hidden publicly
    if effective_status == "draft":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    return _build_public_response(db, invoice, effective_status)


def pay_public_invoice(
    db: Session,
    token: str,
    payment_data: Optional[PaymentCreateRequest] = None,
) -> PublicInvoiceResponse:
    """
    Public payment transaction with row-level locking (SELECT ... FOR UPDATE).
    - Unknown token -> 404
    - Draft invoice -> 404 (do not reveal draft existence)
    - Sent / Overdue invoice -> mark paid, set paid_at = now(UTC), create exactly ONE payment record
    - Paid invoice -> 400 "Invoice is already paid"
    - Atomic transaction: rollback both on any error.
    - Concurrency-safe: atomic transaction prevents double payment.
    """
    try:
        # 1. Acquire row lock within atomic transaction (no outer joins on with_for_update)
        invoice = (
            db.query(Invoice)
            .filter(Invoice.public_token == token)
            .with_for_update()
            .first()
        )
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found",
            )

        # 2. Evaluate status
        effective_status = compute_effective_status(invoice.status, invoice.due_date)

        if effective_status == "draft":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found",
            )

        if effective_status == "paid":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invoice is already paid",
            )

        # 3. Validate payment input
        method = "UPI"
        if payment_data:
            if payment_data.method:
                method = payment_data.method
            if payment_data.amount is not None:
                # Amount must match invoice total
                if payment_data.amount != invoice.total:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Payment amount ({payment_data.amount}) does not match invoice total ({invoice.total}).",
                    )

        # 4. Generate unique backend reference & server UTC timestamp
        reference = f"BF-{secrets.token_hex(6).upper()}"
        now_utc = datetime.now(timezone.utc)

        # 5. Create Payment record
        payment = Payment(
            id=uuid.uuid4(),
            invoice_id=invoice.id,
            amount=invoice.total,
            method=method,
            status="completed",
            reference=reference,
            paid_at=now_utc,
            created_at=now_utc,
        )
        db.add(payment)

        # 6. Transition invoice to paid
        invoice.status = "paid"
        invoice.paid_at = now_utc

        # 7. Commit atomically
        db.commit()

        # 8. Reload invoice with client and items for response
        reloaded_invoice = (
            db.query(Invoice)
            .options(joinedload(Invoice.client), selectinload(Invoice.items))
            .filter(Invoice.id == invoice.id)
            .one()
        )

        # 9. Return updated public representation with authoritative payment details
        return _build_public_response(db, reloaded_invoice, "paid", payment=payment)
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
