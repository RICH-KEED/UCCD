import logging
from typing import Optional
from sqlalchemy.orm import Session
from api.models.complaint import Complaint

logger = logging.getLogger(__name__)

MAX_TICKETS_PER_AGENT = 15

AGENT_DEPARTMENT_MAP: dict[str, str] = {
    "rahul.sharma@unionbank.com": "loans",
    "priya.patel@unionbank.com": "technical",
    "amit.kumar@unionbank.com": "cards",
    "sneha.gupta@unionbank.com": "accounts",
    "vikram.singh@unionbank.com": "service",
}

COMPLAINT_TYPE_TO_DEPT: dict[str, str] = {
    "loans": "loans",
    "loan": "loans",
    "credit": "loans",
    "mortgage": "loans",
    "cards": "cards",
    "card": "cards",
    "debit card": "cards",
    "credit card": "cards",
    "technical": "technical",
    "upi": "technical",
    "netbanking": "technical",
    "app": "technical",
    "payment": "technical",
    "transaction": "technical",
    "accounts": "accounts",
    "account": "accounts",
    "kyc": "accounts",
    "deposit": "accounts",
    "balance": "accounts",
    "service": "service",
    "general": "service",
    "customer service": "service",
    "complaint": "service",
    "branch": "service",
    "billing": "cards",
    "fraud": "cards",
    "dispute": "cards",
    "refund": "technical",
    "failed": "technical",
    "otp": "technical",
    "beneficiary": "accounts",
    "fd": "loans",
    "fixed deposit": "loans",
    "pension": "accounts",
}


def compute_agent_load(db: Session) -> dict[str, int]:
    from sqlalchemy import func
    loads = {agent: 0 for agent in AGENT_DEPARTMENT_MAP.keys()}
    results = (
        db.query(Complaint.assigned_to, func.count(Complaint.id))
        .filter(Complaint.status != "resolved")
        .filter(Complaint.assigned_to.isnot(None))
        .group_by(Complaint.assigned_to)
        .all()
    )
    for agent, count in results:
        if agent:
            loads[agent] = count
    return loads


def get_department_for_complaint(complaint_type: Optional[str]) -> str:
    if not complaint_type:
        return "service"
    ct = complaint_type.lower().strip()
    return COMPLAINT_TYPE_TO_DEPT.get(ct, "service")


def get_best_agent(
    db: Session,
    complaint_type: Optional[str] = None,
    exclude_agent: Optional[str] = None,
) -> Optional[str]:
    loads = compute_agent_load(db)
    if not loads:
        return None

    target_dept = get_department_for_complaint(complaint_type)
    logger.info(f"Complaint type '{complaint_type}' → department '{target_dept}'")

    dept_agents = [email for email, dept in AGENT_DEPARTMENT_MAP.items() if dept == target_dept]
    other_agents = [email for email in loads if email not in AGENT_DEPARTMENT_MAP and email != "unassigned"]

    eligible: list[tuple[str, int]] = []

    if dept_agents:
        for agent in dept_agents:
            if exclude_agent and agent == exclude_agent:
                continue
            load = loads.get(agent, 0)
            if load < MAX_TICKETS_PER_AGENT:
                eligible.append((agent, load))

    if not eligible and other_agents:
        for agent in other_agents:
            if exclude_agent and agent == exclude_agent:
                continue
            load = loads.get(agent, 0)
            if load < MAX_TICKETS_PER_AGENT:
                eligible.append((agent, load))

    if not eligible:
        all_eligible = []
        for agent, load in loads.items():
            if agent == "unassigned":
                continue
            if exclude_agent and agent == exclude_agent:
                continue
            all_eligible.append((agent, load))
        if all_eligible:
            all_eligible.sort(key=lambda item: item[1])
            return all_eligible[0][0]
        return None

    eligible.sort(key=lambda item: item[1])
    return eligible[0][0]


def auto_assign_complaint(db: Session, complaint_id: str, complaint_type: Optional[str] = None) -> Optional[str]:
    agent = get_best_agent(db, complaint_type=complaint_type)
    if not agent:
        logger.warning(f"No eligible agent found for complaint {complaint_id}")
        return None

    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        return None

    if complaint.assigned_to:
        return complaint.assigned_to

    complaint.assigned_to = agent
    if complaint.status in ("queued", "new"):
        complaint.status = "new"
    db.commit()
    db.refresh(complaint)

    logger.info(f"Auto-assigned complaint {complaint_id} ({complaint_type}) → {agent} [{AGENT_DEPARTMENT_MAP.get(agent, 'general')}]")
    return agent


def check_agent_loads(db: Session) -> list[dict]:
    loads = compute_agent_load(db)
    overloaded = []
    for agent, count in loads.items():
        if agent == "unassigned":
            continue
        if count > MAX_TICKETS_PER_AGENT:
            overloaded.append({"agent": agent, "active_tickets": count, "capacity": MAX_TICKETS_PER_AGENT})
            from api.websocket import broadcast_agent_overload
            try:
                broadcast_agent_overload(agent, count, MAX_TICKETS_PER_AGENT)
            except Exception:
                pass
    return overloaded