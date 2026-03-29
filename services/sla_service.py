import redis
import os
from datetime import datetime, timedelta,timezone
from api.websocket import manager
import asyncio


REDIS_URL = os.getenv('REDIS_URL')
r = redis.from_url(REDIS_URL, decode_responses=True)

IST = timezone(timedelta(hours=5, minutes=30))

TIER_HOURS = {
    "REGULATORY" : 5,
    "HIGH" : 24,
    "MEDIUM" : 48,
    "NORMAL" : 72
}

def set_sla_timer(complaint_id: str, sla_tier: str):

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
            "50%": meta["alert_50"],
            "75%": meta["alert_75"],
            "90%": meta["alert_90"]
        },
    }


def fire_sla_alert(complaint_id: str, alert_type: str):
    loop = asyncio.get_event_loop()
    loop.create_task(manager.broadcast({
        "type": "sla_alert",
        "alert_type": alert_type,
        "complaint_id": complaint_id
    }))


def clear_sla(complaint_id: str):
    r.delete(f"sla:{complaint_id}")
    r.delete(f"sla_meta:{complaint_id}")


def check_all_sla():
    keys = r.keys("sla:*")
    for key in keys:
        complaint_id = key.split(":")[1]
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
        
        ttl = r.ttl(f"sla:{complaint_id}")
        if ttl == -2:
            fire_sla_alert(complaint_id, "BREACHED")
            clear_sla(complaint_id)