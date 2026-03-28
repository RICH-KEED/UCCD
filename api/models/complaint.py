import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from api.db.session import Base

IST = timezone(timedelta(hours=5, minutes=30))

class Complaint(Base):
    __tablename__ = "complaints"

    # Identity
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(String, nullable=False, index=True)
    channel = Column(String, nullable=False)
    source_ref = Column(String, nullable=True)

    # Content
    raw_text = Column(Text, nullable=False)
    language_code = Column(String, nullable=True)
    voice_transcript = Column(JSONB, nullable=True)
    attachments = Column(JSONB, nullable=True)
    bot_slots = Column(JSONB, nullable=True)
    

    # AI-filled (all nullable, agents fill these later)
    complaint_type = Column(String, nullable=True)
    type_confidence = Column(Float, nullable=True)
    product_code = Column(String, nullable=True)
    intent = Column(String, nullable=True)
    regulatory_obligation = Column(String, nullable=True)
    severity_score = Column(Float, nullable=True)
    sla_tier = Column(String, nullable=True)
    emotion_arc = Column(JSONB, nullable=True)
    cluster_id = Column(String, nullable=True)
    breach_probability = Column(Float, nullable=True)
    ai_draft = Column(Text, nullable=True)
    root_cause = Column(String, nullable=True)

    # Flags
    regulatory_flag = Column(Boolean, default=False, nullable=False)
    vip_customer = Column(Boolean, default=False, nullable=False)
    viral_risk_score = Column(Float, nullable=True)

    # Priority & SLA
    priority_tier = Column(Integer, default=4, nullable=False)
    sla_deadline = Column(DateTime(timezone=True), nullable=True)
    sla_breached = Column(Boolean, default=False)

    # Workflow
    status = Column(String, default="queued", nullable=False)
    assigned_to = Column(String, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    pre_escalate = Column(Boolean, default=False, nullable=True)
    escalation_reason = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(IST))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(IST), onupdate=lambda: datetime.now(IST))
    resolved_at = Column(DateTime(timezone=True), nullable=True)

