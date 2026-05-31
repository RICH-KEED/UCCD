# OmniResol — Unified Complaint & Case Dashboard

<p align="center">
  <strong>Real-time, AI-powered complaint management for banking & financial services</strong>
</p>

---

## 📋 Problem Statement

Banks and financial institutions process thousands of customer complaints daily across fragmented channels — email, social media, chatbots, phone, and regulator portals. Legacy CRM and ticketing systems suffer from:

- **Channel fragmentation** — complaints arrive in silos with no unified view
- **Manual triage** — agents spend hours reading, classifying, and routing complaints
- **Missed SLAs** — regulatory deadlines (RBI, CFPB, etc.) are tracked manually or not at all
- **Slow resolution** — no intelligence for deduplication, sentiment analysis, or root cause detection
- **No predictive capability** — supervisors react to breaches after they happen, not before

**UCCD (OmniResol)** solves this by ingesting complaints from 6+ omnichannel sources into a unified pipeline, running each one through a **7-agent AI triage engine** (LangGraph + Groq LLM), and presenting a real-time agent workspace, supervisor command center, and analytics dashboard — all with SLA timers backed by Redis.

---

## 🏗️ Architecture

| Layer | Component | Technology |
|---|---|---|
| **Layer 1** | Omnichannel Ingestion | Email, WhatsApp, Telegram, Twitter/X, Instagram, Web Chatbot, Regulator APIs → Apache Kafka |
| **Layer 2** | AI Triage Engine | 7 LangGraph agents: Translation → NLP → Emotion · Dedup · Severity · Escalation · Root Cause |
| **Layer 3** | Complaint Core | 360° records (SQLAlchemy + pgvector), knowledge store, regulatory engine, SLA timers (Redis) |
| **Layer 4** | Intelligence & Dashboard | Agent workspace, Supervisor HQ, Analytics & Trends, Simulation, WebSocket live events |

```
                    ┌──────────────────────────────────────────────┐
                    │           Omnichannel Ingestion              │
                    │  Email  WhatsApp  Telegram  Twitter  Web ...  │
                    └──────────────────┬───────────────────────────┘
                                       │ Kafka (complaints.inbound)
                                       ▼
                    ┌──────────────────────────────────────────────┐
                    │           AI Triage Pipeline                 │
                    │  Translation → NLP → Emotion · DNA · Seve-   │
                    │  rity · Escalation · Root Cause (parallel)   │
                    └──────────────────┬───────────────────────────┘
                                       ▼
                    ┌──────────────────────────────────────────────┐
                    │              Complaint Core                  │
                    │  PostgreSQL + Redis SLA timers + Regulatory   │
                    └──────────────────┬───────────────────────────┘
                                       ▼
                    ┌──────────────────────────────────────────────┐
                    │    Agent Workspace  ·  Supervisor HQ         │
                    │    Analytics  ·  Simulation  ·  WebSocket    │
                    └──────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (Local)

### Prerequisites

| Dependency | Version | Purpose |
|---|---|---|
| Docker & Docker Compose | Latest | Infrastructure (Redis, Kafka, Zookeeper) |
| Python | 3.11+ | Backend API |
| Node.js | 18+ (or Bun) | Frontend |
| PostgreSQL | Any (Neon DB recommended) | Primary database |
| Groq API Key | — | LLM for AI agents |
| Sarvam API Key | — (optional) | Indic language translation |

### 1. Clone & Configure

```bash
git clone https://github.com/<your-org>/uccd.git
cd uccd

cp .env.example .env
# Edit .env — fill in POSTGRES_URL, GROQ_API_KEY, JWT_SECRET
```

### 2. Start Infrastructure

```bash
docker compose up -d redis kafka zookeeper
```

### 3. Database Setup

```bash
# Apply Alembic migrations
alembic upgrade head

