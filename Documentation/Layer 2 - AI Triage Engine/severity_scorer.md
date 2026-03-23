# ⚠️ Severity Scorer Module

> **Layer:** 2 — AI Triage Engine (Multi-Agent)  
> **Type:** AI Agent  
> **Priority:** P0 (Core)

---

## What It Does

Calculates a **composite severity score** for every complaint by combining multiple risk dimensions — not just "how angry is the customer" but "how much damage can this cause?"

---

## Responsibilities

1. **Multi-Dimensional Risk Scoring**
   - Evaluate every complaint across these risk dimensions:

   | Dimension | Weight | Factors |
   |-----------|--------|---------|
   | **Financial Risk** | 25% | Monetary value of complaint, customer lifetime value, potential refund/compensation |
   | **Regulatory Risk** | 25% | Is this a reportable complaint? GDPR/FCA/CFPB flags? Data breach? |
   | **Reputational Risk** | 20% | Public channel? Influencer? Media? Social amplification potential |
   | **Customer Risk** | 15% | Customer tenure, tier (VIP?), churn probability, recent complaint history |
   | **Operational Risk** | 15% | Systemic issue indicator? Affects multiple customers? Service outage related? |

2. **Severity Level Assignment**
   - Based on composite score (0–100), assign severity:
     - 🔴 **CRITICAL** (80–100): Immediate action required. Auto-escalates to management.
     - 🟠 **HIGH** (60–79): Priority queue. SLA = 2 hours.
     - 🟡 **MEDIUM** (30–59): Standard queue. SLA = 24 hours.
     - 🟢 **LOW** (0–29): Standard processing. SLA = 72 hours.

3. **Regulatory Flag Detection**
   - Auto-detect complaints that require regulatory reporting:
     - Financial conduct complaints (FCA/CFPB)
     - Data protection requests (GDPR Article 15/17)
     - Safety/health hazard reports
     - Accessibility complaints (ADA)
   - Flag with specific `regulatory_flags[]` for the Compliance Guardian

4. **VIP / High-Value Customer Detection**
   - Query customer profile for: lifetime value, tenure, account tier
   - VIP customers automatically get +20 severity boost
   - Recently churned-and-returned customers get +15 boost (fragile relationship)

5. **Escalation Recommendation**
   - Based on severity score, recommend escalation path:
     - CRITICAL → Direct to Team Lead + notification to VP Customer Success
     - HIGH → Senior Agent with specialisation match
     - MEDIUM → Available agent with skill match
     - LOW → Candidate for AI auto-resolution

6. **Output Publishing**
   - Enrich UCE with: `severity_score`, `severity_level`, `risk_breakdown`, `regulatory_flags[]`, `escalation_recommendation`
   - Publish to `complaints.classified` topic

---

## Scoring Formula

```
severity_score = 
    (financial_risk × 0.25) +
    (regulatory_risk × 0.25) +
    (reputational_risk × 0.20) +
    (customer_risk × 0.15) +
    (operational_risk × 0.15) +
    bonus_modifiers
```

**Bonus Modifiers:**
- +20 if customer is VIP tier
- +15 if complaint mentions legal action
- +10 if complaint is on public social media
- +25 if regulatory body is involved
- +10 for every prior unresolved complaint by same customer

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scoring approach | Hybrid: LLM extraction + rule-based scoring | LLM understands nuance; rules ensure consistency |
| Customer data | Real-time lookup from CRM | Severity depends on who is complaining |
| Regulatory detection | Pattern matching + LLM classification | Reg keywords have legal precision requirements |
| Escalation rules | Configurable rule engine | Business controls escalation paths, not AI alone |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Classified UCE + Customer profile data |
| **Output** | Severity-scored UCE → Kafka topic `complaints.classified` |

---

## Metrics

- Severity accuracy (vs human assessment): > 90%
- Regulatory flag precision: > 98% (cannot miss regulatory complaints)
- Regulatory flag recall: > 95%
- Latency P95: < 400ms (including CRM lookup)

---

## Dependencies

- LLM inference service
- CRM / Customer profile service
- Regulatory pattern library (maintained by compliance team)
- Kafka consumer/producer
