# UCCD — Progress Checklist vs Roadmaps

Checklist derived from each person’s roadmap HTML in `Roadmaps/` and verified against the repo (`api/`, `agents/`, `services/`, `scripts/`, `docker-compose.yml`).  
Legend: `[x]` done in codebase · `[ ]` not done / stub / missing

_Last updated: repo snapshot at time of writing._

---

## Abhineet — AI Engineer + Backend (FastAPI)

Source: [Roadmap_Abhineet.html](Roadmap_Abhineet.html)

### Week 1 — FastAPI + ORM + core routes

- [x] Project layout: `api/main.py`, `api/models/`, `api/routes/`, `api/schemas/`, `api/db/`
- [x] `api/models/complaint.py` — SQLAlchemy `Complaint` model (rich columns incl. AI fields)
- [x] `api/schemas/complaint.py` — Pydantic `ComplaintCreate`, `ComplaintResponse`, `ComplaintListResponse`, `StatusUpdate`
- [x] `api/routes/complaints.py` — `POST /api/v1/complaints`, `GET /api/v1/complaints` (filters + pagination), `GET /api/v1/complaints/{id}`
- [x] Real DB persistence (not mock-only) for complaints
- [x] `GET /api/v1/complaints/escalations` (roadmap listed as `GET /api/v1/escalations` — implemented under complaints prefix)

### Week 2 — NLP classifier

- [x] `agents/nlp_classifier.py` — multi-field JSON classification (uses **Groq** + `GROQ_API_KEY`, not Claude/Anthropic as in roadmap)
- [ ] `type_confidence` populated by classifier (roadmap asks for it; orchestrator merge does not set it from NLP output today)
- [ ] Kafka `NLPConsumer` / consume `complaints.inbound` (roadmap); pipeline runs from FastAPI `BackgroundTasks` instead

### Week 3 — LangGraph orchestrator

- [x] `agents/state.py` — `ComplaintState` TypedDict
- [x] `agents/orchestrator.py` — LangGraph: parallel nodes from `START`, `merge_and_save` → DB + `set_sla_timer` when `sla_tier` set
- [x] `agents/root_cause_agent.py` — minimal logic (cluster size threshold)
- [ ] `run_emotion`, `run_dna`, `run_severity`, `run_escalation` — **stubs** (`return {}`)
- [ ] Publish to Kafka on create + async pipeline only via queue (roadmap)

### Week 4 — Draft response + WebSocket

- [ ] `services/draft_service.py` — tone-matched draft generation
- [ ] `GET /api/v1/ai/draft/{complaint_id}`
- [ ] `POST /api/v1/complaints/{id}/respond` — final response + edit delta + resolve
- [x] `api/websocket.py` — `ConnectionManager`, `ws://.../api/v1/ws/supervisor`, `broadcast_event()`
- [ ] WebSocket message types exactly as roadmap (`breach_predicted`, `breach_occurred`, `cluster_spike`, `agent_overload`); current payloads include `complaint_created`, `complaint_status_changed`, `sla_alert` variants

### Week 5 — Remaining API surface

- [x] `PUT /api/v1/complaints/{id}/status` with transition validation (roadmap rules differ slightly; repo has explicit `VALID_TRANSITIONS`)
- [ ] `GET /api/v1/agents/load`
- [ ] `GET /api/v1/analytics/trends` (and `?window=…`)
- [ ] `POST /api/v1/simulation/run`
- [ ] `GET /api/v1/complaints/{id}/history`
- [ ] `GET /api/v1/ai/translate-preview`
- [x] `GET /api/v1/dashboard/kpis` (roadmap summary listed `GET /api/v1/kpis`; implemented as `/api/v1/dashboard/kpis`)
- [ ] CORS `allow_origins` includes `http://localhost:3000` (repo uses `http://localhost:5173`)

### Week 6 — Integration / polish

- [ ] `scripts/seed_demo.py` — 20 demo complaints
- [ ] Request logging middleware
- [ ] Full E2E timing/logging per agent node as specified

---

## Akash — ML Engineer + Infra (Kafka, DB, ML agents)

Source: [Roadmap_Akash.html](Roadmap_Akash.html)

### Week 1 — Kafka + PostgreSQL + pgvector

- [ ] `kafka/producer.py` — `publish_complaint`
- [ ] `kafka/base_consumer.py` — `BaseConsumer`, DLQ handling
- [ ] Topics: `complaints.inbound`, `complaints.dlq`, `complaints.translated`
- [ ] `docker-compose.yml` — Zookeeper + Kafka + Postgres + pgvector bootstrap
- [ ] `db/schema.sql` — full schema + `CREATE EXTENSION vector`
- [ ] IVFFlat index on `embedding`
- [ ] `db/connection.py` (roadmap); repo uses `api/db/session.py` for SQLAlchemy instead
- [ ] Alembic migrations from schema

### Weeks 2–5 — ML pipeline + consumers

- [ ] `services/translation_service.py` + `agents/translation_consumer.py`
- [ ] `agents/dna_agent.py` — embeddings + similarity + clustering + `DNAConsumer`
- [ ] `agents/severity_agent.py` — weighted score + SLA tier + `SeverityConsumer`
- [ ] `agents/emotion_agent.py` — arc + slope + `EmotionConsumer`
- [ ] `agents/escalation_agent.py` — breach prediction + `EscalationConsumer` + `escalations.predicted` topic
- [ ] `ml/generate_training_data.py`, `ml/train_breach_model.py`, `ml/breach_predictor.pkl`

