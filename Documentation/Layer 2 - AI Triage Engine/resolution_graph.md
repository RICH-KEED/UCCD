# 🗺️ Resolution Graph Module

> **Layer:** 2 — AI Triage Engine (Multi-Agent)  
> **Type:** AI Agent  
> **Priority:** P0 (Core)

---

## What It Does

Maintains a graph of all known resolution paths and uses it to recommend the **Next Best Action (NBA)** for every complaint — not just a template, but a ranked strategy.

---

## Responsibilities

1. **Resolution Knowledge Graph**
   - Build and maintain a graph of resolution strategies:
     ```
     [Complaint Type: Billing Error]
       ├── [Resolution: Full Refund] → success_rate: 92%, avg_CSAT: 4.5, avg_cost: $45
       ├── [Resolution: Partial Credit] → success_rate: 78%, avg_CSAT: 3.8, avg_cost: $20
       ├── [Resolution: Explanation + Apology] → success_rate: 45%, avg_CSAT: 3.1, avg_cost: $0
       └── [Resolution: Escalate to Billing Team] → success_rate: 88%, avg_CSAT: 4.2, avg_cost: $15
     ```
   - Every resolution node tracks: success rate, CSAT impact, cost, time-to-resolve, re-open rate

2. **Next Best Action (NBA) Engine**
   - For each complaint, rank possible actions by a composite score:
     ```
     NBA_score = 
         (P(resolution) × 0.35) +
         (expected_CSAT × 0.25) +
         (cost_efficiency × 0.20) +
         (compliance_safety × 0.20)
     ```
   - Present top 3 recommendations to the agent with rationale
   - Account for customer-specific factors: VIP customers may warrant higher-cost resolutions

3. **Template Engine (Dynamic)**
   - Not static templates. Templates are **parametrised and personalised:**
     - Auto-fill: customer name, order details, specific issue, calculated compensation
     - Adjust tone based on Emotion Engine's empathy calibration score
     - Include regulatory-required language when compliance flags are present
   - Templates version-controlled and A/B tested

4. **Resolution Pathway Suggestions**
   - For complex complaints, suggest multi-step resolution paths:
     ```
     Step 1: Acknowledge + Apology (immediate)
     Step 2: Investigate root cause (within 24h)
     Step 3: Offer resolution options (within 48h)
     Step 4: Confirm resolution + follow-up (within 72h)
     ```
   - Each step has a template and action items

5. **Resolution Outcome Tracking**
   - Every resolution is tracked for outcomes:
     - Did the customer accept? What was the CSAT? Was the complaint re-opened?
   - Feed outcomes back into the Resolution Graph to update success rates
   - Bayesian updating: resolution confidence improves with more data

6. **Compliance-Safe Resolutions**
   - Filter out resolution options that violate policies or regulations
   - If complaint has regulatory flags → only show compliance-approved resolution paths
   - Audit trail for every resolution recommendation

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Graph store | Neo4j (shared with Root Cause Agent) | Flexible relationship modelling |
| NBA ranking | Multi-criteria decision analysis (MCDA) | Transparent, tunable scoring |
| Template engine | Handlebars/Mustache with LLM personalisation layer | Structure + creativity |
| A/B testing | Built-in experiment tracking | Continuously improve templates |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Classified + severity-scored UCE + customer profile |
| **Output** | NBA recommendations + personalised templates → Agent Dashboard |

---

## Metrics

- NBA acceptance rate by agents: > 65%
- Resolution success rate (NBA followed): > 85%
- Template personalisation quality (human rating): > 4/5
- Time saved per complaint (vs manual search): > 5 minutes

---

## Dependencies

- Neo4j knowledge graph
- LLM inference service (for template personalisation)
- Customer profile service
- Resolution outcome tracking service
- Kafka consumer/producer
