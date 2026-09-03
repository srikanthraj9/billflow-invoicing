import logging
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard import get_dashboard_stats

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/stats",
    response_model=DashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated dashboard statistics and analytics",
)
def get_dashboard_stats_endpoint(
    months: int = Query(6, ge=1, le=24, description="Number of historical months for income trend (1-24)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardResponse:
    """
    Returns aggregated KPIs, recent invoices, and monthly income points for the authenticated merchant:
    - Strictly scoped to current_user.id
    - Calculates dynamic effective overdue status
    - Guaranteed unbroken timeline for requested historical months
    - Sanitizes internal exceptions into HTTP 500
    """
    try:
        return get_dashboard_stats(db=db, user_id=current_user.id, months=months)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error fetching dashboard statistics for user %s: %s", current_user.id, e)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard statistics",
        )
