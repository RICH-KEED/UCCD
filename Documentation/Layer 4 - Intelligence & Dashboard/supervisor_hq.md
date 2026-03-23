# 👔 Supervisor HQ Dashboard

> **Layer:** 4 — Gen-AI Intelligence & Dashboard  
> **Type:** Dashboard Surface  
> **Priority:** P0 (Core)

---

## What It Does

The **command center for team leaders and supervisors** — real-time SLA heatmaps, escalation queue management, agent performance monitoring, and proactive intervention tools.

---

## Key Features

### 1. SLA Heatmap
- Real-time visual grid showing SLA health across all complaints:
  - Rows: agents / teams / complaint types
  - Columns: time buckets (last 1h, 4h, 24h)
  - Color: 🟢 healthy → 🟡 warning → 🔴 critical → ⚫ breached
- Drill-down: click any cell to see specific complaints at risk
- Trend overlay: is SLA health improving or degrading vs last week?

### 2. Escalation Queue
- All escalated and about-to-escalate complaints in one view
- For each escalation:
  - Root cause summary (AI-generated)
  - Customer context (tier, history, sentiment)
  - AI-recommended intervention
  - Time since escalation
- One-click actions: assign to self, reassign, override priority, approve resolution

### 3. Live Team Performance
- Real-time agent activity:
  - Who's online, who's on break, who's overloaded
  - Complaints per agent, resolution rate, average handle time
  - Burnout risk indicators (from Cognitive Load Manager)
- Compare: agent performance vs team average vs target

### 4. Queue Management
- Redistribute complaints between agents with drag-and-drop
- Bulk actions: reassign all complaints of a type, bulk-close resolved complaints
- Queue depth forecast: "At current rate, queue will be cleared by 6 PM" or "Queue will grow to 85 by end of shift"

### 5. Intervention Tools
- **Whisper Mode:** Send real-time guidance to an agent handling a difficult complaint (they see AI + supervisor suggestions)
- **Takeover:** Supervisor can take over a complaint from an agent
- **Coaching Notes:** Add private coaching notes to a complaint resolution for agent development

### 6. Shift Planning Integration
- Current shift status: who's on, who's next, gaps in coverage
- Predicted vs actual complaint volume this shift
- Alert: "Predicted 20% volume increase at 2 PM — consider extending Agent Mike's shift"

---

## UI Layout

```
┌───────────────────────────────────────────────────────────────┐
│  📊 Supervisor HQ    [Team: Billing]    [Shift: Morning]     │
├───────────────────────┬───────────────────────────────────────┤
│   SLA HEATMAP         │   ESCALATION QUEUE                    │
│   ┌───────────────┐   │                                      │
│   │ 🟢🟢🟡🟡🟢  │   │   ⚠️ #7821 — VIP Billing Dispute    │
│   │ 🟢🟡🔴🟡🟢  │   │      ⏱️ 45m in queue | 😡 Angry     │
│   │ 🟢🟢🟢🟡🟡  │   │      💡 Recommend: Full refund       │
│   │ 🟡🟡🟢🟢🟢  │   │                                      │
│   └───────────────┘   │   ⚠️ #7834 — Regulatory Complaint   │
│                       │      ⏱️ 2h in queue | ⚖️ FCA        │
│   TEAM STATUS         │      💡 Recommend: Assign to Legal    │
│   Sarah  ████░░ 80%   │                                      │
│   Mike   ██████ 100%  │   ⚠️ #7840 — Service Outage         │
│   Priya  ███░░░ 60%   │      ⏱️ 15m | Cluster: 23 related   │
│   Tom    ██░░░░ 40%   │      💡 Recommend: Bulk response     │
├───────────────────────┴───────────────────────────────────────┤
│  Queue: 47 open | 12 at risk | 3 breached | Clear by: 5:30PM │
└───────────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Heatmap rendering | D3.js + Canvas | High-performance real-time rendering |
| Real-time data | WebSocket + Server-Sent Events | Live updates without polling |
| Drag-and-drop routing | React DnD | Intuitive agent-to-complaint assignment |
| Shift management | Integration with existing WFM tools | Avoid reinventing shift scheduling |

---

## Performance Targets

- Heatmap refresh: every 10 seconds
- Escalation queue: real-time push (< 2 seconds)
- Team status: real-time (< 5 seconds)
- Dashboard load time: < 2 seconds

---

## Dependencies

- SLA Engine (real-time SLA data)
- Cognitive Load Manager (agent status, burnout signals)
- Predictive Escalation (escalation probabilities)
- 360° Record (complaint details)
- Workforce management system
