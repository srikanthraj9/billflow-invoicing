import logging
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Tuple
from sqlalchemy import func, case, or_, and_, Integer
from sqlalchemy.orm import Session, joinedload

from app.models.invoice import Invoice
from app.models.client import Client
from app.models.business_settings import BusinessSettings
from app.core.finance import compute_effective_status, format_currency
from app.schemas.dashboard import (
    DashboardResponse,
    DashboardRecentInvoice,
    MonthlyIncomePointResponse,
)

logger = logging.getLogger(__name__)

MONTH_NAMES = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]


def get_dashboard_stats(
    db: Session,
    user_id: uuid.UUID,
    months: int = 6,
) -> DashboardResponse:
    """
    Retrieves aggregated dashboard statistics strictly scoped to user_id.
    - Query 1: KPI balances and counts via conditional aggregation in PostgreSQL.
    - Query 2: Recent 5 invoices with joined client information.
    - Query 3: Monthly income points aggregated by UTC month from paid_at.
    - Query 4: Merchant business currency.
    - Preserves Decimal precision during calculation; outputs JSON numbers for API consumers.
    """
    # 1. Fetch merchant currency from BusinessSettings
    settings = (
        db.query(BusinessSettings)
        .filter(BusinessSettings.user_id == user_id)
        .first()
    )
    currency = settings.currency.strip().upper() if settings and settings.currency else "INR"

    # 2. Query 1: Single conditional aggregate query for KPI balances and counts
    today = date.today()
    kpi_row = (
        db.query(
            func.coalesce(
                func.sum(case((Invoice.status == "paid", Invoice.total), else_=Decimal("0.00"))),
                Decimal("0.00"),
            ).label("total_earned"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            or_(
                                Invoice.status == "sent",
                                and_(Invoice.status == "overdue", Invoice.due_date < today),
                            ),
                            Invoice.total,
                        ),
                        else_=Decimal("0.00"),
                    )
                ),
                Decimal("0.00"),
            ).label("total_outstanding"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            and_(
                                Invoice.status.in_(["sent", "overdue"]),
                                Invoice.due_date < today,
                            ),
                            Invoice.total,
                        ),
                        else_=Decimal("0.00"),
                    )
                ),
                Decimal("0.00"),
            ).label("total_overdue"),
            func.count(Invoice.id).label("total_invoices_count"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            and_(
                                Invoice.status.in_(["sent", "overdue"]),
                                Invoice.due_date < today,
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("overdue_invoices_count"),
            func.coalesce(
                func.sum(case((and_(Invoice.status == "sent", Invoice.due_date >= today), 1), else_=0)),
                0,
            ).label("pending_invoices_count"),
        )
        .filter(Invoice.user_id == user_id)
        .one()
    )

    total_earned = Decimal(kpi_row.total_earned or "0.00")
    total_outstanding = Decimal(kpi_row.total_outstanding or "0.00")
    total_overdue = Decimal(kpi_row.total_overdue or "0.00")
    total_invoices_count = int(kpi_row.total_invoices_count or 0)
    overdue_invoices_count = int(kpi_row.overdue_invoices_count or 0)
    pending_invoices_count = int(kpi_row.pending_invoices_count or 0)

    # 3. Query 2: Recent 5 invoices ordered by issue_date DESC, created_at DESC
    recent_invoices_db = (
        db.query(Invoice)
        .options(joinedload(Invoice.client))
        .filter(Invoice.user_id == user_id)
        .order_by(Invoice.issue_date.desc(), Invoice.created_at.desc())
        .limit(5)
        .all()
    )

    recent_invoices: List[DashboardRecentInvoice] = []
    for inv in recent_invoices_db:
        eff_status = compute_effective_status(inv.status, inv.due_date)
        client_name = inv.client.name if inv.client else "Unknown Client"
        client_company = inv.client.company if inv.client else None
        recent_invoices.append(
            DashboardRecentInvoice(
                id=inv.id,
                invoiceNumber=inv.invoice_number,
                clientName=client_name,
                clientCompany=client_company,
                issueDate=inv.issue_date,
                dueDate=inv.due_date,
                totalAmount=float(inv.total),
                status=eff_status,
                currency=currency,
            )
        )

    # 4. Query 3: Monthly Income points for rolling N months
    # Generate continuous calendar sequence in UTC
    now_utc = datetime.now(timezone.utc)
    cur_year = now_utc.year
    cur_month = now_utc.month

    periods: List[Tuple[int, int]] = []
    for offset in range(months - 1, -1, -1):
        m_idx = (cur_year * 12 + (cur_month - 1)) - offset
        y = m_idx // 12
        m = (m_idx % 12) + 1
        periods.append((y, m))

    earliest_year, earliest_month = periods[0]
    window_start_utc = datetime(earliest_year, earliest_month, 1, 0, 0, 0, tzinfo=timezone.utc)

    # SQL query: group paid invoices by (year, month) using paid_at in UTC
    year_col = func.extract("year", func.timezone("UTC", Invoice.paid_at)).cast(Integer).label("pay_year")
    month_col = func.extract("month", func.timezone("UTC", Invoice.paid_at)).cast(Integer).label("pay_month")

    income_rows = (
        db.query(
            year_col,
            month_col,
            func.coalesce(func.sum(Invoice.total), Decimal("0.00")).label("monthly_total"),
        )
        .filter(
            Invoice.user_id == user_id,
            Invoice.status == "paid",
            Invoice.paid_at.isnot(None),
            Invoice.paid_at >= window_start_utc,
        )
        .group_by(year_col, month_col)
        .all()
    )

    income_map = {(row.pay_year, row.pay_month): Decimal(row.monthly_total or "0.00") for row in income_rows}

    # Data integrity check: check for paid invoices without paid_at
    null_paid_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user_id, Invoice.status == "paid", Invoice.paid_at.is_(None))
        .scalar()
    )
    if null_paid_count and null_paid_count > 0:
        logger.warning(
            "User %s has %d paid invoice(s) with NULL paid_at. Excluding from monthly income chart.",
            user_id,
            null_paid_count,
        )

    monthly_income: List[MonthlyIncomePointResponse] = []
    for y, m in periods:
        amount_dec = income_map.get((y, m), Decimal("0.00"))
        month_name = MONTH_NAMES[m]
        period_str = f"{y:04d}-{m:02d}"
        formatted_str = format_currency(amount_dec, currency)
        monthly_income.append(
            MonthlyIncomePointResponse(
                month=month_name,
                year=y,
                period=period_str,
                amount=float(amount_dec),
                formattedAmount=formatted_str,
            )
        )

    return DashboardResponse(
        totalEarned=float(total_earned),
        totalOutstanding=float(total_outstanding),
        totalOverdue=float(total_overdue),
        totalInvoicesCount=total_invoices_count,
        overdueInvoicesCount=overdue_invoices_count,
        pendingInvoicesCount=pending_invoices_count,
        currency=currency,
        recentInvoices=recent_invoices,
        monthlyIncome=monthly_income,
    )