# OR create tables directly
python scripts/create_tables.py
```

### 4. Create Kafka Topics

```bash
python scripts/create_kafka_topics.py
```

### 5. Start the Backend

```bash
pip install -r requirements.txt
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
# API → http://localhost:8000
# Swagger → http://localhost:8000/docs
```

### 6. Start the Frontend

```bash
cd frontend
npm install
npm run dev
# Frontend → http://localhost:5173
```

### 7. Seed Demo Data

```bash
python scripts/seed_users.py       # creates demo user accounts
python scripts/seed_demo.py        # creates 20 realistic banking complaints + runs AI pipeline
```

### 8. Login

| Role | Email | Password |
|---|---|---|
| Agent | `agent@example.com` | `demo123` |
| Supervisor | `supervisor@example.com` | `demo123` |
| Compliance | `compliance@example.com` | `demo123` |

### Docker-Only Quick Start

```bash
docker compose up -d                 # all services
make migrate                         # apply DB migrations
make kafka-topics                    # create Kafka topics
make seed-users                      # seed demo users
make seed                            # seed 20 demo complaints
# API → http://localhost:8888
```

---

## 🧠 AI Pipeline

Each complaint flows through a **LangGraph state graph** with 7 specialized agents:

| Step | Agent | What It Does |
|---|---|---|
| 1 | **Translation** (Sarvam AI) | Translates Indic/Hinglish complaints to English |
| 2 | **NLP Classifier** (Groq) | Classifies complaint type, intent, product, and priority |
| 3 | **Emotion Agent** (Groq) | Detects customer sentiment arc and emotional intensity |
| 4 | **DNA Agent** (Groq) | Deduplication — identifies duplicate/repeat complaints |
| 5 | **Severity Agent** (Groq) | Scores severity and assigns SLA tier (P0-P4) |
| 6 | **Escalation Agent** (Groq) | Flags escalation risks and predicts SLA breach probability |
| 7 | **Root Cause Agent** (Groq) | Identifies systemic root causes and recommends fixes |

Steps 3-6 run in **parallel** after NLP classification. Results are merged and saved to PostgreSQL with `pgvector` embeddings for semantic search.

---

## 📦 Libraries & Dependencies

### Backend (Python)

| Library | Purpose |
|---|---|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `sqlalchemy` + `psycopg2-binary` | ORM + PostgreSQL driver |
| `pgvector` | Vector similarity search (embeddings) |
| `alembic` | Database migrations |
| `pydantic` | Data validation |
| `python-jose` + `passlib[bcrypt]` | JWT authentication |
| `kafka-python` | Kafka producer/consumer |
| `redis` | Redis client (SLA timers, cache) |
| `langgraph` | AI agent orchestration (state graph) |
| `groq` | Groq LLM API client (Llama 3.1) |
| `scikit-learn` | ML model (SLA violation prediction) |
| `apscheduler` | Background task scheduler |
| `httpx` | Async HTTP client |
| `tweety-ns` | Twitter/X userbot scraper |
| `instagrapi==2.7.20` | Instagram private API |
| `pytest` + `pytest-asyncio` | Test framework |

### Frontend (TypeScript)

| Library | Purpose |
|---|---|
| `next` + `react` + `react-dom` | Next.js 16 framework (React 19) |
| `tailwindcss` + `@radix-ui/*` | Styling + accessible UI primitives |
| `@tanstack/react-query` + `react-table` | Server state + data tables |
| `zustand` | Client state management |
| `recharts` | Charts & dashboards |
| `react-hook-form` + `zod` | Form handling + validation |
| `framer-motion` | Animations |
| `@dnd-kit` | Drag & drop |
| `react-markdown` + `@mdxeditor/editor` | Rich text & markdown |
| `next-intl` | Internationalization (i18n) |
| `vite` | Dev bundler |

### Infrastructure

| Component | Technology |
|---|---|
| Message Queue | Apache Kafka (Confluent 7.6.0) |
| Cache / Timers | Redis 7 (Alpine) |
| Database | PostgreSQL with pgvector (Neon DB) |
| Reverse Proxy | Nginx + Certbot (Let's Encrypt) |
| Process Manager | systemd (`uccd-api.service`, `uccd-frontend.service`) |

---

## 🤖 Synthetic Data Generation

### Demo Complaints (`scripts/seed_demo.py`)

Creates **20 realistic Indian banking complaints** spanning fraud, UPI failures, loan delays, ATM disputes, credit card issues, and more. Each complaint is automatically processed through the full AI pipeline.

```bash
python scripts/seed_demo.py
```

### ML Training Data (`ml/generate_training_data.py`)

Generates **5,000 synthetic rows** for SLA violation prediction model training. Features include severity score, priority tier, SLA hours, queue size, regulatory flags, VIP customer indicators, and channel type.

```bash
cd ml
python generate_training_data.py     # → training_data.csv (5000 rows)
python train_violation_model.py      # → violation_predictor.pkl
```

### Bootstrap Schema (`db/schema.sql`)

Complete PostgreSQL schema with `users`, `complaints` (including `pgvector` HNSW index on embeddings), `outbound_messages`, and `webhook_events` tables.

---

## ⚠️ Known Limitations

| # | Limitation | Impact | Mitigation |
|---|---|---|---|
| 1 | **No real-time social media streaming** — Twitter/Instagram use polling-based userbot scraping, not official APIs | Delays of 2-5 min for social complaints; Twitter API v2 free tier is restrictive | Upgrade to Twitter Enterprise API for production |
| 2 | **Groq rate limits** — free tier throttles at ~30 RPM for Llama 3.1 | Pipeline throughput capped at ~30 complaints/min under heavy load | Upgrade to paid Groq tier or self-host via Ollama/Llama.cpp |
| 3 | **Sarvam translation quality** — Hindi/Hinglish translations degrade with heavy code-mixing | Occasional misclassification of highly mixed-language complaints | Add fallback translation via Groq LLM; fine-tune on banking domain |
| 4 | **Single Kafka broker** — no replication, no fault tolerance | Data loss risk if Kafka broker goes down; not production-grade | Add 3-broker Kafka cluster with replication factor ≥ 3 |
| 5 | **No Redis persistence** — SLA timers are in-memory only | All active SLA countdowns reset if Redis restarts | Enable Redis AOF persistence; rebuild SLA state from DB on startup |
| 6 | **Instagram session fragility** — userbot sessions expire and require manual re-login | Instagram channel stops working without warning | Migrate to Instagram Graph API (requires Business account) |
| 7 | **ML model is heuristic-trained** — violation predictor uses rule-based labels, not real historical data | Prediction accuracy is simulated; may not generalize to real data | Train on real production SLA breach data once available |
| 8 | **No multi-tenancy** — single-tenant architecture | Not suitable for SaaS/B2B deployment across multiple banks | Add organization/tenant isolation at DB and API layers |
| 9 | **WebSocket room broadcast** — all supervisors receive all events | Noise at scale with many supervisors | Filter events by role, department, or complaint assignment |
| 10 | **WhatsApp gateway optional** — OpenWA is a separate service with its own auth and scaling needs | WhatsApp channel requires additional setup and maintenance | Consider official WhatsApp Business API for production |

---

## 📖 API Documentation

Once the API is running:

| Interface | URL |
|---|---|
| Swagger UI | `http://localhost:8000/docs` |
| ReDoc | `http://localhost:8000/redoc` |
| Health Check | `http://localhost:8000/api/health` |

Full API reference: [`api_documentation.md`](./api_documentation.md)

---

## 🧪 Testing

```bash
pytest tests/ -v                    # local
make test                           # Docker
```

Test suite covers: authentication, complaint CRUD, SLA timers, AI agents, Telegram bot, Twitter, Instagram, email intake, history audit trail, and integration tests.

---

## 📁 Project Structure

```
uccd/
├── api/                      FastAPI application
│   ├── routes/               API endpoint modules (14 files)
│   ├── models/               SQLAlchemy ORM models
│   ├── schemas/              Pydantic request/response schemas
│   └── db/                   Database session & engine
├── agents/                   AI pipeline (LangGraph state graph)
│   ├── orchestrator.py       Pipeline builder + run_pipeline()
│   ├── nlp_classifier.py     Complaint type/intent classifier
│   ├── emotion_agent.py      Sentiment & emotion analysis
│   ├── dna_agent.py          Deduplication & clustering
│   ├── severity_agent.py     Severity scoring + SLA tier
│   ├── escalation_agent.py   Predictive escalation
│   ├── root_cause_agent.py   Systemic root cause analysis
│   └── inbound_consumer.py   Kafka consumer for complaints
├── services/                 Business logic
│   ├── complaint_service.py  Core complaint CRUD
│   ├── sla_service.py        Redis-backed SLA timer engine
│   ├── regulatory_service.py Regulatory countdown management
│   ├── agent_service.py      Agent load balancing & auto-assignment
│   ├── draft_service.py      AI draft response generation
│   ├── translation_service.py Sarvam translation integration
│   ├── guardrails.py         Response safety guardrails
│   └── channels/             Omnichannel connectors (email, telegram, whatsapp, twitter, instagram)
├── kafka/                    Kafka producers & consumers
├── ml/                       ML training data + violation model
├── frontend/                 Next.js 16 + React 19 + Tailwind
│   └── src/
│       ├── components/       20+ page components + UI library
│       ├── hooks/            Custom React hooks
│       ├── api/              API client (JWT fetch wrapper)
│       └── types/            TypeScript type definitions
├── scripts/                  Utility, seed, and setup scripts
├── tests/                    12 test files (pytest)
├── alembic/                  Database migration versions
├── db/                       Bootstrap SQL schema
├── Documentation/            40+ detailed design docs
├── Roadmaps/                 Developer roadmaps + progress tracker
└── openwa/                   WhatsApp gateway (NestJS sub-project)
```

---

## 🌐 Production Deployment

Full VPS deployment guide: [`setup-vps.md`](./setup-vps.md)

Production stack uses:
- **Nginx** reverse proxy with Let's Encrypt SSL
- **systemd** services for API and frontend
- **Docker** for Redis, Kafka, and Zookeeper
- **Next.js standalone build** for frontend
- Production domain: `omniresol.me`

---

## 📚 Additional Documentation

| Document | Description |
|---|---|
| [`setup.md`](./setup.md) | Step-by-step local setup |
| [`setup-vps.md`](./setup-vps.md) | VPS production deployment |
| [`api_documentation.md`](./api_documentation.md) | Full API reference |
| [`api_spec_roadmap.md`](./api_spec_roadmap.md) | Implementation vs. roadmap diff |
| [`flowchart.md`](./flowchart.md) | System flowchart |
| [`Documentation/`](./Documentation/) | 40+ detailed architecture & design docs |
| [`Roadmaps/PROGRESS.md`](./Roadmaps/PROGRESS.md) | Development progress checklist |