from agents.state import ComplaintState
from api.db.session import get_db
from api.models.complaint import Complaint

def run_root_cause(state: ComplaintState) -> dict:
    cluster_id = state.get("cluster_id")

    if cluster_id is None:
        return {}
    
    db = next(get_db())
    try:
        count = db.query(Complaint).filter(
            Complaint.cluster_id == cluster_id
        ).count()

        if count < 10:
            return {}
        else:
            from api.websocket import broadcast_cluster_spike
            try:
                broadcast_cluster_spike(str(cluster_id), count)
            except Exception:
                pass
            return {"root_cause": f"ROOT_{cluster_id}"}
    finally:
        db.close()