import threading
from uuid import uuid4
from datetime import datetime, timezone

from api.db.session import get_db
from api.models.complaint import Complaint
from agents.orchestrator import run_pipeline
from kafka.producer import publish_complaint
from api.websocket import broadcast_event


def create_complaint_internal(payload: dict) -> Complaint:
    db = next(get_db())
    try:
        complaint_id = uuid4()
        new_complaint = {
            "id": complaint_id,
            "customer_id": payload.get("customer_id", "unknown"),
            "channel": payload.get("channel", "unknown"),
            "source_ref": payload.get("source_ref"),
            "raw_text": payload.get("raw_text", ""),
            "bot_slots": payload.get("bot_slots"),
            "language_code": payload.get("language_code"),
            "customer_name": payload.get("customer_name"),
            "customer_email": payload.get("customer_email"),
            "customer_phone": payload.get("customer_phone"),
            "account_number": payload.get("account_number"),
            "status": "queued",
            "sla_tier": None,
            "sla_deadline": None,
            "sla_breached": False,
            "complaint_type": None,
            "type_confidence": None,
            "product_code": None,
            "intent": None,
            "severity_score": None,
            "regulatory_obligation": None,
            "breach_probability": None,
            "assigned_to": None,
            "ai_draft": None,
            "cluster_id": None,
            "root_cause": None,
            "created_at": datetime.now(timezone.utc),
            "resolved_at": None,
        }
        db_complaint = Complaint(**new_complaint)
        db.add(db_complaint)
        db.commit()
        db.refresh(db_complaint)

        complaint_id_str = str(db_complaint.id)

        complaint_payload = {
            "complaint_id": complaint_id_str,
            "raw_text": payload.get("raw_text", ""),
            "channel": payload.get("channel", "unknown"),
            "customer_id": payload.get("customer_id", "unknown"),
            "bot_slots": payload.get("bot_slots"),
            "language_code": payload.get("language_code"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            publish_complaint(complaint_payload, topic="complaints.inbound", key=complaint_id_str)
        except Exception:
            pass

        try:
            broadcast_event({
                "type": "complaint_created",
                "ts": datetime.now(timezone.utc).isoformat(),
                "complaint_id": complaint_id_str,
                "status": "queued",
                "channel": db_complaint.channel,
                "customer_id": db_complaint.customer_id,
                "raw_text": db_complaint.raw_text,
            })
        except Exception:
            pass

        threading.Thread(
            target=run_pipeline,
            kwargs={
                "complaint_id": complaint_id_str,
                "raw_text": payload.get("raw_text", ""),
                "channel": payload.get("channel", "unknown"),
                "customer_id": payload.get("customer_id", "unknown"),
                "bot_slots": payload.get("bot_slots"),
                "language_code": payload.get("language_code"),
            },
            daemon=True,
        ).start()

        return db_complaint
    finally:
        db.close()