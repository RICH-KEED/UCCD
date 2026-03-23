# 🧬 Complaint DNA Module

> **Layer:** 2 — AI Triage Engine (Multi-Agent)  
> **Type:** AI Agent (Novel)  
> **Priority:** P0 (Core — Differentiator)

---

## What It Does

Creates a unique multi-dimensional "fingerprint" for every complaint — enabling semantic deduplication, clustering of related complaints, and pattern discovery that keyword matching cannot achieve.

---

## Responsibilities

1. **Complaint Embedding Generation**
   - Convert every complaint into a high-dimensional vector embedding that captures:
     - **What** — the topic and issue described
     - **How** — the emotional register and communication style
     - **When** — temporal context (time of day, day of week, proximity to events)
     - **Who** — customer segment, tenure, value tier
     - **Impact** — severity, financial exposure, regulatory risk
   - This composite embedding IS the "Complaint DNA"

2. **Semantic Deduplication**
   - Compare every new complaint's DNA against existing open complaints:
     - **Same customer + same issue + different channel:** Mark as DUPLICATE, merge
     - **Same customer + related issue:** Mark as RELATED, link
     - **Different customer + same root issue:** Mark as CLUSTER, group
   - Similarity threshold is configurable per dimension (strict for dedup, looser for clustering)
   - Cosine similarity + additional business rules (same customer? same product? same time window?)

3. **Complaint Clustering**
   - Continuously run clustering on open complaints to find emerging patterns:
     - "47 complaints in the last 6 hours all cluster around the same embedding region — something is happening"
   - Use HDBSCAN for dynamic cluster detection (no predefined k)
   - Alert when new clusters form above size threshold

4. **Cross-Channel Identity Resolution**
   - When the same customer complains via email AND Twitter, the DNA helps match them even if:
     - They used different email vs social handle
     - The complaint wording is completely different
     - One is detailed (email) and one is a one-liner (tweet)
   - Combines: customer identity matching + semantic similarity

5. **Temporal Pattern Detection**
   - Detect recurring complaint patterns:
     - "This customer complains about the same issue every billing cycle"
     - "Complaints about app crashes spike every Monday after the weekend deployment"
   - Feed patterns to the Trend Analyst (Layer 4)

6. **Output Publishing**
   - Enrich UCE with: `complaint_dna_vector`, `duplicate_of`, `related_complaints[]`, `cluster_id`
   - Publish to `complaints.classified` topic

---

## Technical Architecture

```
Input: complaint text + metadata
    ↓
[Embedding Model] → text-embedding-3-large / Gemini Embeddings
    ↓
[Metadata Encoder] → Encode non-text features (customer tier, product, timestamp)
    ↓
[DNA Fusion] → Concatenate text embedding + metadata embedding → Complaint DNA (1536+ dims)
    ↓
[Vector Search] → Query Pinecone/Weaviate for nearest neighbours
    ↓
[Business Rules] → Apply dedup/relate/cluster logic
    ↓
Output: dedup result + cluster assignment + related complaints
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Embedding model | text-embedding-3-large | Best quality for semantic similarity |
| Vector store | Pinecone (managed) or Weaviate (self-hosted) | Millisecond-level ANN search |
| Clustering | HDBSCAN | No need to predefine cluster count, handles noise |
| Dedup threshold | Cosine similarity > 0.92 (same customer) / > 0.85 (cross-customer) | Tuned to minimise false positives |
| DNA dimensions | 1536 (text) + 128 (metadata) = 1664 total | Rich enough for nuance, fast enough for search |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Classified UCE from Kafka |
| **Output** | DNA-enriched UCE with dedup/cluster results → Kafka |

---

## Metrics

- Duplicate detection precision: > 95%
- Duplicate detection recall: > 88%
- Cluster detection latency: < 15 minutes from pattern emergence to alert
- Vector search latency P95: < 50ms
- False merge rate: < 1%

---

## Dependencies

- Embedding model API
- Vector database (Pinecone / Weaviate)
- Customer identity resolution service
- Kafka consumer/producer
