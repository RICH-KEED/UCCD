from fastapi import APIRouter,Query,HTTPException,Depends,BackgroundTasks
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from api.schemas.complaint import ComplaintCreate, ComplaintResponse, ComplaintListResponse
from agents.nlp_classifier import classify_complaint
from api.db.session import get_db
from sqlalchemy.orm import Session
from api.models.complaint import Complaint
from agents.orchestrator import run_pipeline

router = APIRouter(prefix="/api/v1/complaints", tags=["complaints"])

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


    background_tasks.add_task(
        run_pipeline,
        complaint_id=str(db_complaint.id),
        raw_text=complaint.raw_text,
        channel=complaint.channel,
        customer_id=complaint.customer_id,
        bot_slots=complaint.bot_slots,
        language_code=complaint.language_code
    )


    return db_complaint

@router.get("",response_model=ComplaintListResponse)
def list_complaints(
    status: str = Query(None, description="Filter by complaint status"),
    channel: str = Query(None, description="Filter by complaint channel"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Number of complaints per page"),
    db: Session = Depends(get_db)
):
    filtered_complaints = db.query(Complaint)
    if status:
        filtered_complaints = filtered_complaints.filter(Complaint.status == status)
    if channel:
        filtered_complaints = filtered_complaints.filter(Complaint.channel == channel)

    start = (page - 1) * limit
    end = start + limit
    return {
        "total": filtered_complaints.count(),
        "page": page,
        "limit": limit,
        "complaints": filtered_complaints.offset(start).limit(limit).all(),
    }

@router.get("/{complaint_id}",response_model=ComplaintResponse)
def get_complaint(complaint_id: str, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint