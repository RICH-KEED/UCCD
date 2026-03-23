# 🏛️ Regulator Connector Module

> **Layer:** 1 — Omnichannel Ingestion  
> **Protocol:** SFTP / Secure API  
> **Priority:** P1 (Phase 2)

---

## What It Does

Ingests complaints received through regulatory bodies, ombudsman offices, and government consumer protection portals — these arrive via secure file transfers or API integrations.

---

## Responsibilities

1. **Regulatory Body Integrations**
   - **Financial Regulators:** FCA (UK), CFPB (US), SEBI (India), BaFin (Germany)
   - **Consumer Protection:** Federal Trade Commission, National Consumer Helpline
   - **Industry Ombudsman:** Financial Ombudsman, Telecom Ombudsman, etc.
   - **Data Protection:** ICO (UK), CNIL (France), DPA complaints

2. **SFTP-Based Ingestion**
   - Monitor designated SFTP directories for new complaint files
   - Parse structured formats: XML, CSV, JSON, EDI (regulator-specific schemas)
   - Validate file integrity (checksum verification)
   - Archive processed files with audit trail

3. **Secure API Integration**
   - Connect to regulator portals via mutual TLS / API keys
   - Poll for new complaints assigned to the organisation
   - Handle regulator-specific response formats and acknowledgment protocols

4. **Regulatory Metadata Enrichment**
   - Tag with: regulatory_body, case_reference_number, filing_date, response_deadline
   - Map regulator complaint categories to internal taxonomy
   - Calculate **regulatory SLA countdown** (e.g., 8 weeks for FCA, 15 days for CFPB)
   - Flag **high-priority regulatory complaints** (e.g., repeat filers, systemic risk patterns)

5. **Acknowledgment & Response Tracking**
   - Auto-generate acknowledgment responses in regulator-required format
   - Track response deadlines and escalate automatically as deadline approaches
   - Maintain audit log of all communications with regulatory bodies

6. **Normalisation & Publishing**
   - Transform into Unified Complaint Envelope (UCE)
   - Include: channel=regulator, regulatory_body, case_ref, regulatory_deadline, compliance_flags
   - Publish to Kafka topic `complaints.ingested` with **priority=CRITICAL**

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SFTP library | `ssh2-sftp-client` (Node) / `paramiko` (Python) | Reliable, supports key-based auth |
| File parsing | Schema-per-regulator config | Each regulator has unique format |
| Security | Mutual TLS + encrypted at rest | Regulatory data requires highest security |
| Audit logging | Append-only log with tamper detection | Regulatory compliance requires full audit trail |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Complaint files via SFTP / API responses from regulatory portals |
| **Output** | UCE with regulatory metadata → Kafka topic `complaints.ingested` (priority: CRITICAL) |

---

## SLA & Performance

- SFTP polling interval: every 5 minutes
- File processing: < 2 minutes from detection to Kafka publish
- Zero tolerance for data loss — triple redundancy on regulatory complaints
- Full audit trail with timestamps for every action

---

## Compliance Requirements

- All regulatory complaint data must be encrypted at rest and in transit
- Retention: minimum 7 years (jurisdiction-dependent)
- Access restricted to authorised personnel only (RBAC enforced)
- Audit log must be immutable and exportable for regulatory inspection

---

## Dependencies

- SFTP server infrastructure
- Mutual TLS certificate management
- Kafka / Pulsar (Event Bus)
- Compliance & audit service
