from pydantic import BaseModel, ConfigDict
from typing import Optional,List
from datetime import datetime
from uuid import UUID

class ComplaintCreate(BaseModel):
    customer_id: str 
    channel: str
    source_ref: Optional[str] = None
    raw_text: str
    regulatory_flag: Optional[bool] = False
    vip_customer: Optional[bool] = False
    priority_tier: Optional[int] = 4
    bot_slots: Optional[dict] = None
    language_code: Optional[str] = None

class ComplaintResponse(BaseModel):
    id: UUID
    status: str
    complaint_type: Optional[str] = None
    type_confidence: Optional[float] = None
    product_code: Optional[str]= None
    intent: Optional[str]= None
    severity_score: Optional[float] = None
    sla_tier: Optional[str] = None
    breach_probability: Optional[float] = None
    sla_deadline: Optional[datetime] = None
    sla_breached: bool = False
    assigned_to: Optional[str] = None
    ai_draft: Optional[str] = None
    cluster_id: Optional[str] = None
    root_cause: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    customer_id: str 
    channel: str
    source_ref: Optional[str] = None
    regulatory_obligation: Optional[str] = None
    raw_text: str
    regulatory_flag: Optional[bool] = False
    vip_customer: Optional[bool] = False
    priority_tier: Optional[int] = 4
    bot_slots: Optional[dict] = None
    language_code: Optional[str] = None
    viral_risk_score: Optional[float] = None
    emotion_arc: Optional[dict] = None
    escalation_reason: Optional[str] = None
    resolution_notes: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ComplaintListResponse(BaseModel):
    complaints: List[ComplaintResponse]
    total: int
    page: int
    limit: int

class StatusUpdate(BaseModel):
    new_status: str