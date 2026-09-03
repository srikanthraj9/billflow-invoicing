import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceListResponse,
)
from app.services.invoice import (
    create_invoice,
    get_invoices,
    get_invoice_by_id,
    update_invoice,
    delete_invoice,
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.post(
    "",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new invoice",
)
def create_new_invoice(
    data: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceResponse:
    """
    Creates an invoice and child line items.
    Enforces that client_id belongs strictly to the authenticated user.
    Calculates subtotal, discount, tax, and total server-side with Decimal precision.
    """
    invoice = create_invoice(db, current_user.id, data)
    return InvoiceResponse.model_validate(invoice)


@router.get(
    "",
    response_model=InvoiceListResponse,
    status_code=status.HTTP_200_OK,
    summary="List own invoices with search, filtering, and sorting",
)
def list_user_invoices(
    search: Optional[str] = Query(None, description="Search query across invoice number and client name/company"),
    status: Optional[str] = Query(None, pattern="^(draft|sent|paid|overdue)$", description="Filter by status"),
    client_id: Optional[uuid.UUID] = Query(None, description="Filter by client UUID"),
    sort_by: str = Query("newest", pattern="^(newest|oldest|highest_amount|lowest_amount|due_date)$", description="Sort criteria"),
    limit: int = Query(50, ge=1, le=100, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceListResponse:
    """
    Retrieves all invoices belonging to the authenticated user.
    All search, filtering, and sorting are executed server-side in PostgreSQL.
    """
    invoices, total = get_invoices(
        db,
        current_user.id,
        search=search,
        status_filter=status,
        client_id=client_id,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )
    return InvoiceListResponse(
        items=[InvoiceResponse.model_validate(i) for i in invoices],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{invoice_id}",
    response_model=InvoiceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single invoice by ID",
)
def get_single_invoice(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceResponse:
    """
    Retrieves a single invoice by UUID.
    Returns HTTP 404 if nonexistent or cross-tenant.
    """
    invoice = get_invoice_by_id(db, current_user.id, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    return InvoiceResponse.model_validate(invoice)


@router.put(
    "/{invoice_id}",
    response_model=InvoiceResponse,
    status_code=status.HTTP_200_OK,
    summary="Update an existing invoice",
)
def update_existing_invoice(
    invoice_id: uuid.UUID,
    data: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceResponse:
    """
    Updates an invoice and replaces its line items.
    Returns HTTP 404 if cross-tenant or nonexistent.
    Returns HTTP 400 if attempting to modify a paid invoice.
    """
    invoice = update_invoice(db, current_user.id, invoice_id, data)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    return InvoiceResponse.model_validate(invoice)


@router.delete(
    "/{invoice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a draft invoice",
)
def delete_existing_invoice(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """
    Deletes an invoice owned by the authenticated user.
    Allowed only for draft invoices. Returns HTTP 400 if sent/paid/overdue.
    """
    delete_invoice(db, current_user.id, invoice_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
