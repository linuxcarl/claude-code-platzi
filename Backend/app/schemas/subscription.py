from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class PlanResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    monthly_price: float
    annual_price: float
    currency: str
    features: Optional[List[str]] = None
    model_config = {"from_attributes": True}


class SubscriptionCreate(BaseModel):
    plan_id: UUID
    billing_cycle: str = Field(..., pattern="^(monthly|annual)$")


class SubscriptionResponse(BaseModel):
    id: UUID
    plan: PlanResponse
    status: str
    billing_cycle: str
    current_period_start: datetime
    current_period_end: datetime
    canceled_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class PaymentHistoryItem(BaseModel):
    id: UUID
    amount: float
    currency: str
    status: str
    paid_at: Optional[datetime] = None
    created_at: datetime
    model_config = {"from_attributes": True}
