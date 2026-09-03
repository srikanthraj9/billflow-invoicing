import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict


class ClientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Client full name or primary contact")
    email: Optional[EmailStr] = Field(None, description="Contact email address")
    company: Optional[str] = Field(None, max_length=255, description="Company or business name")
    phone: Optional[str] = Field(None, max_length=50, description="Phone number")
    address: Optional[str] = Field(None, description="Billing or physical address")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Client name cannot be blank")
        return cleaned

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = str(v).strip().lower()
        return cleaned if cleaned else None

    @field_validator("company", "phone", "address")
    @classmethod
    def trim_optional_fields(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned if cleaned else None


class ClientCreate(ClientBase):
    # Reject unexpected fields such as user_id
    model_config = ConfigDict(extra="forbid")


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    company: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Client name cannot be blank")
        return cleaned

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = str(v).strip().lower()
        return cleaned if cleaned else None

    @field_validator("company", "phone", "address")
    @classmethod
    def trim_optional_fields(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned if cleaned else None


class ClientResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClientListResponse(BaseModel):
    items: List[ClientResponse]
    total: int
    limit: int
    offset: int
