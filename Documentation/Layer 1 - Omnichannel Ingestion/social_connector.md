# 📱 Social Media Connector Module

> **Layer:** 1 — Omnichannel Ingestion  
> **Protocol:** Twitter/X API, Meta (Facebook/Instagram) API, LinkedIn API  
> **Priority:** P0 (Core)

---

## What It Does

Monitors and ingests customer complaints from social media platforms — public mentions, DMs, comments, and reviews — in real-time.

---

## Responsibilities

1. **Platform Integrations**
   - **Twitter/X:** Stream API for @mentions, keyword tracking, DM webhooks
   - **Facebook:** Page Conversations API for comments, messages, and reviews
   - **Instagram:** Messaging API for DMs, comment webhooks
   - **LinkedIn:** Organization API for company page comments and messages
   - **Google Business:** Review API for Google Maps/Business reviews

2. **Real-Time Stream Processing**
   - Use platform webhook/streaming APIs where available
   - Fallback to polling (rate-limit-aware) for platforms without push support
   - Handle API rate limits with exponential backoff and request queuing

3. **Social Context Extraction**
   - Extract: author handle, follower count, verification status, post URL, engagement metrics (likes, retweets, shares)
   - Calculate **amplification risk score** — a verified user with 100K followers complaining = higher risk
   - Detect conversation threads (Twitter thread, FB comment chains)

4. **Signal vs Noise Filtering**
   - Not every @mention is a complaint — use lightweight intent classifier to filter:
     - ✅ Complaints, issues, frustrations
     - ❌ General mentions, praise, spam, competitor mentions
   - Pass borderline cases for human review

5. **Dark Channel Monitoring (Proactive)**
   - Scrape Reddit (subreddits related to company/industry)
   - Monitor Trustpilot, G2, Capterra reviews
   - App Store / Play Store review monitoring
   - Hacker News / niche forum monitoring (configurable sources)

6. **Normalisation & Publishing**
   - Transform into Unified Complaint Envelope (UCE)
   - Enrich with: channel=social, platform, amplification_risk, public_vs_private
   - Publish to Kafka topic `complaints.ingested`

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Twitter integration | Twitter API v2 + Streaming | Real-time mention tracking |
| Reddit monitoring | Reddit API + PRAW library | Structured API access |
| Review monitoring | Custom scrapers + APIs | No unified review API exists |
| Rate limit handling | Token bucket + backoff | Comply with platform limits |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Social media posts, DMs, comments, reviews from platforms |
| **Output** | Unified Complaint Envelope → Kafka topic `complaints.ingested` |

---

## SLA & Performance

- Public mention ingestion: < 60 seconds from post to Kafka
- DM ingestion: < 30 seconds
- Dark channel scan frequency: every 15 minutes
- Must handle viral complaint scenarios (sudden spike of 1000+ mentions)

---

## Dependencies

- Platform API credentials and webhook configurations
- Kafka / Pulsar (Event Bus)
- Lightweight intent classifier (pre-trained model, runs at edge)
