import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
    ConfigDict,
)


class InvoiceItemCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=500, description="Item description")
    quantity: Decimal = Field(..., gt=Decimal("0.00"), description="Quantity must be greater than 0")
    rate: Decimal = Field(..., ge=Decimal("0.00"), description="Unit rate cannot be negative")

    model_config = ConfigDict(extra="forbid")

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Item description cannot be blank")
        return cleaned


class InvoiceItemResponse(BaseModel):
    id: uuid.UUID
    description: str
    quantity: Decimal
    rate: Decimal
    amount: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClientSummary(BaseModel):
    id: uuid.UUID
    name: str
    email: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InvoiceCreate(BaseModel):
    client_id: uuid.UUID = Field(..., description="UUID of client to bill")
    invoice_number: Optional[str] = Field(None, max_length=50, description="Optional custom invoice number")
    status: Optional[str] = Field("draft", pattern="^(draft|sent)$", description="Initial status")
    issue_date: date = Field(..., description="Issue date")
    due_date: Optional[date] = Field(None, description="Due date (defaults to issue_date + settings.default_payment_terms)")
    notes: Optional[str] = Field(None, max_length=2000, description="Optional notes")
    discount: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"), description="Flat discount amount")
    discount_percentage: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"), le=Decimal("100.00"), description="Discount percentage")
    tax: Optional[Decimal] = Field(Decimal("0.00"), ge=Decimal("0.00"), description="Flat tax amount")
    tax_percentage: Optional[Decimal] = Field(None, ge=Decimal("0.00"), le=Decimal("100.00"), description="Tax percentage")
    items: List[InvoiceItemCreate] = Field(..., min_length=1, description="At least one line item required")

    model_config = ConfigDict(extra="forbid")

    @field_validator("invoice_number", "notes")
    @classmethod
    def trim_optional_strings(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned if cleaned else None

    @model_validator(mode="after")
    def validate_dates(self) -> "InvoiceCreate":
        if self.due_date is not None and self.due_date < self.issue_date:
            raise ValueError("Due date cannot be earlier than issue date")
        return self


class InvoiceUpdate(BaseModel):
    client_id: Optional[uuid.UUID] = None
    status: Optional[str] = Field(None, pattern="^(draft|sent|paid|overdue)$")
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    discount: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    discount_percentage: Optional[Decimal] = Field(None, ge=Decimal("0.00"), le=Decimal("100.00"))
    tax: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    tax_percentage: Optional[Decimal] = Field(None, ge=Decimal("0.00"), le=Decimal("100.00"))
    items: Optional[List[InvoiceItemCreate]] = Field(None, min_length=1)

    model_config = ConfigDict(extra="forbid")

    @field_validator("notes")
    @classmethod
    def trim_optional_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned if cleaned else None

    @model_validator(mode="after")
    def validate_dates(self) -> "InvoiceUpdate":
        if self.due_date is not None and self.issue_date is not None:
            if self.due_date < self.issue_date:
                raise ValueError("Due date cannot be earlier than issue date")
        return self


class InvoiceResponse(BaseModel):
    id: uuid.UUID
    invoice_number: str
    client_id: uuid.UUID
    client: Optional[ClientSummary] = None
    status: str
    issue_date: date
    due_date: date
    notes: Optional[str] = None
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    paid_at: Optional[datetime] = None
    public_token: Optional[str] = None
    items: List[InvoiceItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvoiceListResponse(BaseModel):
    items: List[InvoiceResponse]
    total: int
    limit: int
    offset: int
