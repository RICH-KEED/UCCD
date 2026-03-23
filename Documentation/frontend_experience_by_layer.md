# Frontend Experience Guide by Layer

## Purpose
This guide explains what each layer does from a user-visible perspective only.
It avoids backend mechanics and focuses on what people actually see, click, read, and act on.

## Who this is for
- Complaint handling agents
- Team supervisors
- Compliance officers
- Business leaders and analysts

## End-to-end user journey (what users see)
1. A complaint enters through a visible channel: email, social post, call, chat, portal, app, or regulator feed.
2. The system enriches the case with labels, sentiment, severity, and recommendations.
3. Agents work in a single complaint screen with timeline, customer context, and draft response support.
4. Supervisors monitor risk, SLA health, escalations, and team load.
5. Compliance teams track regulatory deadlines and generate reports.
6. Leaders monitor trends, root causes, and what-if simulations.

---

## Layer 1 - Omnichannel Ingestion (Visible intake points)

### What this layer does for users
Layer 1 is where complaints originate. Users see channel-specific entry points, not the normalization process behind them.

### What users can see
- Email complaints in support inboxes
- Social complaints (mentions, comments, direct messages)
- Voice complaint records with transcript artifacts
- Chatbot to human handoff markers
- Portal/app complaint submission forms
- Regulator-origin complaints flagged as formal cases

### Typical visible UI elements
- Channel badges (Email, Social, Voice, Chat, Portal, Regulator)
- Source timestamp and message preview
- Attachments from source channel
- Regulator priority marker for formal filings

### Frontend notes
Layer 1 is mostly transparent after ingestion. The main visible effect is source context appearing clearly in downstream agent screens.

---

## Layer 2 - AI Triage Engine (Visible intelligence overlays)

### What this layer does for users
Layer 2 adds machine-generated understanding to each complaint so agents do not start from a blank page.

### What users can see
- Classification tags (issue type, product, intent)
- Emotion or sentiment indicator
- Severity level and urgency badge
- Escalation risk indicator
- Similar/duplicate complaint suggestions
- Next-best-action recommendations
- Root cause summary hints

### Typical visible UI elements
- Label chips and confidence indicators
- Severity badge: Critical, High, Medium, Low
- Escalation risk percentage or status marker
- Related cases panel
- Suggested action sidebar

### Frontend notes
Users see the output of Layer 2 but do not use this layer directly. These insights appear in Agent Workspace and supervisor dashboards.

---

## Layer 3 - Complaint Core (Visible case truth and workflow state)

### What this layer does for users
Layer 3 provides the single trusted complaint record that powers all user-facing screens.

### What users can see
- Unified complaint timeline across channels
- Complaint lifecycle state (New, Triaged, Assigned, In Progress, Resolved, Closed)
- SLA countdown and breach warnings
- Full case history and audit entries
- Linked/related complaint view
- Compliance status flags and deadlines

### Typical visible UI elements
- Timeline with events and notes
- Status dropdown and transition actions
- SLA timer with warning colors
- Audit history section
- Search and filter surfaces for past cases

### Frontend notes
This layer drives consistency. Agents and supervisors see one source of truth in every dashboard.

---

## Layer 4 - Intelligence and Dashboard (Visible work surfaces)

### What this layer does for users
Layer 4 is the direct user interface layer for execution, supervision, compliance, and strategy.

### What users can see
- Agent Workspace for day-to-day complaint handling
- Supervisor HQ for queue and team performance
- Insights Board for trends and root-cause analysis
- Regulatory View for compliance operations
- Simulation workspace for what-if planning

### Typical visible UI elements
- Queue tables, filters, and priority ribbons
- Case detail panes and response editors
- Team heatmaps and escalation lists
- Compliance scorecards and filing trackers
- Trend charts, anomaly callouts, scenario outputs

### Frontend notes
Layer 4 is where people spend their time. It should prioritize clarity, speed, and decision support.

---

## Role-based frontend views

### Agent view
- Priority queue with severity and SLA indicators
- Full timeline and customer context side by side
- AI-assisted draft response editor
- Similar case shortcuts and suggested actions

### Supervisor view
- Team queue health and SLA risk heatmap
- Escalation pipeline and intervention controls
- Workload balance and coaching indicators

### Compliance view
- Regulatory-case tracker with strict deadlines
- Required action checklist and evidence links
- Exportable audit and report workflow

### Executive/analyst view
- Complaint trend dashboards
- Root-cause and impact summaries
- Scenario simulation output for planning

---

## File-by-file frontend visibility map

## Top-level files
- 00_architecture_overview.md: High-level architecture framing; useful context for understanding visible layers.
- idea.md: Product vision and design framing; not an operational frontend screen.
- web.md: Web documentation scaffold; not a direct runtime UI screen by itself.

