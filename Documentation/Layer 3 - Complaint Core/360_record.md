# 🔵 360° Complaint Record Module

> **Layer:** 3 — 360° Complaint Core  
> **Type:** Core Data Service  
> **Priority:** P0 (Core)

---

## What It Does

The single source of truth for every complaint. Maintains the **complete lifecycle record** — from first signal to final resolution — with full communication history, customer context, cross-complaint linkages, and audit trail.

---

## Responsibilities

1. **Complaint Lifecycle Management**
   - Track every complaint through its lifecycle states:
     ```
     NEW → TRIAGED → ASSIGNED → IN_PROGRESS → PENDING_CUSTOMER → 
     RESOLVED → CLOSED → REOPENED
     ```
   - Every state transition recorded with timestamp, actor, and reason
   - Support custom lifecycle states per business unit

2. **Full Communication History**
   - Aggregate all messages across all channels into a single unified thread:
     - Email 1 (Day 1) → Tweet (Day 2) → Chat (Day 3) → Phone Call (Day 4) → Resolution Email (Day 5)
   - Present as a **chronological timeline** regardless of source channel
   - Include internal notes and agent-to-agent handoff comments

3. **Customer Profile Link**
   - Every complaint linked to a rich customer profile:
     - Account details, products/services owned, subscription tier
     - Full complaint history (all past complaints with outcomes)
     - Interaction history (non-complaint interactions too)
     - Customer health score and churn risk
   - **360° view** = complaint context + customer context in one screen

4. **Cross-Complaint Graph**
   - Visual graph showing complaint relationships:
     - Duplicates (merged complaints)
     - Related complaints (same root cause, same customer)
     - Escalation chain (complaint → supervisor review → executive review)
     - Cluster membership (part of a systemic issue group)
   - Powered by Complaint DNA linkages from Layer 2

5. **Audit Trail (Immutable)**
   - Every action on a complaint is logged immutably:
     - Who did what, when, why
     - AI actions logged separately: "AI classified as BILLING with 0.94 confidence"
     - Agent overrides logged: "Agent changed severity from MEDIUM to HIGH — reason: customer is VIP"
   - Audit trail exportable for regulatory review and internal compliance

6. **Attachment & Evidence Management**
   - Central store for all complaint-related attachments:
     - Customer uploads (screenshots, documents, photos)
     - Call recordings and transcripts
     - Internal investigation documents
   - Version tracking, access control, and retention policies

7. **Search & Retrieval**
   - Full-text search across all complaint content
   - Semantic search (via embeddings) for finding similar past complaints
   - Advanced filters: date range, channel, status, severity, agent, product, customer segment
   - Saved searches and custom views for agents and supervisors

---

## Data Model (Core Entities)

```
Complaint
├── complaint_id (PK)
├── customer_id (FK → Customer)
├── status, severity, priority
├── classifications (type, product, intent)
├── emotion_profile
├── sla_deadline
├── assigned_agent_id
├── created_at, updated_at, resolved_at, closed_at
│
├── Messages[] (chronological communication thread)
│   ├── message_id, channel, direction (inbound/outbound)
│   ├── content, sender, timestamp
│   └── attachments[]
│
├── Actions[] (audit trail)
│   ├── action_type, actor (human/AI), timestamp
│   └── details, reason
│
├── Relations[] (graph edges)
│   ├── related_complaint_id, relation_type
│   └── (duplicate_of, related_to, escalated_from, cluster_member)
│
└── SLA_Tracking
    ├── sla_policy_id, target_time
    ├── actual_time, breach_status
    └── escalation_history[]
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary DB | PostgreSQL | ACID transactions, proven reliability |
| Audit log | Append-only table with WORM protection | Regulatory compliance, tamper-proof |
| Search | Elasticsearch | Full-text + faceted search at scale |
| Graph relations | Neo4j (read) + PostgreSQL (write) | Graph queries for relations, PG for transactions |
| Caching | Redis | Frequently accessed complaint context |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Enriched UCEs from Kafka, agent actions, customer data |
| **Output** | 360° complaint records to Dashboard, search results, audit exports |

---

## SLA & Performance

- Complaint lookup: < 100ms (by ID), < 500ms (by search)
- Timeline rendering: < 200ms for full communication history
- Audit trail query: < 2 seconds for full complaint audit
- Data retention: configurable per policy (default 7 years)
- Uptime: 99.99%

---

## Dependencies

- PostgreSQL (primary store)
- Elasticsearch (search index)
- Neo4j (relationship graph)
- Redis (cache)
- Object Storage (attachments)
- Customer data service
