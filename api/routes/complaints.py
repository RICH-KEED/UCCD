from fastapi import APIRouter,Query,HTTPException,Depends,BackgroundTasks
from uuid import uuid4
from datetime import datetime, timezone
from typing import Optional
from api.schemas.complaint import ComplaintCreate, ComplaintResponse, ComplaintListResponse, StatusUpdate
from api.db.session import get_db
from sqlalchemy.orm import Session 
from sqlalchemy import or_
from api.models.complaint import Complaint
from agents.orchestrator import run_pipeline
from services.sla_service import get_sla_status, clear_sla
from api.websocket import broadcast_event
from pydantic import BaseModel
from services.draft_service import generate_draft
from api.auth import require_role
from api.models.user import User
from kafka.producer import publish_complaint

class RespondResolveRequest(BaseModel):
    response_text: str

router = APIRouter(prefix="/api/v1/complaints", tags=["complaints"])

def find_complaint(complaint_id: str, db: Session):
    import uuid
    from sqlalchemy import cast, String
    try:
        uuid.UUID(complaint_id)
        return db.query(Complaint).filter(Complaint.id == complaint_id).first()
    except ValueError:
        return db.query(Complaint).filter(cast(Complaint.id, String).like(f"{complaint_id}%")).first()

@router.post("",response_model=ComplaintResponse,status_code=201,)
def create_complaint(complaint: ComplaintCreate,background_tasks: BackgroundTasks,db: Session=Depends(get_db)):
    new_complaint = {
        "id": uuid4(),
        **complaint.model_dump(),
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

    complaint_id = str(db_complaint.id)
    complaint_payload = {
        "complaint_id": complaint_id,
        "raw_text": complaint.raw_text,
        "channel": complaint.channel,
        "customer_id": complaint.customer_id,
        "bot_slots": complaint.bot_slots,
        "language_code": complaint.language_code,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    background_tasks.add_task(
        publish_complaint,
        complaint_payload,
        topic="complaints.inbound",
        key=complaint_id,
    )

    background_tasks.add_task(
        broadcast_event,
        {
            "type": "complaint_created",
            "ts": datetime.now(timezone.utc).isoformat(),
            "complaint_id": complaint_id,
            "status": db_complaint.status,
            "channel": db_complaint.channel,
            "customer_id": db_complaint.customer_id,
        },
    )

    background_tasks.add_task(
        run_pipeline,
        complaint_id=complaint_id,
        raw_text=complaint.raw_text,
        channel=complaint.channel,
        customer_id=complaint.customer_id,
        bot_slots=complaint.bot_slots,
        language_code=complaint.language_code
    )


    return db_complaint

@router.get("",response_model=ComplaintListResponse)
def list_complaints(
    status: Optional[str] = Query(None, description="Filter by complaint status"),
    channel: Optional[str] = Query(None, description="Filter by complaint channel"),
    assigned_to: Optional[str] = Query(None, description="Filter by assigned agent"),
    regulatory_flag: Optional[bool] = Query(None, description="Filter by regulatory flag"),
    priority_tier: Optional[int] = Query(None, ge=1, le=5, description="Filter by priority tier"),
    sla_tier: Optional[str] = Query(None, description="Filter by SLA tier"),
    customer_id: Optional[str] = Query(None, min_length=1, description="Filter by customer ID"),
    search: Optional[str] = Query(None, min_length=1, description="Search customer, text, type, intent, product, or cluster"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Number of complaints per page"),
    db: Session = Depends(get_db)
):
    filtered_complaints = db.query(Complaint)
    if status:
        filtered_complaints = filtered_complaints.filter(Complaint.status == status)
    if channel:
        filtered_complaints = filtered_complaints.filter(Complaint.channel == channel)
    if assigned_to:
        filtered_complaints = filtered_complaints.filter(Complaint.assigned_to == assigned_to)
    if regulatory_flag is not None:
        filtered_complaints = filtered_complaints.filter(Complaint.regulatory_flag.is_(regulatory_flag))
    if priority_tier is not None:
        filtered_complaints = filtered_complaints.filter(Complaint.priority_tier == priority_tier)
    if sla_tier:
        filtered_complaints = filtered_complaints.filter(Complaint.sla_tier == sla_tier)
    if customer_id:
        filtered_complaints = filtered_complaints.filter(Complaint.customer_id == customer_id.strip())
    if search:
        term = f"%{search.strip()}%"
        filtered_complaints = filtered_complaints.filter(
            or_(
                Complaint.customer_id.ilike(term),
                Complaint.raw_text.ilike(term),
                Complaint.complaint_type.ilike(term),
                Complaint.intent.ilike(term),
                Complaint.product_code.ilike(term),
                Complaint.cluster_id.ilike(term),
                Complaint.customer_name.ilike(term),
                Complaint.customer_email.ilike(term),
                Complaint.customer_phone.ilike(term),
                Complaint.account_number.ilike(term),
                Complaint.source_ref.ilike(term),
            )
        )

    start = (page - 1) * limit
    filtered_complaints = filtered_complaints.order_by(Complaint.created_at.desc())
    return {
        "total": filtered_complaints.count(),
        "page": page,
        "limit": limit,
        "complaints": filtered_complaints.offset(start).limit(limit).all(),
    }

@router.get("/escalations",response_model=ComplaintListResponse)
def list_escalated_complaints(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Number of complaints per page"),
    db: Session = Depends(get_db)
):
    filtered_complaints = db.query(Complaint).filter(
    or_(
        Complaint.status == "escalated",
        (Complaint.breach_probability > 0.70) & (Complaint.status != "resolved")
    )
).order_by(Complaint.breach_probability.desc()) 

    start = (page - 1) * limit
    return {
        "total": filtered_complaints.count(),
        "page": page,
        "limit": limit,
        "complaints": filtered_complaints.offset(start).limit(limit).all(),
    }

@router.get("/{complaint_id}",response_model=ComplaintResponse)
def get_complaint(complaint_id: str, db: Session = Depends(get_db)):
    complaint = find_complaint(complaint_id, db)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

@router.get("/{complaint_id}/sla")
def get_complaint_sla(complaint_id: str):
    status = get_sla_status(complaint_id)
    if status is None:
        raise HTTPException(status_code=404, detail="SLA not set for this complaint")
    return status

VALID_TRANSITIONS = {
    "queued": ["new", "escalated"],
    "new": ["in_progress", "escalated"],
    "in_progress": ["resolved", "escalated"],
    "resolved": [],
    "escalated": []
    }

@router.put("/{complaint_id}/status",response_model=ComplaintResponse)
def update_complaint_status(
    complaint_id:str,
    body: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("AGENT", "SUPERVISOR")),
):
    
    complaint = find_complaint(complaint_id, db)
    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if body.new_status not in VALID_TRANSITIONS.get(complaint.status, []):
        raise HTTPException(status_code=422, detail=f"Invalid status transition from {complaint.status} to {body.new_status}")

    old_status = complaint.status
    complaint.status = body.new_status
    db.commit()
    db.refresh(complaint)
    broadcast_event(
        {
            "type": "complaint_status_changed",
            "ts": datetime.now(timezone.utc).isoformat(),
            "complaint_id": str(complaint.id),
            "from": old_status,
            "to": complaint.status,
        }
    )
    return complaint

@router.put("/{complaint_id}/assign",response_model=ComplaintResponse)
def assign_complaint(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("AGENT")),
):
    complaint = find_complaint(complaint_id, db)
    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if complaint.status not in ("queued", "new"):
        raise HTTPException(status_code=422, detail=f"Cannot assign complaint in status {complaint.status}")
    if complaint.assigned_to and complaint.assigned_to != current_user.email:
        raise HTTPException(status_code=409, detail="Complaint already assigned to another agent")

    old_status = complaint.status
    complaint.assigned_to = current_user.email
    if complaint.status == "queued":
        complaint.status = "new"
    db.commit()
    db.refresh(complaint)

    broadcast_event(
        {
            "type": "complaint_assigned",
            "ts": datetime.now(timezone.utc).isoformat(),
            "complaint_id": str(complaint.id),
            "agent": current_user.email,
            "from": old_status,
            "to": complaint.status,
        }
    )
    return complaint

@router.get("/{complaint_id}/draft")
async def generate_response_draft(complaint_id: str, tone: str = Query("apologetic"), db: Session = Depends(get_db)):
    complaint = find_complaint(complaint_id, db)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.ai_draft = await generate_draft(complaint, tone=tone)

    db.commit()
    db.refresh(complaint)
    
    return {"complaint_id": complaint_id, "tone": tone, "draft": complaint.ai_draft}

@router.post("/{complaint_id}/respond")
def respond_and_resolve_complaint(
    complaint_id: str,
    body: RespondResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("AGENT", "SUPERVISOR")),
):
    complaint = find_complaint(complaint_id, db)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    old_status = complaint.status
    complaint.status = "resolved"
    complaint.resolution_notes = body.response_text
    complaint.resolved_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(complaint)
    
    # Send WebSocket broadcast
    broadcast_event({
        "type": "complaint_status_changed",
        "ts": datetime.now(timezone.utc).isoformat(),
        "complaint_id": str(complaint.id),
        "from": old_status,
        "to": "resolved"
    })
    
    # Close SLA if present in Redis
    try:
        clear_sla(str(complaint.id))
    except Exception:
        pass

    # Closed-loop reply through channel registry
    channel_sent = False
    try:
        from services.channels import send_response_sync
        channel_sent = send_response_sync(
            complaint,
            f"Your ticket {complaint.id} has been resolved.\n\nResolution Notes:\n{body.response_text}"
        )
    except Exception as e:
        print(f"Exception sending channel reply: {e}")

    return {
        "status": "success",
        "message": "Complaint resolved successfully",
        "complaint_id": complaint_id,
        "channel_sent": channel_sent
    }


class UserDetailsUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    account_number: Optional[str] = None


class DetailsRequestResponse(BaseModel):
    message: str
    translated_message: Optional[str] = None


@router.post("/{complaint_id}/request-details", response_model=DetailsRequestResponse)
async def request_user_details(
    complaint_id: str,
    db: Session = Depends(get_db),
):
    complaint = find_complaint(complaint_id, db)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.awaiting_details = True
    complaint.details_requested_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(complaint)

    default_message = (
        "Thank you for reaching out. To help us process your complaint faster, "
        "could you please provide your full name, email address, phone number, and account number?"
    )

    try:
        from services.translation_service import SarvamTranslationService, TranslationStage
        svc = SarvamTranslationService()
        target_lang = complaint.detected_language or complaint.language_code or "en-IN"
        result = await svc.translate(
            text=default_message,
            stage=TranslationStage.PREVIEW,
            target_lang=target_lang,
        )
        return {
            "message": default_message,
            "translated_message": result.get("translated_text"),
        }
    except Exception:
        return {"message": default_message}


@router.put("/{complaint_id}/details", response_model=ComplaintResponse)
async def update_user_details(
    complaint_id: str,
    body: UserDetailsUpdate,
    db: Session = Depends(get_db),
):
    complaint = find_complaint(complaint_id, db)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if body.customer_name is not None:
        complaint.customer_name = body.customer_name
    if body.customer_email is not None:
        complaint.customer_email = body.customer_email
    if body.customer_phone is not None:
        complaint.customer_phone = body.customer_phone
    if body.account_number is not None:
        complaint.account_number = body.account_number

    complaint.awaiting_details = False

    db.commit()
    db.refresh(complaint)

    broadcast_event({
        "type": "complaint_details_updated",
        "ts": datetime.now(timezone.utc).isoformat(),
        "complaint_id": str(complaint.id),
    })

    return complaint

