from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.db.session import get_db
from api.models.complaint import Complaint

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db)):
    total = db.query(Complaint).count()
    open_count = db.query(Complaint).filter(Complaint.status != "resolved").count()
    escalated = db.query(Complaint).filter(Complaint.status == "escalated").count()
    breached = db.query(Complaint).filter(Complaint.sla_breached.is_(True)).count()
    queued = db.query(Complaint).filter(Complaint.status == "queued").count()
    in_progress = db.query(Complaint).filter(Complaint.status == "in_progress").count()

    return {
        "total": total,
        "open": open_count,
        "queued": queued,
        "in_progress": in_progress,
        "escalated": escalated,
        "breached": breached,
    }

