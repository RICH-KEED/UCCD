# 🧠 Knowledge Store Module

> **Layer:** 3 — 360° Complaint Core  
> **Type:** Core Data Service  
> **Priority:** P0 (Core)

---

## What It Does

The persistent memory of the entire system. Stores complaint DNA vectors, knowledge graph relationships, resolution patterns, and enables intelligent retrieval for all AI agents.

---

## Responsibilities

1. **Graph Database (Relationship Store)**
   - Store and query the **Complaint Knowledge Graph**:
     - Complaint ↔ Complaint relationships (duplicate, related, caused-by)
     - Complaint ↔ Root Cause relationships
     - Complaint ↔ Resolution relationships (which resolution was applied, outcome)
     - Customer ↔ Complaint history
     - Product ↔ Complaint patterns
   - Enable graph traversal queries:
     - "Find all complaints related to root cause X"
     - "What is the resolution success rate for this complaint type + customer segment?"
     - "Show the complaint network for this customer"

2. **Complaint DNA Vector Store**
   - Persist all complaint DNA vectors (from Layer 2 Complaint DNA module)
   - Enable fast Approximate Nearest Neighbour (ANN) search:
     - "Find the 10 most similar past complaints to this new one"
     - "What cluster does this complaint belong to?"
   - Support filtered vector search: similar complaints + same product + same severity

3. **Resolution Knowledge Base**
   - Store resolution templates, strategies, and their effectiveness metrics
   - Enable RAG (Retrieval Augmented Generation) for the Draft Response module:
     - "Retrieve the 5 most effective resolutions for billing complaints from VIP customers"
   - Auto-curate: flag outdated resolutions, surface high-performing new approaches

4. **Institutional Knowledge Capture**
   - When senior agents resolve complex complaints exceptionally well:
     - Extract the resolution pattern
     - Generalise it into a reusable knowledge article
     - Make it available to all agents via the Resolution Graph
   - Track knowledge freshness — auto-flag articles not reviewed in 6 months

5. **Linkage Store (Cross-Reference Index)**
   - Maintain cross-references between:
     - Complaints and external ticket IDs (Jira, Salesforce, ServiceNow)
     - Complaints and internal incident IDs
     - Complaints and regulatory case references
     - Customer identity across channels (email ↔ social handle ↔ phone number)

6. **Data Lifecycle Management**
   - Automated data retention policies:
     - Active complaints: hot storage (PostgreSQL + Redis)
     - Resolved (< 1 year): warm storage (PostgreSQL)
     - Archived (1–7 years): cold storage (S3 + ClickHouse for analytics)
   - GDPR right-to-erasure compliance: selective data deletion while preserving aggregate analytics

---

## Storage Architecture

```
┌──────────────────────────────────────────────┐
│              Knowledge Store                  │
│                                               │
│  ┌─────────────┐  ┌──────────────────────┐   │
│  │   Neo4j      │  │  Pinecone / Weaviate │   │
│  │  (Graph DB)  │  │  (Vector Store)      │   │
│  │  Relations   │  │  Complaint DNA       │   │
│  │  Causality   │  │  Semantic Search     │   │
│  └─────────────┘  └──────────────────────┘   │
│                                               │
│  ┌─────────────┐  ┌──────────────────────┐   │
│  │ PostgreSQL   │  │  Elasticsearch       │   │
│  │ (Primary     │  │  (Full-Text Search)  │   │
│  │  Records)    │  │  (Cross-References)  │   │
│  └─────────────┘  └──────────────────────┘   │
│                                               │
│  ┌─────────────┐  ┌──────────────────────┐   │
│  │   Redis      │  │  S3 / GCS            │   │
│  │  (Cache +    │  │  (Cold Archive +     │   │
│  │   Sessions)  │  │   Attachments)       │   │
│  └─────────────┘  └──────────────────────┘   │
└──────────────────────────────────────────────┘
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Graph DB | Neo4j | Best-in-class for relationship queries |
| Vector DB | Pinecone (managed) or Weaviate (self-hosted) | ANN search at scale |
| Primary DB | PostgreSQL | ACID, proven, rich ecosystem |
| Search | Elasticsearch | Full-text + faceted + aggregations |
| Cache | Redis | Sub-millisecond lookups |
| Cold storage | S3 + ClickHouse | Cost-effective archival + analytics |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Complaint records, DNA vectors, graph relationships, resolution outcomes |
| **Output** | Query results for AI agents, search results for dashboard, analytics data |

---

## SLA & Performance

- Graph query latency P95: < 100ms
- Vector search latency P95: < 50ms
- Full-text search latency P95: < 200ms
- Data write throughput: 10,000+ writes/second
- Availability: 99.99%

---

## Dependencies

- Neo4j cluster
- Pinecone / Weaviate cluster
- PostgreSQL cluster (shared with 360° Record)
- Elasticsearch cluster
- Redis cluster
- S3 / GCS for cold storage
