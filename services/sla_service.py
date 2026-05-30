from datetime import datetime, timedelta, timezone
from api.websocket import manager
import asyncio
from api.db.session import get_db
from api.models.complaint import Complaint
from services.cache import r

IST = timezone(timedelta(hours=5, minutes=30))

TIER_HOURS = {
    "REGULATORY" : 5,
    "HIGH" : 24,
    "MEDIUM" : 48,
    "NORMAL" : 72
}

def set_sla_timer(complaint_id: str, sla_tier: str):
    if sla_tier not in TIER_HOURS:
        raise ValueError(f"Invalid SLA tier '{sla_tier}'. Must be one of: {list(TIER_HOURS.keys())}")

    hour = TIER_HOURS.get(sla_tier, 72)
    deadline = datetime.now(IST) + timedelta(hours=hour)

    r.setex(f"sla:{complaint_id}",hour*3600, sla_tier)

    r.hset(f"sla_meta:{complaint_id}", mapping={
        "deadline": deadline.isoformat(),
        "tier": sla_tier,
        "alert_50": "0",
        "alert_75": "0",
        "alert_90": "0"
    })

def get_sla_status(complaint_id: str):
    sla_tier = r.get(f"sla:{complaint_id}")
    if sla_tier is None:
        return None

    meta = r.hgetall(f"sla_meta:{complaint_id}")
    deadline = datetime.fromisoformat(meta["deadline"])
    now = datetime.now(IST)

    time_remaining = (deadline - now).total_seconds()
    total_time = TIER_HOURS.get(sla_tier, 72) * 3600
    percentage_elapsed = ((total_time - time_remaining) / total_time) * 100

    return {
        "sla_tier": sla_tier,
        "time_remaining": time_remaining,
        "percentage_elapsed": percentage_elapsed,
        "deadline": deadline.isoformat(),
        "alerts": {
            "50%": meta.get("alert_50", "0"),
            "75%": meta.get("alert_75", "0"),
            "90%": meta.get("alert_90", "0")
        },
    }


def fire_sla_alert(complaint_id: str, alert_type: str):
    payload = {
        "type": "sla_alert",
        "alert_type": alert_type,
        "complaint_id": complaint_id,
        "ts": datetime.now(IST).isoformat(),
    }
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(payload))
    except RuntimeError:
        asyncio.run(manager.broadcast(payload))


def clear_sla(complaint_id: str):
    r.delete(f"sla:{complaint_id}")
    r.delete(f"sla_meta:{complaint_id}")


def check_all_sla():
    meta_keys = r.keys("sla_meta:*")
    for key in meta_keys:
        try:
            complaint_id = key.split(":")[1]
        except IndexError:
            continue

        # If the SLA timer key has expired (does not exist), but metadata is still present:
        if not r.exists(f"sla:{complaint_id}"):
            try:
                db = next(get_db())
                try:
                    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
                    if complaint is not None and not complaint.sla_breached:
                        complaint.sla_breached = True
                        if complaint.status != "resolved":
                            complaint.status = "escalated"
                        db.commit()
                        fire_sla_alert(complaint_id, "BREACHED")
                finally:
                    db.close()
            except Exception as e:
                # If DB is not configured/reachable, still allow clean up.
                logger.warning(f"Error handling SLA breach for {complaint_id} in DB: {e}")
                try:
                    fire_sla_alert(complaint_id, "BREACHED")
                except Exception:
                    pass
            clear_sla(complaint_id)
            continue

        # If SLA timer is still active, perform normal threshold alerts:
        status = get_sla_status(complaint_id)
        if status is None:
            continue

        percentage = status["percentage_elapsed"]
        if percentage >= 50 and status["alerts"]["50%"] == "0":
            fire_sla_alert(complaint_id, "50_PERCENT")
            r.hset(f"sla_meta:{complaint_id}", "alert_50", "1")

        if percentage >= 75 and status["alerts"]["75%"] == "0":
            fire_sla_alert(complaint_id, "75_PERCENT")
            r.hset(f"sla_meta:{complaint_id}", "alert_75", "1")

        if percentage >= 90 and status["alerts"]["90%"] == "0":
            fire_sla_alert(complaint_id, "90_PERCENT")
            r.hset(f"sla_meta:{complaint_id}", "alert_90", "1")