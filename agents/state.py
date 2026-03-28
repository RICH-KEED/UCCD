from typing import TypedDict, Optional , List

class ComplaintState(TypedDict, total=False):
    complaint_id : str
    raw_text : str
    channel : str
    customer_id : str
    bot_slots : dict
    language_code : str

    complaint_type : Optional[str]
    product_code : Optional[str]
    intent : Optional[str]
    regulatory_obligation : Optional[str]
    type_confidence : Optional[float]

    emotion_arc : Optional[dict]
    severity_score : Optional[float]
    sla_tier : Optional[str]
    breach_probability : Optional[float]
    viral_risk_score : Optional[float]
    cluster_id : Optional[str]
    embedding : Optional[List[float]]

    pre_escalate : Optional[bool]
    escalation_reason : Optional[str]

    root_cause : Optional[str]
    root_cause_detected : Optional[bool]