import os
import pickle
import logging
from agents.state import ComplaintState
from api.db.session import get_db
from api.models.complaint import Complaint
from agents.utils import groq_chat_completion

logger = logging.getLogger(__name__)

TIER_HOURS = {
    "REGULATORY": 5,
    "HIGH": 24,
    "MEDIUM": 48,
    "NORMAL": 72
}


def _load_trained_model():
    model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                              "ml", "violation_predictor.pkl")
    try:
        if os.path.exists(model_path):
            with open(model_path, "rb") as f:
                return pickle.load(f)
    except Exception:
        logger.warning("Failed to load trained SLA model, falling back to heuristic")
    return None


def _compute_breach_probability_heuristic(severity_score: float, queue_size: int,
                                           sla_hours: int) -> float:
    queue_factor = min(queue_size / 20.0, 1.0)
    sla_factor = 1.0 - (sla_hours / 72.0)
    probability = (0.4 * severity_score) + (0.4 * queue_factor) + (0.2 * sla_factor)
    return min(max(probability, 0.0), 1.0)


def _compute_breach_probability_ml(model, severity_score: float, queue_size: int,
                                    sla_hours: int, regulatory_flag: bool,
                                    vip_customer: bool) -> float:
    import datetime
    features = [[
        severity_score,
        3,
        sla_hours,
        queue_size,
        1 if regulatory_flag else 0,
        1 if vip_customer else 0,
        1,
        datetime.datetime.now().hour,
    ]]
    try:
        prob = model.predict_proba(features)[0]
        breach_idx = 1 if len(prob) > 1 else 0
        return float(prob[breach_idx])
    except Exception:
        return _compute_breach_probability_heuristic(severity_score, queue_size, sla_hours)


def run_escalation(state: ComplaintState) -> dict:
    severity_score = state.get("severity_score", 0.5)
    sla_tier = state.get("sla_tier", "NORMAL")
    sla_hours = TIER_HOURS.get(sla_tier, 72)

    regulatory_flag = state.get("regulatory_flag", False)
    vip_customer = state.get("vip_customer", False)

    try:
        db = next(get_db())
        try:
            queue_size = db.query(Complaint).filter(
                Complaint.status.in_(["queued", "in_progress"])
            ).count()
        finally:
            db.close()
    except Exception:
        queue_size = 5

    trained_model = _load_trained_model()
    if trained_model is not None:
        breach_probability = _compute_breach_probability_ml(
            trained_model, severity_score, queue_size, sla_hours,
            regulatory_flag, vip_customer
        )
    else:
        breach_probability = _compute_breach_probability_heuristic(
            severity_score, queue_size, sla_hours
        )
    
    pre_escalate = False
    escalation_reason = None
    
    if breach_probability > 0.70:
        pre_escalate = True
        
        # Ask Groq Llama-3.1 to generate a concise, qualitative risk reason
        prompt = f"""You are a bank supervisor's risk monitoring assistant.
An incoming complaint has been flagged for PRE-ESCALATION (risk of breaching the SLA deadline).
Explain concisely (1-2 sentences) why this ticket is at risk.

Context:
- Complaint Raw Text snippet: "{state.get("raw_text", "")[:200]}"
- Calculated Severity Score: {severity_score:.2f}
- SLA Tier: {sla_tier} ({sla_hours} hours deadline)
- Current Active Queue Size: {queue_size} pending tickets
- Estimated Breach Probability: {breach_probability * 100:.0f}%

Your response must be a professional warning alert. Do not include markdown formatting or quotes.
Example response: High severity card fraud ticket under short 24-hour SLA. Immediate risk due to 18 active tickets in the queue."""

        try:
            chat_completion = groq_chat_completion(
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model="llama-3.1-8b-instant",
                max_tokens=100,
            )
            escalation_reason = chat_completion.choices[0].message.content.strip()
        except Exception as e:
            escalation_reason = f"High risk of SLA breach ({breach_probability*100:.0f}%) due to severity and queue volume."
            
        # Broadcast the prediction to the WebSocket supervisor channel
        from api.websocket import broadcast_violation_predicted
        try:
            broadcast_violation_predicted(str(state.get("complaint_id")), breach_probability, escalation_reason)
        except Exception as ws_err:
            logger.warning(f"Failed to broadcast violation_predicted: {ws_err}")
            
    return {
        "breach_probability": breach_probability,
        "pre_escalate": pre_escalate,
        "escalation_reason": escalation_reason
    }

if __name__ == "__main__":
    test_state = {
        "raw_text": "I can't access my net banking account and need to pay my monthly loan installment immediately!",
        "severity_score": 0.85,
        "sla_tier": "HIGH"
    }
    print(run_escalation(test_state))
