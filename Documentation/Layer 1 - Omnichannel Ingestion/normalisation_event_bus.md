# 🔄 Normalisation & Event Bus Module

> **Layer:** 1 — Omnichannel Ingestion  
> **Protocol:** Kafka / Pulsar  
> **Priority:** P0 (Core — Backbone)

---

## What It Does

The central nervous system of ingestion. Every connector publishes to this bus. It enforces a **Unified Complaint Envelope (UCE)** schema, guarantees delivery, and fans out events to all downstream consumers (Layer 2, 3, 4).

---

## Responsibilities

1. **Unified Complaint Envelope (UCE) Schema**
   ```
   {
     "complaint_id": "uuid",
     "channel": "email | social | voice | chat | portal | regulator",
     "platform": "gmail | twitter | whatsapp | ...",
     "ingested_at": "ISO-8601 timestamp",
     "customer": {
       "id": "optional — null if anonymous",
       "email": "optional",
       "phone": "optional",
       "name": "optional",
       "handle": "optional (social)"
     },
     "content": {
       "subject": "optional (email)",
       "body": "main complaint text",
       "summary": "optional (AI-generated for voice)",
       "language": "detected language code",
       "media": [ { "type": "image|pdf|audio", "url": "s3://..." } ]
     },
     "metadata": {
       "thread_id": "for conversation threading",
       "parent_message_id": "for reply chains",
       "amplification_risk": 0-100,
       "regulatory_body": "optional",
       "regulatory_deadline": "optional",
       "device_info": "optional (app)",
       "priority_hints": ["URGENT", "LEGAL", ...]
     },
     "idempotency_key": "channel-specific unique ID"
   }
   ```

2. **Schema Validation & Enforcement**
   - Every message published to the bus is validated against the UCE schema
   - Invalid messages are routed to a dead-letter queue (DLQ) for investigation
   - Schema registry (Confluent/Karapace) for versioned schema evolution

3. **Event Bus Topics**
   - `complaints.ingested` — raw normalised complaints (all connectors publish here)
   - `complaints.classified` — after Layer 2 AI triage
   - `complaints.enriched` — after context enrichment
   - `complaints.action` — resolution actions and responses
   - `complaints.dlq` — dead letter queue for failed messages

4. **Delivery Guarantees**
   - **At-least-once delivery** — consumers handle idempotency via `idempotency_key`
   - Configurable retention: 30 days default, 7 years for regulatory topics
   - Consumer group management for parallel processing with ordering guarantees per complaint_id

5. **Fan-Out to Consumers**
   - Layer 2 (AI Triage): All new complaints for classification
   - Layer 3 (Core): Persist to complaint store
   - Layer 4 (Intelligence): Feed into trend analysis pipeline
   - Dashboard: Real-time WebSocket push for live updates

6. **Monitoring & Observability**
   - Consumer lag monitoring — alert if any consumer falls behind
   - Throughput metrics per topic / per connector
   - DLQ size alerting — spikes indicate connector issues

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Message broker | Apache Kafka (primary) | Industry standard, proven at scale, excellent ecosystem |
| Schema registry | Confluent Schema Registry | Schema validation + evolution |
| Serialisation | Avro (schema-enforced) | Compact, schema-validated, backward compatible |
| Partitioning | By customer_id (hash) | Ensures ordering per customer |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Normalised UCE from all 6 connectors |
| **Output** | Fan-out to Layer 2, 3, 4 consumers via topic subscriptions |

---

## SLA & Performance

- End-to-end publish latency: < 50ms
- Throughput: 100,000+ messages/second
- Data retention: 30 days (default), 7 years (regulatory)
- 99.99% availability (multi-broker cluster with replication factor 3)
- Consumer lag alert threshold: > 1000 messages behind

---

## Dependencies

- Kafka cluster (3+ brokers, ZooKeeper or KRaft)
- Schema Registry
- Monitoring (Prometheus + Grafana / Kafka Manager)
- Dead Letter Queue consumer service
