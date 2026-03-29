from langgraph.graph import StateGraph, START , END
from agents.state import ComplaintState
from agents.nlp_classifier import classify_complaint
from api.db.session import get_db
from api.models.complaint import Complaint
from datetime import datetime, timezone, timedelta
from agents.root_cause_agent import run_root_cause
from services.sla_service import set_sla_timer


IST = timezone(timedelta(hours=5, minutes=30))


def run_nlp(state:ComplaintState) -> dict:

    text = state["raw_text"]

    bot_slots = state.get("bot_slots", {})
    result = classify_complaint(text)
    return {
        "complaint_type": result["complaint_type"],
        "product_code": result["product_code"],
        "intent": result["intent"],
        "regulatory_obligation": result["regulatory_obligation"]  
    }


def run_emotion(state: ComplaintState) -> dict:
    return {} 

def run_dna(state: ComplaintState) -> dict:
    return {}  

def run_severity(state: ComplaintState) -> dict:
    return {}  

def run_escalation(state: ComplaintState) -> dict:
    return {}  


def merge_and_save(state:ComplaintState) -> dict:
    db = next(get_db())
    complaint = db.query(Complaint).filter(Complaint.id == state["complaint_id"]).first()
    if complaint is None:
        return {}
    complaint.complaint_type = state.get("complaint_type")
    complaint.product_code = state.get("product_code")
    complaint.intent = state.get("intent")
    complaint.regulatory_obligation = state.get("regulatory_obligation")
    
    complaint.emotion_arc = state.get("emotion_arc")
    complaint.severity_score = state.get("severity_score")
    complaint.sla_tier = state.get("sla_tier")
    complaint.breach_probability = state.get("breach_probability")
    complaint.viral_risk_score = state.get("viral_risk_score")
    complaint.cluster_id = state.get("cluster_id")

    complaint.pre_escalate = state.get("pre_escalate")
    complaint.escalation_reason = state.get("escalation_reason")

    complaint.root_cause = state.get("root_cause")

    complaint.type_confidence = state.get("type_confidence")
    complaint.updated_at = datetime.now(IST)

    db.commit()

    if complaint.sla_tier:
        set_sla_timer(complaint.id, complaint.sla_tier)
    return {}


graph = StateGraph(ComplaintState)

graph.add_node("nlp",run_nlp)
graph.add_node("emotion",run_emotion)
graph.add_node("dna",run_dna)
graph.add_node("severity",run_severity)
graph.add_node("escalation",run_escalation)
graph.add_node("root_cause",run_root_cause)
graph.add_node("merge_and_save",merge_and_save)



graph.add_edge(START, "nlp")
graph.add_edge(START,"emotion")
graph.add_edge(START,"dna")
graph.add_edge(START,"severity")
graph.add_edge(START,"escalation")
graph.add_edge(START,"root_cause")


graph.add_edge("nlp", "merge_and_save")
graph.add_edge("emotion", "merge_and_save")
graph.add_edge("dna", "merge_and_save")
graph.add_edge("severity", "merge_and_save")
graph.add_edge("escalation", "merge_and_save")
graph.add_edge("root_cause", "merge_and_save")

graph.add_edge("merge_and_save", END)

pipeline = graph.compile()

def run_pipeline(
        complaint_id: str,
        raw_text: str,
        channel: str,
        customer_id: str,
        bot_slots: dict = None,
        language_code: str = None
    ) -> ComplaintState:
    initial_state : ComplaintState = {
        "complaint_id": complaint_id,
        "raw_text": raw_text,
        "channel": channel,
        "customer_id": customer_id,
        "bot_slots": bot_slots or {},
        "language_code": language_code
    }
    return pipeline.invoke(initial_state)
