from typing import TypedDict, Optional , List
from datetime import datetime

class ComplaintState(TypedDict, total=False):
    complaint_id : str
    raw_text : str
    channel : str
    customer_id : str
    bot_slots : dict
    language_code : str
    pipeline_run_id : str

    complaint_type : str
    product_code : str
    intent : str
    regulatory_obligation : str
    type_confidence : float

    emotion_arc : dict
    severity_score : float
    sla_tier : str
    priority_tier : int
    sla_deadline : datetime
    breach_probability : float
    viral_risk_score : float
    cluster_id : str
    embedding : List[float]

    translated_text : str
    detected_language : str
    translation_status : str

    pre_escalate : bool
    escalation_reason : str

    root_cause : str
    root_cause_detected : bool