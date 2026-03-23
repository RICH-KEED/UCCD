# 📧 Email Connector Module

> **Layer:** 1 — Omnichannel Ingestion  
> **Protocol:** IMAP / SMTP  
> **Priority:** P0 (Core)

---

## What It Does

Connects to customer-facing email inboxes (support@, complaints@, feedback@) and ingests every incoming email as a complaint signal in real-time.

---

## Responsibilities

1. **Inbox Polling & Webhook Listener**
   - Connect via IMAP IDLE for real-time push notifications on new mail
   - Fallback to periodic IMAP polling (configurable interval)
   - Support OAuth2 for Gmail/Outlook365 and app passwords for legacy servers

2. **Email Parsing**
   - Extract: subject, body (plain + HTML), sender, CC/BCC, timestamps, message-ID, thread references (`In-Reply-To`, `References` headers)
   - Strip email signatures, disclaimers, and quoted reply chains — isolate the *new content* only
   - Parse inline images and attachments (PDFs, screenshots, documents)

3. **Thread Reconstruction**
   - Use `Message-ID` / `In-Reply-To` headers to reconstruct full email threads
   - Map thread to an existing complaint if one exists, otherwise create a new complaint envelope

4. **Attachment Processing**
   - Extract text from PDF/DOCX attachments using OCR (Tesseract) or document parsing
   - Pass images to the Vision pipeline (Layer 2) for context extraction
   - Store attachments in object storage (S3/GCS) with references in the complaint envelope

5. **Normalisation**
   - Transform raw email into the **Unified Complaint Envelope (UCE)** schema
   - Enrich with metadata: channel=email, priority_hints (e.g., subject contains "URGENT"), language detection

6. **Publish to Event Bus**
   - Push the normalised UCE to Kafka/Pulsar topic `complaints.ingested`
   - Include idempotency key (Message-ID) to prevent duplicate processing

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| IMAP vs POP3 | IMAP | Need server-side state, threading, and selective sync |
| Polling vs Push | IMAP IDLE (push) | Near real-time ingestion without polling overhead |
| Email parsing library | `mailparser` (Node) or `email.parser` (Python) | Battle-tested, handles edge cases |
| Signature stripping | `talon` library | Best-in-class email signature detection |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Raw email (MIME format) from mailbox |
| **Output** | Unified Complaint Envelope → Kafka topic `complaints.ingested` |

---

## SLA & Performance

- Ingestion latency: < 30 seconds from email arrival to Kafka publish
- Must handle 10,000+ emails/hour at peak
- Zero data loss — at-least-once delivery guarantee

---

## Dependencies

- Kafka / Pulsar (Event Bus)
- Object Storage (S3/GCS) for attachments
- Unified Complaint Envelope schema definition
