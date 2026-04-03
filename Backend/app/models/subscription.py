import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, Boolean, Numeric, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class SubscriptionPlan(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "subscription_plans"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    monthly_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    annual_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    features: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    subscriptions: Mapped[list["Subscription"]] = relationship(
        "Subscription", back_populates="plan"
    )

    __table_args__ = (Index("ix_plans_active_sort", "is_active", "sort_order"),)


class Subscription(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("subscription_plans.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    billing_cycle: Mapped[str] = mapped_column(String(10), nullable=False)
    payment_gateway: Mapped[str] = mapped_column(String(50), nullable=False, default="stripe")
    gateway_subscription_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True
    )
    current_period_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    current_period_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="subscriptions")
    plan: Mapped["SubscriptionPlan"] = relationship(
        "SubscriptionPlan", back_populates="subscriptions"
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment", back_populates="subscription", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_subscriptions_user_status", "user_id", "status"),
        Index("ix_subscriptions_period_end", "current_period_end"),
        Index("ix_subscriptions_gateway", "payment_gateway", "gateway_subscription_id"),
    )
