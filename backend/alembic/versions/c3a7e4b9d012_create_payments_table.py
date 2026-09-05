"""Create payments table with indexes and constraints

Revision ID: c3a7e4b9d012
Revises: bb3f22575463
Create Date: 2026-09-05 17:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3a7e4b9d012'
down_revision: Union[str, Sequence[str], None] = 'bb3f22575463'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'payments',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('invoice_id', sa.Uuid(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('method', sa.String(length=30), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('reference', sa.String(length=100), nullable=False),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], name='fk_payments_invoice_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='pk_payments'),
        sa.UniqueConstraint('reference', name='uq_payment_reference'),
        sa.CheckConstraint('amount > 0', name='ck_payment_amount_positive'),
        sa.CheckConstraint("method IN ('UPI', 'Card', 'Net Banking')", name='ck_payment_method'),
        sa.CheckConstraint("status IN ('completed', 'pending', 'failed')", name='ck_payment_status'),
    )
    op.create_index('payments_invoice_id_idx', 'payments', ['invoice_id'], unique=False)
    op.create_index('payments_status_idx', 'payments', ['status'], unique=False)
    op.create_index('payments_paid_at_idx', 'payments', ['paid_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('payments_paid_at_idx', table_name='payments')
    op.drop_index('payments_status_idx', table_name='payments')
    op.drop_index('payments_invoice_id_idx', table_name='payments')
    op.drop_table('payments')
