import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class PaymentCreateRequest(BaseModel):
    method: str = "UPI"
    amount: Optional[Decimal] = None

    @field_validator("method")
    @classmethod
    def validate_method(cls, v: str) -> str:
        clean = v.strip()
        allowed = {"UPI", "Card", "Net Banking"}
        if clean not in allowed:
            raise ValueError(f"Invalid payment method '{v}'. Must be one of: {', '.join(sorted(allowed))}")
        return clean

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= Decimal("0.00"):
            raise ValueError("Payment amount must be greater than zero.")
        return v


class PaymentResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    amount: Decimal
    method: str
    status: str
    reference: str
    paid_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentDetailResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    invoice_number: str
    client_name: str
    client_email: Optional[str] = None
    amount: Decimal
    currency: str = "INR"
    method: str
    status: str
    reference: str
    paid_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
