import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientListResponse,
)
from app.services.client import (
    create_client,
    get_clients,
    get_client_by_id,
    update_client,
    delete_client,
)

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.post(
    "",
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new client",
)
def create_new_client(
    data: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClientResponse:
    """
    Creates a new client.
    Ownership is assigned exclusively to the authenticated user (current_user.id).
    """
    client = create_client(db, current_user.id, data)
    return ClientResponse.model_validate(client)


@router.get(
    "",
    response_model=ClientListResponse,
    status_code=status.HTTP_200_OK,
    summary="List own clients with search, sorting, and pagination",
)
def list_clients(
    search: Optional[str] = Query(None, description="Search query across name, email, company, and phone"),
    sort_by: str = Query("name", pattern="^(name|recent)$", description="Sorting field: 'name' or 'recent'"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of clients to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClientListResponse:
    """
    Retrieves all clients belonging to the authenticated user.
    Filtering and sorting are executed entirely server-side in PostgreSQL.
    """
    clients, total = get_clients(
        db,
        current_user.id,
        search=search,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )
    return ClientListResponse(
        items=[ClientResponse.model_validate(c) for c in clients],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{client_id}",
    response_model=ClientResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a single client by ID",
)
def get_single_client(
    client_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClientResponse:
    """
    Retrieves client by UUID.
    Enforces strict ownership: returns HTTP 404 if nonexistent or cross-tenant.
    """
    client = get_client_by_id(db, current_user.id, client_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return ClientResponse.model_validate(client)


@router.put(
    "/{client_id}",
    response_model=ClientResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a client",
)
def update_existing_client(
    client_id: uuid.UUID,
    data: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClientResponse:
    """
    Updates an existing client.
    Enforces ownership: returns HTTP 404 if nonexistent or owned by another user.
    """
    client = update_client(db, current_user.id, client_id, data)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return ClientResponse.model_validate(client)


@router.delete(
    "/{client_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a client",
)
def delete_existing_client(
    client_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """
    Deletes a client belonging to the authenticated user.
    If the client is linked to invoices, deletion is prevented (HTTP 409 Conflict).
    """
    delete_client(db, current_user.id, client_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
