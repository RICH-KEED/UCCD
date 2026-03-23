# ⏱️ SLA Engine Module

> **Layer:** 3 — 360° Complaint Core  
> **Type:** Core Service  
> **Priority:** P0 (Core)

---

## What It Does

Manages Service Level Agreements for every complaint — not just tracking deadlines, but **predicting breaches before they happen** and triggering proactive interventions.

---

## Responsibilities

1. **SLA Policy Engine**
   - Define and manage SLA policies based on:
     - Complaint severity (CRITICAL: 2h, HIGH: 8h, MEDIUM: 24h, LOW: 72h)
     - Channel (social media: faster SLA due to public visibility)
     - Customer tier (VIP customers: 50% faster SLA)
     - Regulatory requirements (FCA: 8 weeks, CFPB: 15 days)
   - Support multi-stage SLAs:
     - Time to first response
     - Time to resolution
     - Time to customer satisfaction confirmation

2. **Real-Time SLA Timers**
   - For every open complaint, maintain a live countdown timer
   - Timers pause when: waiting for customer response, on hold by customer request
   - Timers resume when: customer responds, hold period expires
   - Calculate: elapsed time, remaining time, % of SLA consumed

3. **Breach Prediction**
   - Use ML model to predict breaches 2+ hours in advance:
     - Factors: current queue depth, agent workload, complaint complexity score, historical resolution times for similar complaints
   - Predictions update in real-time as conditions change
   - Accuracy target: predict 90% of breaches at least 2 hours before they occur

4. **Proactive Alerts & Escalation**
   - Multi-tier alert system:
     - **🟡 Warning (75% SLA consumed):** Notify assigned agent
     - **🟠 Critical (90% SLA consumed):** Notify agent + supervisor
     - **🔴 Imminent Breach (95% SLA consumed):** Auto-escalate, reassign if needed
     - **⚫ Breached:** Log breach, notify management, update compliance records
   - Auto-actions on approaching breach:
     - Redistribute to less-loaded agent
     - Bump complaint priority in queue
     - Send customer proactive update: "We're still working on your case"

5. **SLA Reporting & Analytics**
   - Real-time SLA health dashboard:
     - Overall SLA compliance rate
     - Compliance rate by: team, agent, complaint type, channel, customer tier
     - Trend over time (improving or degrading?)
   - Breach analysis: which types of complaints breach most? Why?
   - Regulatory SLA compliance report (for auditors)

6. **Business Calendar Awareness**
   - SLA calculations respect business hours configuration
   - Support: multiple time zones, public holidays, custom business calendars
   - Option for 24/7 SLAs (critical complaints don't stop on weekends)

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Timer implementation | Redis sorted sets + background workers | Precise, scalable countdown timers |
| Breach prediction | LightGBM on real-time features | Calibrated probabilities, fast inference |
| Alert delivery | Multi-channel: in-app, email, Slack, PagerDuty | Reach agents wherever they are |
| Calendar engine | Custom or `business_time` library | Business hours calculation is tricky |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Complaint events (created, updated, responded), SLA policies, agent availability |
| **Output** | SLA status per complaint, alerts, breach predictions, compliance reports |

---

## Metrics

- SLA compliance rate target: > 97%
- Breach prediction accuracy (2h ahead): > 90%
- Alert-to-action time: < 5 minutes
- False alert rate: < 8%

---

## Dependencies

- Redis (timer management)
- ML model serving (breach prediction)
- Notification service (email, Slack, PagerDuty)
- Agent availability service
- 360° Record (complaint state)
