# 📋 Regulatory View Dashboard

> **Layer:** 4 — Gen-AI Intelligence & Dashboard  
> **Type:** Dashboard Surface (Compliance Team)  
> **Priority:** P1 (Phase 2)

---

## What It Does

The **compliance team's command center** — tracks all regulatory complaints, manages deadlines, builds regulatory reports, and ensures the organisation stays audit-ready at all times.

---

## Key Features

### 1. Regulatory Complaint Tracker
- Filtered view showing only regulatory-flagged complaints
- Group by: regulatory body (FCA, CFPB, GDPR, etc.), status, deadline proximity
- For each complaint:
  - Regulatory case reference number
  - Filing date, acknowledgment date, response deadline
  - Compliance status: ✅ On Track | ⚠️ At Risk | 🔴 Overdue
  - Assigned compliance officer
- Sort by: deadline urgency, regulatory body, financial exposure

### 2. Deadline Tracker
- Calendar view showing all regulatory deadlines:
  - This week, this month, this quarter
  - Color-coded by risk level
- Countdown timers for approaching deadlines
- Auto-escalation: 7 days before deadline → alert compliance officer; 3 days → alert head of compliance; 1 day → alert legal
- Historical compliance rate: "99.2% of deadlines met in last 12 months"

### 3. Report Builder
- Pre-built report templates for each regulator:
  - **FCA Complaints Return:** Biannual submission with complaint volumes, categories, outcomes, root causes
  - **CFPB Narrative:** Per-complaint narrative responses
  - **GDPR DSAR Tracker:** Data Subject Access Request status and response log
  - **Industry Ombudsman:** Case outcomes and escalation data
- One-click generation with data auto-populated from complaint records
- Draft review → compliance officer approval → submission tracking

### 4. Compliance Scorecard
- Overall compliance health at a glance:
  - Complaints resolved within regulatory SLA: 99.2%
  - Average response time by regulator
  - Outstanding regulatory complaints by status
  - Year-over-year trend: improving or degrading?
- Benchmark against regulatory expectations

### 5. Root Cause & Remediation Tracking
- For systemic issues identified by regulators:
  - Track remediation actions (what are we doing to fix the root cause?)
  - Evidence collection for regulatory submission
  - Progress tracking: % of remediation completed
- Link regulatory complaints to internal root causes (from Root Cause Agent)

### 6. Audit Preparation Center
- One-click audit package generation:
  - All complaints for the audit period
  - Full audit trail per complaint
  - Response timelines and SLA compliance proof
  - Root cause analysis and remediation evidence
  - Staff training records
- Export in formats required by each regulator (PDF, CSV, XML)

---

## UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ⚖️ Regulatory View    [FCA | CFPB | GDPR | All]           │
├─────────────────────┬────────────────────────────────────────┤
│  DEADLINE CALENDAR  │   COMPLAINT TRACKER                    │
│  ┌───────────────┐  │                                       │
│  │ Mar 2026      │  │   🔴 #R-2841 FCA — Due in 3 days     │
│  │ ○ ○ ● ○ ○ ○ ○│  │      Billing dispute | £4,200         │
│  │ ○ ○ ○ ○ ● ○ ○│  │      Status: Pending final response   │
│  │ ○ ○ ○ ○ ○ ○ ●│  │                                       │
│  └───────────────┘  │   ⚠️ #R-2856 GDPR — Due in 12 days  │
│                     │      DSAR request | Data export        │
│  SCORECARD          │      Status: Data collection in prog   │
│  ✅ SLA Met: 99.2%  │                                       │
│  📊 Open Cases: 14  │   ✅ #R-2820 CFPB — Resolved         │
│  ⚠️ At Risk: 3     │      Service complaint | $850 refund   │
│  🔴 Overdue: 0     │      Resolved: 12 days (SLA: 15)      │
├─────────────────────┴────────────────────────────────────────┤
│ [📊 Generate Report]  [📦 Audit Package]  [📁 Export Data]  │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Report engine | Jinja2 templates + PDF generation (WeasyPrint) | Exact format compliance per regulator |
| Calendar | FullCalendar.js | Rich interactive calendar with event management |
| Data export | Streaming CSV/XML/PDF generation | Handle large regulatory exports |
| Audit trail | Immutable append-only storage | Legal defensibility |

---

## Performance Targets

- Dashboard load: < 2 seconds
- Report generation: < 5 minutes for quarterly reports
- Audit package generation: < 30 minutes for 12-month audit
- Deadline alerts: zero missed (real-time monitoring)

---

## Dependencies

- Regulatory Compliance module (Layer 3)
- 360° Record (complaint details + audit trail)
- SLA Engine (regulatory timers)
- Report template library
- Notification service