### Week 6 — Integration

- [ ] All Kafka consumers running together + E2E with FastAPI + DB

---

## Hemant — Frontend Engineer

Source: [Roadmap_Hemant.html](Roadmap_Hemant.html)

### Setup

- [ ] `frontend/` Vite + React + TypeScript project
- [ ] `src/styles/tokens.css` — design tokens
- [ ] `src/api/client.ts` — Axios + JWT interceptor
- [ ] `src/types/complaint.ts` — interfaces aligned with API
- [ ] React Router + protected routes + `Sidebar.tsx`

### Screens (8)

- [ ] **Screen 1** — Login (`LoginForm`, `RoleSelector`, `AuthContext`)
- [ ] **Screen 2** — My Queue (`ComplaintRow`, `SLATimer`, `FilterPills`, …)
- [ ] **Screen 3** — Complaint detail (`EmotionArcChart`, `ConversationHistory`, `AIDraftPanel`, `TriagePanel`, `NBAPanel`, …)
- [ ] **Screen 4** — Supervisor Command Centre (`KPIBar`, `EscalationQueue`, `AgentLoadBars`, `AIFeed`, `VolumeChart`)
- [ ] **Screen 5** — Regulatory dashboard
- [ ] **Screen 6** — Insights / trends (`TrendLineChart`, `HeatmapGrid`, `DriversTable`)
- [ ] **Screen 7** — Simulation sandbox
- [ ] **Screen 8** — Complaint search

### Real-time / Week 5

- [ ] `src/hooks/useWebSocket.ts` — reconnect, `lastMessage`
- [ ] Supervisor UI wired to WebSocket + toasts

---

## Pritesh / Suryansh — Auth · SLA · DevOps · QA

Sources: [Roadmap_Pritesh.html](Roadmap_Pritesh.html), [Roadmap_Suryansh.html](Roadmap_Suryansh.html) (same role split in roadmaps)

### Week 1 — Docker + Redis + API

- [x] `docker-compose.yml` — **Redis** + **api** service, `Dockerfile` build
- [ ] Full stack per roadmap: Zookeeper, Kafka, Postgres, Redis, api in one compose
- [ ] `Makefile` (`make up`, `make down`, `make logs`, `make seed`, `make test`)
- [ ] `src/config.py` — pydantic `BaseSettings` for env
- [ ] `.env.example` with `SARVAM_API_KEY` and full team vars

### Week 2 — JWT + RBAC

- [x] `POST /api/v1/auth/login` — issues JWT (`api/routes/auth.py`)
- [ ] `api/models/user.py` + users table + bcrypt-hashed passwords + seed users
- [ ] `api/auth.py` — `create_access_token`, `verify_token`, `get_current_user`, `require_role`
- [ ] OAuth2 bearer dependency on protected routes (login is public; complaints/dashboard open in current app)

### Week 3 — Redis SLA engine

- [x] `services/sla_service.py` — Redis keys, `set_sla_timer`, `get_sla_status`, `check_all_sla`, `fire_sla_alert`, `clear_sla`
- [x] APScheduler in `api/main.py` lifespan — job every **1 minute** (roadmap: 60s ✓)
- [ ] `supervisor_notification_service` (roadmap mentions alongside WS)
- [ ] On TTL expiry: roadmap says status `"breached"`; repo sets `sla_breached=True` and may set `escalated` (verify product intent vs roadmap)

### Week 4 — Agent load + regulatory

- [ ] `services/agent_service.py` — queues, `compute_agent_load`, `get_best_agent`, `check_agent_loads`, `GET /api/v1/agents/load`
- [ ] `services/regulatory_service.py` — regulatory Redis timers + `check_regulatory_deadlines` + `get_regulatory_status`

### Week 5–6 — Tests + README + demo

- [ ] `tests/` — `test_auth.py`, `test_complaints.py`, `test_sla.py`, `test_agents.py`, `test_integration.py`
- [ ] `README.md` — clone, `make up`, demo flow
- [ ] Coordinate `scripts/seed_demo.py` with Abhineet roadmap (not present; `scripts/create_tables.py` exists only)

---

## Quick summary

| Owner | Roughly done | Main gaps |
|--------|----------------|------------|
| **Abhineet** | Core API, LangGraph shell, NLP (Groq), WS, dashboard KPIs, escalations list | Stub agents, draft/translate/simulation/history routes, seed script, Kafka |
| **Akash** | — | Entire Kafka/DB/pgvector + ML agents + translation pipeline |
| **Hemant** | — | Entire `frontend/` |
| **Pritesh/Suryansh** | Redis SLA service, partial Docker, demo JWT login | Full compose, User model + RBAC, agent/regulatory services, tests, Makefile, README |

---

## Note on `scripts/`

- [x] `scripts/create_tables.py` exists (not in original checklist; useful for local DB setup)
- [ ] `scripts/seed_demo.py` — as per Abhineet Week 6 / Pritesh Week 6 roadmap
