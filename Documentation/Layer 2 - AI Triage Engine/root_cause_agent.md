# 🔍 Root Cause Agent Module

> **Layer:** 2 — AI Triage Engine (Multi-Agent)  
> **Type:** AI Agent  
> **Priority:** P1 (Phase 2)

---

## What It Does

Acts as an investigator. Uses graph-based reasoning and anomaly detection to identify the **root cause** behind complaints — not just the symptoms customers describe, but the underlying systemic failures.

---

## Responsibilities

1. **Complaint-to-Cause Mapping**
   - For every complaint, reason about the root cause:
     - Customer says: "My payment failed" → Root cause: Payment gateway timeout in v3.2.1
     - Customer says: "I never got my order" → Root cause: Warehouse system outage on March 5th
   - Uses RAG over: incident logs, change logs, product release notes, system health data

2. **Graph-Based Causal Reasoning**
   - Maintain a **causal knowledge graph:**
     ```
     [Complaint Cluster: "App Crash"] --caused_by--> [Release v4.1.0]
     [Release v4.1.0] --introduced--> [Bug: Memory Leak in Chat Module]
     [Bug: Memory Leak] --affects--> [Product: Mobile App]
     [Product: Mobile App] --used_by--> [Customer Segment: Premium]
     ```
   - When new complaints arrive, traverse the graph to find existing known causes
   - When no known cause exists, flag for investigation and create a new causal hypothesis

3. **Anomaly Detection**
   - Monitor complaint streams for statistical anomalies:
     - Volume spike: 5x normal volume in 1-hour window
     - New cluster formation: complaints grouping around an unseen topic
     - Seasonality break: complaints at unusual times/patterns
   - Use time-series anomaly detection (Isolation Forest, Prophet anomaly mode)

4. **Cross-System Correlation**
   - Correlate complaints with external data sources:
     - **System Health:** Integrate with monitoring (Datadog, PagerDuty) — did an outage precede the complaint spike?
     - **Deployments:** Integrate with CI/CD — did a code release precede the complaints?
     - **Third-Party Status:** Monitor vendor status pages — is a dependency down?
     - **External Events:** Weather, holidays, news events that impact service

5. **Root Cause Reports**
   - Generate structured root cause analysis reports:
     - Affected complaints (count + IDs)
     - Identified root cause with confidence level
     - Timeline of events
     - Recommended fix (product/engineering action)
     - Similar past incidents and how they were resolved
   - Auto-distribute to relevant teams (Product, Engineering, Ops)

6. **Feedback Loop to Product**
   - Aggregate root causes into product improvement signals:
     - "Top 5 root causes this month: [list with complaint volumes]"
     - Track: was the root cause addressed? Did complaints decrease after fix?

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Knowledge graph | Neo4j | Flexible schema, powerful traversal queries |
| Anomaly detection | Isolation Forest + Prophet | Complementary: one for volume, one for seasonality |
| Causal reasoning | LLM with graph context (GraphRAG) | Combines structured knowledge with flexible reasoning |
| External integrations | Event-driven (webhooks from monitoring tools) | Real-time correlation |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Classified complaints + system health data + deployment logs + external events |
| **Output** | Root cause attribution on complaints + Root Cause Reports + Anomaly alerts |

---

## Metrics

- Root cause attribution accuracy: > 75%
- Anomaly detection lead time: complaints flagged within 30 min of spike onset
- False anomaly rate: < 5%
- Mean time to root cause identification: < 4 hours (vs current: 2 weeks)

---

## Dependencies

- Neo4j knowledge graph
- System monitoring integration (Datadog/PagerDuty APIs)
- CI/CD integration (GitHub/GitLab deployment events)
- LLM inference service
- Kafka consumer/producer
