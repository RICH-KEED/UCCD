# 🌐 Portal / App Connector Module

> **Layer:** 1 — Omnichannel Ingestion  
> **Protocol:** REST / GraphQL APIs  
> **Priority:** P0 (Core)

---

## What It Does

Ingests complaints filed through the company's customer portal, mobile apps, and web forms via structured REST/GraphQL APIs.

---

## Responsibilities

1. **API Gateway for Direct Submissions**
   - Expose REST and GraphQL endpoints for complaint submission
   - Endpoints: `POST /api/v1/complaints`, `mutation createComplaint`
   - Accept structured data (form fields) + unstructured data (free text + attachments)
   - API versioning for backward compatibility

2. **Portal Integration**
   - Customer self-service portal where authenticated users submit complaints
   - Auto-populate customer profile from session (name, account ID, products owned, past complaints)
   - Support complaint categories picked by customer (but AI will re-classify)
   - Allow file uploads (screenshots, invoices, receipts)

3. **Mobile App SDK**
   - Lightweight SDK for iOS/Android that enables in-app complaint submission
   - Auto-capture device info, app version, OS version, crash logs (if applicable)
   - Support annotated screenshots (customer circles the problem area)
   - Offline-capable: queue complaints locally, sync when connected

4. **Web Form Connector**
   - Parse submissions from embedded web forms (Typeform, Google Forms, custom HTML forms)
   - Webhook receivers for form submission events
   - Map form fields to UCE schema dynamically via configuration

5. **Customer Authentication & Context**
   - Validate JWT/session tokens to identify the customer
   - Auto-attach customer context: account tier, product subscriptions, open tickets
   - Support anonymous submissions (web forms) with optional email verification

6. **Normalisation & Publishing**
   - Transform into Unified Complaint Envelope (UCE)
   - Include: channel=portal/app, authenticated_customer_id, form_data, attachments, device_info
   - Publish to Kafka topic `complaints.ingested`

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API style | REST (primary) + GraphQL (portal) | REST for mobile simplicity, GraphQL for portal flexibility |
| Auth | JWT with refresh tokens | Stateless, scalable auth |
| File uploads | Presigned URLs → S3 | Don't bloat API payloads; direct-to-storage uploads |
| Rate limiting | Redis-backed sliding window | Prevent abuse while allowing legitimate bursts |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Structured API requests from portal/app/web forms |
| **Output** | UCE with form data + attachments → Kafka topic `complaints.ingested` |

---

## SLA & Performance

- API response time: < 200ms (accept and queue)
- Support 5,000+ concurrent submissions during peak
- File upload limit: 25MB per attachment, 5 attachments per complaint
- 99.9% uptime SLA on submission endpoints

---

## Dependencies

- API Gateway (Kong / AWS API Gateway)
- Authentication service (Keycloak / Auth0)
- Object Storage (S3/GCS) for attachments
- Kafka / Pulsar (Event Bus)
- Customer data service (for profile enrichment)
