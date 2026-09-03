import re
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class SettingsUpdateRequest(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=100, alias="businessName")
    business_email: EmailStr = Field(..., alias="businessEmail")
    business_phone: Optional[str] = Field(None, max_length=30, alias="businessPhone")
    business_address: Optional[str] = Field(None, max_length=500, alias="businessAddress")
    currency: str = Field("INR", alias="currency")
    invoice_prefix: str = Field("INV", min_length=1, max_length=10, alias="invoicePrefix")
    default_tax_rate: Decimal = Field(
        default=Decimal("18.00"), ge=Decimal("0.00"), le=Decimal("100.00"), alias="defaultTaxPercentage"
    )
    default_payment_terms: int = Field(
        default=14, ge=1, le=365, alias="defaultPaymentTermsDays"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
        extra="forbid",
    )

    @field_validator("business_name")
    @classmethod
    def validate_business_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2 or len(cleaned) > 100:
            raise ValueError("Business name must be between 2 and 100 characters")
        return cleaned

    @field_validator("business_email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        code = v.strip().upper()
        if code not in {"INR", "USD", "EUR", "GBP"}:
            raise ValueError("Currency must be one of: INR, USD, EUR, GBP")
        return code

    @field_validator("invoice_prefix")
    @classmethod
    def validate_prefix(cls, v: str) -> str:
        cleaned = v.strip().upper()
        if not re.match(r"^[A-Z0-9_-]{1,10}$", cleaned):
            raise ValueError("Invoice prefix must be 1-10 alphanumeric characters, hyphens, or underscores")
        return cleaned


class SettingsResponse(BaseModel):
    business_name: str = Field(..., alias="businessName")
    business_email: str = Field(..., alias="businessEmail")
    business_phone: Optional[str] = Field(None, alias="businessPhone")
    business_address: Optional[str] = Field(None, alias="businessAddress")
    logo_url: Optional[str] = Field(None, alias="logoUrl")
    currency: str = Field(..., alias="currency")
    invoice_prefix: str = Field(..., alias="invoicePrefix")
    default_tax_rate: float = Field(..., alias="defaultTaxPercentage")
    default_payment_terms: int = Field(..., alias="defaultPaymentTermsDays")

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


class LogoUploadResponse(BaseModel):
    logo_url: str = Field(..., alias="logoUrl")

    model_config = ConfigDict(populate_by_name=True)
