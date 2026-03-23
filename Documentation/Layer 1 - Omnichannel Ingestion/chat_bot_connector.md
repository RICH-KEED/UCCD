# 💬 Chat / Bot Connector Module

> **Layer:** 1 — Omnichannel Ingestion  
> **Protocol:** Webhook Streams  
> **Priority:** P0 (Core)

---

## What It Does

Ingests complaint conversations from live chat widgets, chatbot sessions, and messaging platforms (WhatsApp, Telegram, etc.) in real-time via webhook streams.

---

## Responsibilities

1. **Platform Integrations**
   - **Website Live Chat:** Intercom, Zendesk Chat, Freshchat, Crisp, Tawk.to
   - **WhatsApp Business API:** Meta Cloud API / BSPs (Twilio, Gupshup)
   - **Telegram Bot API:** Webhook-based message ingestion
   - **Custom Chatbots:** Generic webhook endpoint for proprietary bots
   - **In-App Chat SDKs:** Mobile app embedded chat (Sendbird, Stream)

2. **Real-Time Webhook Processing**
   - Expose a unified webhook endpoint that accepts events from all platforms
   - Platform-specific adapters normalise incoming payloads
   - Handle webhook verification, signature validation, and retry logic

3. **Conversation Assembly**
   - Chat messages arrive as individual events — assemble them into complete conversations
   - Detect conversation boundaries (session start, handoff from bot to human, session end)
   - Handle bot-to-human handoff signals: when a chatbot fails to resolve and escalates to a human agent, that's a strong complaint signal

4. **Bot Failure Detection**
   - If a customer interacted with a chatbot and the bot couldn't resolve the issue, flag this as a **bot-failed complaint**
   - Extract: what the bot tried, where it failed, customer frustration signals ("talk to a human", "useless bot")
   - This data feeds back into chatbot improvement

5. **Rich Media Handling**
   - Process images, videos, voice notes, documents shared in chat
   - Voice notes → STT pipeline (reuse Voice Connector's Whisper engine)
   - Images → Vision pipeline for context extraction

6. **Normalisation & Publishing**
   - Transform into Unified Complaint Envelope (UCE)
   - Include: channel=chat, platform, conversation_transcript, bot_interaction_log, media_attachments
   - Publish to Kafka topic `complaints.ingested`

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Webhook framework | Express.js / FastAPI with signature verification | Fast, extensible, secure |
| WhatsApp integration | Meta Cloud API (direct) | Avoid BSP dependency for core messaging |
| Conversation state | Redis-backed session store | Fast lookups, TTL-based cleanup |
| Message ordering | Event timestamp + sequence ID | Handle out-of-order webhook delivery |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Webhook events from chat platforms (message, session, handoff events) |
| **Output** | UCE with full conversation → Kafka topic `complaints.ingested` |

---

## SLA & Performance

- Message ingestion latency: < 5 seconds from customer send to Kafka
- Must handle 50,000+ messages/hour
- Conversation assembly delay: max 2 minutes after last message before auto-closing session
- Zero message loss — idempotent processing with dedup on message ID

---

## Dependencies

- Platform API credentials and webhook configurations
- Redis for conversation session state
- Kafka / Pulsar (Event Bus)
- Voice Connector (for voice note transcription)
