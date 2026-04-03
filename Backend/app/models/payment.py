import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPrimaryKeyMixin


class Payment(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "payments"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    payment_gateway: Mapped[str] = mapped_column(String(50), nullable=False, default="stripe")
    gateway_payment_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True
    )
    gateway_invoice_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="payments")
    subscription: Mapped["Subscription | None"] = relationship(
        "Subscription", back_populates="payments"
    )

    __table_args__ = (
        Index("ix_payments_user", "user_id"),
        Index("ix_payments_user_status", "user_id", "status"),
        Index("ix_payments_subscription", "subscription_id"),
        Index("ix_payments_gateway", "payment_gateway", "gateway_payment_id"),
    )
