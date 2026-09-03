import uuid
from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class DashboardRecentInvoice(BaseModel):
    id: uuid.UUID
    invoice_number: str = Field(..., alias="invoiceNumber")
    client_name: str = Field(..., alias="clientName")
    client_company: Optional[str] = Field(None, alias="clientCompany")
    issue_date: date = Field(..., alias="issueDate")
    due_date: date = Field(..., alias="dueDate")
    total: float = Field(..., alias="totalAmount")
    status: str
    currency: str

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class MonthlyIncomePointResponse(BaseModel):
    month: str = Field(..., description="Short 3-letter month, e.g. 'Apr'")
    year: int = Field(..., description="4-digit year, e.g. 2026")
    period: str = Field(..., description="ISO period key, e.g. '2026-04'")
    amount: float = Field(..., description="Numeric amount for chart calculations")
    formatted_amount: str = Field(..., alias="formattedAmount", description="Display currency string")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class DashboardResponse(BaseModel):
    total_earned: float = Field(..., alias="totalEarned")
    total_outstanding: float = Field(..., alias="totalOutstanding")
    total_overdue: float = Field(..., alias="totalOverdue")
    total_invoices_count: int = Field(..., alias="totalInvoicesCount")
    overdue_invoices_count: int = Field(..., alias="overdueInvoicesCount")
    pending_invoices_count: int = Field(..., alias="pendingInvoicesCount")
    currency: str
    recent_invoices: List[DashboardRecentInvoice] = Field(..., alias="recentInvoices")
    monthly_income: List[MonthlyIncomePointResponse] = Field(..., alias="monthlyIncome")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
