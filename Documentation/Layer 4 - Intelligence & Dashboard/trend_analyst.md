# 📈 Trend Analyst Module

> **Layer:** 4 — Gen-AI Intelligence & Dashboard  
> **Type:** Gen-AI Agent (Background)  
> **Priority:** P1 (Phase 2)

---

## What It Does

Runs continuously in the background, analysing complaint streams to detect **emerging trends, complaint spikes, and systemic patterns** — and generates actionable reports automatically.

---

## Responsibilities

1. **Real-Time Complaint Spike Detection**
   - Monitor complaint volume in sliding time windows (1h, 6h, 24h)
   - Detect anomalies: "Billing complaints increased 340% in the last 4 hours"
   - Segment spikes by: product, region, channel, complaint type
   - Alert severity calibration: small spike in niche product vs massive spike in core product

2. **Product Signal Detection**
   - Correlate complaint patterns with product events:
     - App crash complaints spike → correlate with app release timeline
     - Service complaints in Region X → correlate with infrastructure changes
     - Billing complaints → correlate with pricing changes or invoice cycles
   - Auto-generate: "Probable trigger: Mobile app v4.2.0 released 6 hours ago"

3. **Emerging Theme Discovery**
   - Use complaint DNA clusters to find new/emerging complaint themes:
     - "New cluster detected: 23 complaints about 'dark mode readability' — not previously seen"
   - Track theme lifecycle: emerging → growing → peak → declining → resolved
   - Surface emerging themes to Product team before they become major issues

4. **Seasonal & Cyclical Pattern Analysis**
   - Identify recurring patterns:
     - "Billing complaints spike every 1st of the month (invoice day)"
     - "Delivery complaints increase 200% during holiday season"
     - "Support volume drops 30% on weekends but Monday backlog causes SLA breaches"
   - Enable proactive staffing and resource planning

5. **Auto-Generated Reports**
   - **Daily Digest:** Top complaint themes, volume trends, SLA health, notable escalations
   - **Weekly Analysis:** Trend changes, new clusters, root cause updates, CSAT trends
   - **Monthly Executive Report:** Strategic insights, competitor comparison, regulatory compliance status
   - Reports generated entirely by Gen-AI — human reviewable before distribution

6. **Competitive Intelligence**
   - From dark channel monitoring (Layer 1), compare:
     - Our complaint volume vs competitors (from social mentions, review sites)
     - Sentiment trends: are we improving faster than competitors?
     - Emerging issues affecting the entire industry

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Anomaly detection | Prophet + Isolation Forest | Time-series seasonality + point anomalies |
| Theme discovery | HDBSCAN on complaint DNA vectors | Dynamic cluster count, noise handling |
| Report generation | LLM (Gemini Pro) with structured data input | Natural language insights from data |
| Alerting | PagerDuty + Slack + Email | Multi-channel, severity-based routing |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Complaint stream (real-time), historical complaint data, product event feed, dark channel data |
| **Output** | Trend alerts, auto-generated reports, theme lifecycle tracking → Dashboard + Slack/Email |

---

## Metrics

- Spike detection lead time: < 30 minutes from onset
- Theme discovery accuracy (validated by analysts): > 80%
- Report generation time: < 5 minutes (daily), < 15 minutes (weekly)
- False alert rate: < 10%

---

## Dependencies

- Complaint DNA vectors (Layer 2)
- ClickHouse (analytics queries)
- LLM inference service (report generation)
- Alerting infrastructure
- Dark channel data (Layer 1)
