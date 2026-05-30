from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from api.db.session import get_db
from api.models.complaint import Complaint
from api.auth import require_role
from api.models.user import User

router = APIRouter(prefix="/api/v1/pipeline", tags=["pipeline"])


@router.get("/recent")
def get_recent_pipeline_runs(
    limit: int = Query(default=20, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("AGENT", "SUPERVISOR", "COMPLIANCE")),
):
    complaints = (
        db.query(Complaint)
        .order_by(desc(Complaint.created_at))
        .limit(limit)
        .all()
    )

    return {
        "status": "success",
        "runs": [
            {
                "complaint_id": str(c.id),
                "raw_text": c.raw_text[:200] if c.raw_text else "",
                "channel": c.channel,
                "complaint_type": c.complaint_type,
                "type_confidence": c.type_confidence,
                "severity_score": c.severity_score,
                "sla_tier": c.sla_tier,
                "breach_probability": c.breach_probability,
                "emotion_arc": c.emotion_arc,
                "assigned_to": c.assigned_to,
                "ai_draft": c.ai_draft,
                "status": c.status,
                "detected_language": c.detected_language,
                "translation_status": c.translation_status,
                "escalation_reason": c.escalation_reason,
                "root_cause": c.root_cause,
                "cluster_id": c.cluster_id,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in complaints
        ],
    }


@router.get("/status/{complaint_id}")
def get_pipeline_status(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("AGENT", "SUPERVISOR", "COMPLIANCE")),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        return {"status": "error", "message": "Complaint not found"}

    return {
        "status": "success",
        "complaint_id": str(complaint.id),
        "pipeline_status": complaint.status,
        "complaint_type": complaint.complaint_type,
        "type_confidence": complaint.type_confidence,
        "product_code": complaint.product_code,
        "intent": complaint.intent,
        "regulatory_obligation": complaint.regulatory_obligation,
        "emotion_arc": complaint.emotion_arc,
        "severity_score": complaint.severity_score,
        "sla_tier": complaint.sla_tier,
        "priority_tier": complaint.priority_tier,
        "sla_deadline": complaint.sla_deadline.isoformat() if complaint.sla_deadline else None,
        "breach_probability": complaint.breach_probability,
        "viral_risk_score": complaint.viral_risk_score,
        "cluster_id": complaint.cluster_id,
        "root_cause": complaint.root_cause,
        "pre_escalate": complaint.pre_escalate,
        "escalation_reason": complaint.escalation_reason,
        "assigned_to": complaint.assigned_to,
        "ai_draft": complaint.ai_draft,
        "detected_language": complaint.detected_language,
        "translated_text": complaint.translated_text,
        "translation_status": complaint.translation_status,
        "created_at": complaint.created_at.isoformat() if complaint.created_at else None,
    }