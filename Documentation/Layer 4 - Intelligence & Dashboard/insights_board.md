# 🔬 Insights Board Dashboard

> **Layer:** 4 — Gen-AI Intelligence & Dashboard  
> **Type:** Dashboard Surface (Executive + Analyst)  
> **Priority:** P1 (Phase 2)

---

## What It Does

The **strategic intelligence surface** — visualises complaint trends, root cause topology, and AI-generated insights for executives and analysts to understand the big picture and drive organisational change.

---

## Key Features

### 1. Trend Topology Map
- Interactive visualisation of complaint themes as a **network graph:**
  - Nodes = complaint themes (sized by volume)
  - Edges = relationships between themes (co-occurring, causally linked)
  - Color = sentiment (red = negative trending, green = improving)
  - Animation = pulsing nodes for growing themes, fading for declining
- Time slider: see how the topology evolved over days/weeks/months
- Click any node to drill into specific complaints

### 2. Root Cause Drill-Down
- **Waterfall Chart:** From complaint category → root cause → impacted product → customer segment
- Each level shows: complaint count, resolution rate, CSAT, financial impact
- AI-generated root cause summaries: "73% of delivery complaints in Q1 trace back to warehouse staffing shortage in Region North"
- Track: was the root cause fixed? Did complaints decrease after fix?

### 3. AI-Generated Insights Feed
- Continuous feed of AI-generated strategic insights:
  - "💡 App crash complaints have decreased 60% since mobile team deployed fix v4.2.1 on March 10"
  - "⚠️ New pattern: customers who experience 2+ service issues within 30 days have 4x higher churn rate"
  - "📊 Billing complaints peak on the 1st of each month — proactive outreach on invoice day could prevent 30%"
- Each insight linked to supporting data
- Thumbs up/down feedback loop to improve insight quality

### 4. Financial Impact Dashboard
- Quantify the business cost of complaints:
  - Total refunds/compensation issued (by type, product, region)
  - Estimated customer lifetime value at risk (from churn predictions)
  - Cost of complaint handling (agent time × hourly rate)
  - Litigation exposure (complaints with legal threats × estimated settlement)
- ROI calculator: "Fixing root cause X would save $240K/year in refunds"

### 5. Customer Satisfaction Analytics
- CSAT/NPS trends over time, segmented by:
  - Complaint type, product, channel, resolution path, agent
- Correlation analysis: which factors most influence CSAT?
- Predictive CSAT: for open complaints, predict likely satisfaction score

### 6. Competitor Benchmarking (from Dark Channels)
- Social sentiment comparison: our brand vs competitors
- Review score trends: App Store, Trustpilot, G2
- Complaint theme comparison: issues unique to us vs industry-wide

---

## Visualisation Types

| Chart | Purpose |
|-------|---------|
| Network graph | Complaint theme topology |
| Waterfall | Root cause drill-down |
| Heatmap | Volume by time × category |
| Sankey diagram | Customer journey from complaint to resolution |
| Time series | Trend lines for all KPIs |
| Bubble chart | Theme size × sentiment × growth rate |
| Treemap | Financial impact by category |

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Visualisation library | D3.js + Recharts | D3 for custom viz, Recharts for standard charts |
| Network graph | vis.js / Cytoscape.js | Interactive graph with physics simulation |
| Analytics DB | ClickHouse | Fast OLAP queries on complaint analytics |
| Insight generation | LLM (Gemini Pro) with structured data context | Natural language insights from data |

---

## Performance Targets

- Dashboard load: < 3 seconds
- Chart rendering: < 1 second per chart
- Time-range queries: < 2 seconds for 12-month range
- Insight generation: pre-computed, displayed instantly

---

## Dependencies

- Trend Analyst (trend data, patterns)
- Root Cause Agent (causal relationships)
- ClickHouse (analytics store)
- Knowledge Graph (Neo4j)
- Dark channel data (competitor intelligence)
- LLM inference (insight generation)
