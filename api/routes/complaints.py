from fastapi import APIRouter,Query,HTTPException
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from api.schemas.complaint import ComplaintCreate, ComplaintResponse, ComplaintListResponse
from agents.nlp_classifier import classify_complaint


router = APIRouter(prefix="/api/v1/complaints", tags=["complaints"])

MOCK_COMPLAINTS = []
for i in range(20):
    MOCK_COMPLAINTS.append({
        "id": uuid4(),
        "customer_id": f"CUST{1000 + i}",
        "channel": ["email", "social", "portal", "chat"][i % 4],
        "raw_text": f"Complaint number {i} about my account.",
        "status": ["queued", "open", "breached"][i % 3],
        "sla_tier": (i % 4) + 1,
        "sla_deadline": datetime.now(timezone.utc) + timedelta(hours=4 + i),
        "sla_breached": False,
        "regulatory_flag": i % 10 == 0,
        "vip_customer": False,
        "priority_tier": (i % 4) + 1,
        "source_ref": None,
        "complaint_type": ["billing", "fraud", "kyc", None][i % 4],
        "type_confidence": None,
        "product_code": None,
        "intent": None,
        "severity_score": None,
        "breach_probability": round(0.1 + (i % 9) * 0.09, 2),
        "assigned_to": f"agent_{(i % 3) + 1}",
        "ai_draft": None,
        "cluster_id": None,
        "root_cause": None,
        "created_at": datetime.now(timezone.utc) - timedelta(hours=i),
        "resolved_at": None,
    })

@router.post("",response_model=ComplaintResponse,status_code=201)
def create_complaint(complaint: ComplaintCreate):
    classification = classify_complaint(complaint.raw_text)
    new_complaint = {
        "id": uuid4(),
        **complaint.model_dump(),
        "status": "queued",
        "sla_tier": None,
        "sla_deadline": None,
        "sla_breached": False,
        "complaint_type": classification["complaint_type"],
        "type_confidence": None,
        "product_code": classification["product_code"],
        "intent": classification["intent"],
        "severity_score": None,
        "regulatory_obligation": classification["regulatory_obligation"],
        "breach_probability": None,
        "assigned_to": None,
        "ai_draft": None,
        "cluster_id": None,
        "root_cause": None,
        "created_at": datetime.now(timezone.utc),
        "resolved_at": None,
    }
    MOCK_COMPLAINTS.append(new_complaint)
    return new_complaint

@router.get("",response_model=ComplaintListResponse)
def list_complaints(
    status: str = Query(None, description="Filter by complaint status"),
    channel: str = Query(None, description="Filter by complaint channel"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Number of complaints per page"),
):
    filtered_complaints = MOCK_COMPLAINTS
    if status:
        filtered_complaints = [c for c in filtered_complaints if c["status"] == status]
    if channel:
        filtered_complaints = [c for c in filtered_complaints if c["channel"] == channel]

    start = (page - 1) * limit
    end = start + limit
    return {
        "total": len(filtered_complaints),
        "page": page,
        "limit": limit,
        "complaints": filtered_complaints[start:end],
    }

@router.get("/{complaint_id}",response_model=ComplaintResponse)
def get_complaint(complaint_id: str):
    for complaint in MOCK_COMPLAINTS:
        if str(complaint["id"]) == complaint_id:
            return complaint
    raise HTTPException(status_code=404, detail="Complaint not found")