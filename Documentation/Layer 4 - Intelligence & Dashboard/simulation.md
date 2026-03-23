# 🧪 Simulation Sandbox Module

> **Layer:** 4 — Gen-AI Intelligence & Dashboard  
> **Type:** Gen-AI Agent (Novel — Differentiator)  
> **Priority:** P2 (Phase 3)

---

## What It Does

A **what-if sandbox** that lets managers test policy changes, resolution strategies, and staffing scenarios against historical complaint data before deploying them in production.

---

## Responsibilities

1. **What-If Scenario Modelling**
   - Simulate the impact of changes before implementing them:
     - "What if we reduce refund approval threshold from $100 to $50?"
     - "What if we add 3 agents to the billing team?"
     - "What if we change the SLA for social media complaints from 4h to 2h?"
   - Run simulations against historical complaint data (last 6–12 months)
   - Output: predicted impact on CSAT, SLA compliance, cost, agent workload

2. **Policy Testing**
   - Before deploying a new complaint handling policy:
     - Replay historical complaints through the new policy engine
     - Compare outcomes: would complaints have been handled better or worse?
     - Identify edge cases where the new policy fails
   - Example: "New auto-refund policy would have resolved 340 complaints automatically but would have over-refunded 12 cases worth $2,400"

3. **Resolution Strategy A/B Testing**
   - Test different resolution approaches:
     - Strategy A: Immediate refund → CSAT 4.6, cost $45/complaint
     - Strategy B: Apology + credit → CSAT 4.1, cost $20/complaint
     - Strategy C: Callback + personalised resolution → CSAT 4.8, cost $30/complaint
   - Run controlled experiments in production with performance tracking

4. **Staffing Scenario Planning**
   - Model staffing configurations:
     - "With current staff, what's the max complaint volume we can handle within SLA?"
     - "If we lose 2 agents, which complaint types will breach SLA first?"
     - "What's the optimal team size for the upcoming holiday season?"
   - Uses: historical volume patterns, Trend Analyst predictions, agent skill data

5. **Outcome Prediction**
   - For any individual complaint, predict likely outcome under different strategies:
     - "If we offer a full refund now, 85% chance of resolution + CSAT 4.5"
     - "If we escalate to technical team, 90% chance of resolution but takes 3 more days"
   - Helps agents make informed decisions, not gut-feel choices

6. **Crisis Simulation**
   - Simulate crisis scenarios:
     - "Product recall: 10,000 complaints in 48 hours — can our system handle it?"
     - "Data breach: regulatory complaints from 3 jurisdictions — what's our staffing need?"
   - Output: resource requirements, estimated cost, SLA breach predictions, communication plan

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Simulation engine | Discrete event simulation (SimPy / custom) | Model complex complaint flows with timing |
| Data replay | Historical complaint database (anonymised) | Real-world scenarios, not synthetic |
| Scenario UI | Interactive dashboard with sliders/inputs | Non-technical users can run simulations |
| Outcome prediction | Causal inference models (DoWhy) | Understand cause-and-effect, not just correlation |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Scenario parameters, historical complaint data, staffing data, policy configurations |
| **Output** | Simulation results (predicted KPIs), scenario comparisons, recommendations → Dashboard |

---

## Metrics

- Simulation prediction accuracy (vs actual outcomes): > 80%
- Simulation runtime: < 30 seconds for 6-month replay
- User adoption (managers running simulations/month): > 10 simulations
- Policy deployment success rate (simulated then deployed): > 90%

---

## Dependencies

- Historical complaint data warehouse (ClickHouse)
- SLA Engine (policy simulation)
- Cognitive Load Manager (staffing simulation)
- Trend Analyst (volume predictions)
- Causal inference framework
