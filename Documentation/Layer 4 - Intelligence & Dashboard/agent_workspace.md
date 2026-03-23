# 👩‍💻 Agent Workspace Dashboard

> **Layer:** 4 — Gen-AI Intelligence & Dashboard  
> **Type:** Dashboard Surface  
> **Priority:** P0 (Core)

---

## What It Does

The **primary working interface** for complaint handling agents. Provides AI-assisted 360° complaint view, draft responses, and a streamlined send flow — everything an agent needs in one screen.

---

## Key Features

### 1. AI-Prioritised Complaint Queue
- Complaints sorted by AI-calculated priority, NOT FIFO
- Priority factors: severity score, SLA remaining time, customer tier, escalation probability
- Visual indicators: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low
- Filters: by type, product, assignment, status, channel
- **Smart Snooze:** Temporarily hide complaints waiting for customer response

### 2. 360° Complaint View
- **Left Panel:** Full communication timeline (all channels, chronological)
- **Center Panel:** Current complaint details + AI draft response editor
- **Right Panel:** Customer context card + similar past complaints + resolution suggestions
- One-click access to: customer profile, previous complaints, purchase history

### 3. AI Co-Pilot Chat
- In-context AI assistant the agent can query:
  - "What happened with this customer's last order?" → Instant answer from customer history
  - "What's our policy on late delivery refunds?" → Policy lookup from knowledge base
  - "Draft a response offering 15% discount" → Custom response generation
- Conversational interface — feels like chatting with a senior colleague

### 4. Draft + Send Flow
- AI-generated draft appears in editor with highlighted personalisation
- Agent can: approve, edit, regenerate, or write from scratch
- Send via the customer's preferred channel (or the channel they contacted through)
- Response validation: compliance check, tone check, completeness check before send
- One-click canned actions: send refund, create ticket, escalate, merge duplicate

### 5. Complaint Actions Toolbar
- **Merge:** Combine duplicate complaints
- **Link:** Associate related complaints
- **Escalate:** Escalate with one click + reason
- **Transfer:** Transfer to specialist team/agent
- **Tag:** Add custom tags for internal tracking
- **Close:** Resolve with resolution category + notes

### 6. SLA & Sentiment Indicators
- Live SLA countdown timer per complaint
- Sentiment heatmap showing customer's emotional journey
- Escalation probability badge (from Predictive Escalation)
- Workload indicator: agent's current cognitive load

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Search    [Filters]    [My Queue: 12]    [Team Queue: 47]  │
├──────────┬──────────────────────────────────┬───────────────────┤
│          │                                  │                   │
│ QUEUE    │   COMPLAINT DETAIL               │ CONTEXT           │
│          │                                  │                   │
│ ● Crit   │   Timeline:                      │ 👤 Customer Card  │
│ ● High   │   📧 Email (Mar 15)              │ Tier: Premium     │
│ ○ Med    │   🐦 Tweet (Mar 16)              │ Since: 2019       │
│ ○ Low    │   💬 Chat (Mar 17)               │ LTV: $12,400      │
│ ○ Low    │                                  │                   │
│          │   ✍️ AI Draft Response:           │ 📊 Similar Cases  │
│          │   ┌──────────────────────┐       │ Case #4521 (92%)  │
│          │   │ Dear Sarah,          │       │ Case #3892 (87%)  │
│          │   │ I sincerely apolo... │       │                   │
│          │   └──────────────────────┘       │ 💡 NBA            │
│          │   [✅ Send] [✏️ Edit] [🔄 Regen]  │ 1. Full refund    │
│          │                                  │ 2. Partial credit  │
│          │   🤖 AI Co-Pilot:                │ 3. Replacement    │
│          │   > Ask me anything...           │                   │
├──────────┴──────────────────────────────────┴───────────────────┤
│  SLA: ⏱️ 3h 24m remaining  │  Sentiment: 😤→😡  │  Load: 11/15  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | Next.js + React | SSR for speed, rich component ecosystem |
| Real-time updates | WebSocket (Socket.io) | Live queue updates, SLA timers, new messages |
| State management | Zustand | Lightweight, performant for complex UI state |
| Rich text editor | TipTap (ProseMirror) | Extensible, supports inline AI suggestions |
| Keyboard shortcuts | Full coverage (Vim-inspired optional) | Power users resolve complaints 2x faster |

---

## Performance Targets

- Page load: < 1.5 seconds
- Queue refresh: real-time (WebSocket push)
- Complaint detail load: < 500ms
- AI draft generation: < 3 seconds
- Search results: < 300ms

---

## Dependencies

- All Layer 2 agents (for enriched complaint data)
- 360° Record (complaint & communication history)
- Draft Response module (AI responses)
- SLA Engine (timers)
- Knowledge Store (similar cases search)
- Customer profile service
