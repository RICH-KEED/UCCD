import asyncio
import logging
from datetime import datetime, timezone, timedelta

from api.db.session import get_db
from api.models.complaint import Complaint
from api.websocket import manager
from services.cache import r

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))

REGULATORY_DEADLINES = {
    "RBI": 30,
    "Ombudsman": 30,
    "SEBI": 21,
    "IRDAI": 15,
    "RBI-BCSBI": 45,
}


def _deadline_hours(obligation: str) -> int:
    for prefix, hours in REGULATORY_DEADLINES.items():
        if obligation.lower().startswith(prefix.lower()):
            return hours
    return 7 * 24


def set_regulatory_timer(complaint_id: str, obligation: str) -> dict:
    hours = _deadline_hours(obligation)
    deadline = datetime.now(IST) + timedelta(hours=hours)

    r.setex(f"reg:{complaint_id}", hours * 3600, obligation)
    r.hset(f"reg_meta:{complaint_id}", mapping={
        "deadline": deadline.isoformat(),
        "obligation": obligation,
        "total_hours": str(hours),
        "alert_warning": "0",
        "alert_critical": "0",
    })

    return {
        "complaint_id": complaint_id,
        "obligation": obligation,
        "deadline": deadline.isoformat(),
        "total_hours": hours,
    }


def get_regulatory_status(complaint_id: str) -> dict | None:
    obligation = r.get(f"reg:{complaint_id}")
    if obligation is None:
        return None

    meta = r.hgetall(f"reg_meta:{complaint_id}")
    if not meta:
        return None

    deadline = datetime.fromisoformat(meta["deadline"])
    now = datetime.now(IST)

    time_remaining = (deadline - now).total_seconds()
    total_hours = int(meta.get("total_hours", 168))
    total_seconds = total_hours * 3600
    percentage_elapsed = max(0, min(100, ((total_seconds - time_remaining) / total_seconds) * 100))

    return {
        "complaint_id": complaint_id,
        "obligation": obligation,
        "time_remaining_seconds": max(0, time_remaining),
        "percentage_elapsed": round(percentage_elapsed, 1),
        "deadline": deadline.isoformat(),
        "warning_breached": time_remaining <= total_seconds * 0.25,
        "critical_breached": time_remaining <= 0,
        "alerts": {
            "warning": meta.get("alert_warning", "0"),
            "critical": meta.get("alert_critical", "0"),
        },
    }


def fire_regulatory_alert(complaint_id: str, alert_type: str):
    payload = {
        "type": "regulatory_alert",
        "alert_type": alert_type,
        "complaint_id": complaint_id,
        "ts": datetime.now(IST).isoformat(),
    }
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(payload))
    except RuntimeError:
        asyncio.run(manager.broadcast(payload))


def clear_regulatory_timer(complaint_id: str):
    r.delete(f"reg:{complaint_id}")
    r.delete(f"reg_meta:{complaint_id}")


def check_all_regulatory():
    meta_keys = r.keys("reg_meta:*")
    for key in meta_keys:
        try:
            complaint_id = key.split(":", 1)[1]
        except IndexError:
            continue

        meta_key = f"reg_meta:{complaint_id}"

        # If the regulatory timer key has expired (does not exist), but metadata is still present:
        if not r.exists(f"reg:{complaint_id}"):
            alert_critical = r.hget(meta_key, "alert_critical")
            if alert_critical != "1":
                fire_regulatory_alert(complaint_id, "DEADLINE_BREACHED")
                r.hset(meta_key, "alert_critical", "1")
                _mark_regulatory_breached(complaint_id)
            clear_regulatory_timer(complaint_id)
            continue

        # If regulatory timer is still active, perform normal threshold alerts:
        status = get_regulatory_status(complaint_id)
        if status is None:
            continue

        if status["critical_breached"] and status["alerts"]["critical"] == "0":
            fire_regulatory_alert(complaint_id, "DEADLINE_BREACHED")
            r.hset(meta_key, "alert_critical", "1")
            _mark_regulatory_breached(complaint_id)

        elif status["warning_breached"] and status["alerts"]["warning"] == "0":
            fire_regulatory_alert(complaint_id, "DEADLINE_WARNING")
            r.hset(meta_key, "alert_warning", "1")


def _mark_regulatory_breached(complaint_id: str):
    try:
        db = next(get_db())
        try:
            complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
            if complaint is not None:
                complaint.regulatory_flag = True
                db.commit()
                logger.warning("Regulatory deadline breached for complaint %s", complaint_id)
        finally:
            db.close()
    except Exception:
        logger.exception("Failed to update regulatory breach for complaint %s", complaint_id)