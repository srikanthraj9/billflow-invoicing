from pydantic import BaseModel, ConfigDict
from decimal import Decimal
from datetime import date, datetime
from typing import List, Optional


class PublicInvoiceItemResponse(BaseModel):
    description: str
    quantity: Decimal
    rate: Decimal
    amount: Decimal

    model_config = ConfigDict(from_attributes=True)


class PublicClientResponse(BaseModel):
    name: str
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PublicBusinessResponse(BaseModel):
    business_name: str
    business_email: str
    business_phone: Optional[str] = None
    business_address: Optional[str] = None
    logo_url: Optional[str] = None
    currency: str = "INR"

    model_config = ConfigDict(from_attributes=True)


class PublicInvoiceResponse(BaseModel):
    invoice_number: str
    status: str
    issue_date: date
    due_date: date
    notes: Optional[str] = None
    currency: str = "INR"
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    paid_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    items: List[PublicInvoiceItemResponse]
    client: PublicClientResponse
    business: PublicBusinessResponse

    model_config = ConfigDict(from_attributes=True)
