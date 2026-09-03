from datetime import date, datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.invoice import Invoice
from app.models.business_settings import BusinessSettings
from app.core.finance import compute_effective_status
from app.schemas.public_invoice import (
    PublicInvoiceItemResponse,
    PublicClientResponse,
    PublicBusinessResponse,
    PublicInvoiceResponse,
)


def _build_public_response(db: Session, invoice: Invoice, effective_status: str) -> PublicInvoiceResponse:
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


def pay_public_invoice(db: Session, token: str) -> PublicInvoiceResponse:
    """
    Public payment simulation with row-level locking (SELECT ... FOR UPDATE).
    - Unknown token -> 404
    - Draft invoice -> 404 (do not reveal draft existence)
    - Sent / Overdue invoice -> mark paid, set paid_at = now(UTC)
    - Paid invoice -> 400 "Invoice is already paid"
    - Concurrency-safe: atomic transaction prevents double payment.
    """
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

    # 3. Transition to paid
    invoice.status = "paid"
    invoice.paid_at = datetime.now(timezone.utc)
    db.commit()

    # 4. Reload invoice with client and items for response
    reloaded_invoice = (
        db.query(Invoice)
        .options(joinedload(Invoice.client), selectinload(Invoice.items))
        .filter(Invoice.id == invoice.id)
        .one()
    )

    # 5. Return updated public representation
    return _build_public_response(db, reloaded_invoice, "paid")
