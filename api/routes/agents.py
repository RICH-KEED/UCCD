from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from api.db.session import get_db
from api.models.complaint import Complaint
from api.auth import require_role
from api.models.user import User
from services.agent_service import compute_agent_load

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])

@router.get("/list")
def get_agents_list(db: Session = Depends(get_db)):
    """
    Public endpoint: returns all active agents for the login dropdown.
    Includes only agents who have at least one complaint assigned,
    plus all active agents so new agents can also log in.
    """
    agents = db.query(User).filter(
        User.role == "AGENT",
        User.is_active == True
    ).all()

    return {
        "status": "success",
        "agents": [
            {
                "email": a.email,
                "full_name": a.full_name,
                "user_id": str(a.id),
            }
            for a in agents
        ]
    }

@router.get("/load")
def get_agents_load(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SUPERVISOR", "COMPLIANCE")),
):
    """
    Retrieves current active queue load.
    Active loads are complaints that are not 'resolved'.
    Returns department distribution (complaint_type) and agent distribution (assigned_to).
    Delegates agent-load computation to agent_service.
    """
    dept_results = db.query(
        Complaint.complaint_type,
        func.count(Complaint.id)
    ).filter(
        Complaint.status != "resolved"
    ).group_by(
        Complaint.complaint_type
    ).all()

    departments = {}
    for dept, count in dept_results:
        dept_name = dept if dept else "unclassified"
        departments[dept_name] = count

    for expected_dept in ["fraud", "billing", "kyc", "loans", "cards", "service", "technical"]:
        if expected_dept not in departments:
            departments[expected_dept] = 0

    agents = compute_agent_load(db)

    for expected_agent in ["agent@example.com", "supervisor@example.com", "compliance@example.com"]:
        if expected_agent not in agents:
            agents[expected_agent] = 0

    return {
        "status": "success",
        "total_active_load": sum(departments.values()),
        "departments": departments,
        "agents": agents
    }