## Layer 1 files
- Layer 1 - Omnichannel Ingestion/1.1_email.md: Email-origin complaint appears as a case with source context.
- Layer 1 - Omnichannel Ingestion/1.2_social.md: Social-origin complaint appears with public-channel context.
- Layer 1 - Omnichannel Ingestion/1.3_voice.md: Voice-origin complaint appears with transcript and call context.
- Layer 1 - Omnichannel Ingestion/1.4_chat_bot.md: Chatbot-origin complaint includes visible handoff point to human support.
- Layer 1 - Omnichannel Ingestion/1.5_portal_app.md: Portal/app submissions appear with structured form fields.
- Layer 1 - Omnichannel Ingestion/1.6_regulator.md: Regulator-origin complaints appear with high-priority compliance markers.
- Layer 1 - Omnichannel Ingestion/1.7_event_bus.md: Not directly visible to users.
- Layer 1 - Omnichannel Ingestion/chat_bot_connector.md: Not directly visible to users.
- Layer 1 - Omnichannel Ingestion/email_connector.md: Not directly visible to users.
- Layer 1 - Omnichannel Ingestion/normalisation_event_bus.md: Not directly visible to users.
- Layer 1 - Omnichannel Ingestion/portal_app_connector.md: Not directly visible to users.
- Layer 1 - Omnichannel Ingestion/regulator_connector.md: Not directly visible to users.
- Layer 1 - Omnichannel Ingestion/social_connector.md: Not directly visible to users.
- Layer 1 - Omnichannel Ingestion/voice_connector.md: Not directly visible to users.

## Layer 2 files
- Layer 2 - AI Triage Engine/2.1_nlp_classifier.md: Visible as category tags and intent labels in case view.
- Layer 2 - AI Triage Engine/2.2_emotion_engine.md: Visible as emotion/sentiment indicator for response tone.
- Layer 2 - AI Triage Engine/2.3_complaint_dna.md: Visible as related-case and duplicate suggestions.
- Layer 2 - AI Triage Engine/2.4_severity_scorer.md: Visible as urgency badge that affects queue ordering.
- Layer 2 - AI Triage Engine/2.5_predictive_escalation.md: Visible as escalation risk marker and supervisor alert.
- Layer 2 - AI Triage Engine/2.6_root_cause_agent.md: Visible as probable cause summary and trend hints.
- Layer 2 - AI Triage Engine/2.7_resolution_graph.md: Visible as next-best-action recommendations.
- Layer 2 - AI Triage Engine/nlp_classifier.md: Same visible outcome as 2.1_nlp_classifier.md.
- Layer 2 - AI Triage Engine/emotion_engine.md: Same visible outcome as 2.2_emotion_engine.md.
- Layer 2 - AI Triage Engine/complaint_dna.md: Same visible outcome as 2.3_complaint_dna.md.
- Layer 2 - AI Triage Engine/severity_scorer.md: Same visible outcome as 2.4_severity_scorer.md.
- Layer 2 - AI Triage Engine/predictive_escalation.md: Same visible outcome as 2.5_predictive_escalation.md.
- Layer 2 - AI Triage Engine/root_cause_agent.md: Same visible outcome as 2.6_root_cause_agent.md.
- Layer 2 - AI Triage Engine/resolution_graph.md: Same visible outcome as 2.7_resolution_graph.md.

## Layer 3 files
- Layer 3 - Complaint Core/360_record.md: Visible as single full case timeline and context panel.
- Layer 3 - Complaint Core/knowledge_store.md: Not directly visible; supports search and recommendations.
- Layer 3 - Complaint Core/regulatory.md: Visible as compliance flags, timers, and filing status indicators.
- Layer 3 - Complaint Core/sla_engine.md: Visible as SLA countdown, warnings, and breach alerts.

## Layer 4 files
- Layer 4 - Intelligence & Dashboard/agent_workspace.md: Main handling screen for agents.
- Layer 4 - Intelligence & Dashboard/cognitive_load.md: Supervisor-facing workload and fatigue indicators.
- Layer 4 - Intelligence & Dashboard/draft_response.md: AI-assisted response drafting surface.
- Layer 4 - Intelligence & Dashboard/insights_board.md: Executive and analyst trend intelligence dashboard.
- Layer 4 - Intelligence & Dashboard/regulatory_view.md: Compliance dashboard for obligations and reporting.
- Layer 4 - Intelligence & Dashboard/simulation.md: What-if planning screen for operational decisions.
- Layer 4 - Intelligence & Dashboard/supervisor_hq.md: Team operations and escalation control center.
- Layer 4 - Intelligence & Dashboard/trend_analyst.md: Trend-focused analytical reporting view.

---

## Frontend design direction by layer (high-level)

### Layer 1 visual style
- Source-first cards with clear channel identity
- Simple submission and acknowledgment experiences
- Strong trust and clarity on complaint receipt

### Layer 2 visual style
- Compact insight chips, badges, and side panels
- Confidence and risk presented clearly, never noisy
- AI suggestions as assistive, not obstructive

### Layer 3 visual style
- Timeline-first complaint detail layout
- Status and SLA always visible near the header
- Strong traceability sections for audits

### Layer 4 visual style
- Role-specific dashboards with focused KPIs
- Fast navigation between queue, detail, and action
- Alerting and prioritization patterns that reduce cognitive load

---

## Suggested single-screen mental model for users
- Left: queue and filters
- Center: complaint timeline and latest interaction
- Right: AI guidance, SLA status, and next actions
- Top: role-specific KPIs and alerts

This layout keeps action context, evidence, and recommendations visible in one place for faster, better decisions.
