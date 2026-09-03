import uuid
from typing import Optional, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate


def create_client(
    db: Session,
    user_id: uuid.UUID,
    data: ClientCreate,
) -> Client:
    """
    Creates a new client assigned exclusively to user_id.
    """
    client = Client(
        user_id=user_id,
        name=data.name,
        email=data.email,
        company=data.company,
        phone=data.phone,
        address=data.address,
    )
    db.add(client)
    try:
        db.commit()
        db.refresh(client)
        return client
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create client",
        )


def get_clients(
    db: Session,
    user_id: uuid.UUID,
    search: Optional[str] = None,
    sort_by: str = "name",
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[Client], int]:
    """
    Lists clients strictly owned by user_id with server-side search, sorting, and pagination.
    """
    query = db.query(Client).filter(Client.user_id == user_id)

    # Server-side case-insensitive search across name, email, company, phone
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Client.name.ilike(pattern),
                Client.email.ilike(pattern),
                Client.company.ilike(pattern),
                Client.phone.ilike(pattern),
            )
        )

    # Total matching records for pagination metadata
    total = query.count()

    # Whitelist-based sorting
    if sort_by == "recent":
        query = query.order_by(Client.created_at.desc())
    else:
        query = query.order_by(Client.name.asc())

    clients = query.offset(offset).limit(limit).all()
    return clients, total


def get_client_by_id(
    db: Session,
    user_id: uuid.UUID,
    client_id: uuid.UUID,
) -> Optional[Client]:
    """
    Retrieves a client by ID scoped strictly to user_id.
    Returns None if nonexistent or owned by another user.
    """
    return (
        db.query(Client)
        .filter(Client.id == client_id, Client.user_id == user_id)
        .first()
    )


def update_client(
    db: Session,
    user_id: uuid.UUID,
    client_id: uuid.UUID,
    data: ClientUpdate,
) -> Optional[Client]:
    """
    Updates an existing client owned by user_id.
    Returns None if nonexistent or cross-tenant.
    """
    client = (
        db.query(Client)
        .filter(Client.id == client_id, Client.user_id == user_id)
        .first()
    )
    if not client:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    try:
        db.commit()
        db.refresh(client)
        return client
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update client",
        )


def delete_client(
    db: Session,
    user_id: uuid.UUID,
    client_id: uuid.UUID,
) -> None:
    """
    Deletes a client owned by user_id.
    Enforces foreign key RESTRICT protection:
    If invoices reference this client, rejects deletion with HTTP 409 Conflict.
    """
    client = (
        db.query(Client)
        .filter(Client.id == client_id, Client.user_id == user_id)
        .first()
    )
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )

    try:
        db.delete(client)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete client because they have existing invoices.",
        )
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete client",
        )
