import asyncio
import uuid
import time
import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from api.routes.complaints import router as complaints_router
from api.routes.auth import router as auth_router
from api.routes.dashboard import router as dashboard_router
from api.routes.ai import router as ai_router
from api.routes.agents import router as agents_router
from api.routes.analytics import router as analytics_router
from api.routes.simulation import router as simulation_router
from api.routes.history import router as history_router
from api.routes.aliases import router as aliases_router
from api.routes.regulatory import router as regulatory_router
from api.routes.webhooks import router as webhooks_router
from api.routes.pipeline import router as pipeline_router
from apscheduler.schedulers.background import BackgroundScheduler
from services.sla_service import check_all_sla
from services.regulatory_service import check_all_regulatory
from contextlib import asynccontextmanager
from api.websocket import router as ws_router, manager

logger = logging.getLogger("uccd.request")

_console_handler = logging.StreamHandler()
_console_handler.setLevel(logging.INFO)
_console_handler.setFormatter(logging.Formatter("%(levelname)s:%(name)s:%(message)s"))
_loggers = [
    "services.email_conversation_agent",
    "services.guardrails",
    "services.channels.email",
    "api.routes.webhooks",
]
for _name in _loggers:
    _l = logging.getLogger(_name)
    _l.setLevel(logging.INFO)
    _l.propagate = True
    if not _l.handlers:
        _l.addHandler(_console_handler)

scheduler = BackgroundScheduler()


def _register_channels() -> None:
    from services.channels import register
    from services.channels.telegram import TelegramChannel
    from services.channels.email import EmailChannel
    from services.channels.whatsapp import WhatsAppChannel
    from services.channels.twitter import TwitterChannel
    from services.channels.instagram import InstagramChannel

    register(TelegramChannel())
    register(EmailChannel())
    register(WhatsAppChannel())
    register(TwitterChannel())
    register(InstagramChannel())


def run_check_agent_loads():
    from api.db.session import get_db
    from services.agent_service import check_agent_loads
    db = next(get_db())
    try:
        check_agent_loads(db)
    except Exception as e:
        logger.warning(f"Error checking agent loads: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    manager.set_main_loop(asyncio.get_running_loop())
    scheduler.add_job(check_all_sla, 'interval', minutes=1)
    scheduler.add_job(check_all_regulatory, 'interval', minutes=5)
    scheduler.add_job(run_check_agent_loads, 'interval', minutes=5)
    scheduler.start()

    _register_channels()
    from services.channels import start_all
    task = asyncio.create_task(start_all())
    task.add_done_callback(
        lambda t: logger.error(f"Channel startup failed: {t.exception()}") if t.exception() else None
    )

    yield

    from services.channels import stop_all
    asyncio.create_task(stop_all())
    scheduler.shutdown()

app = FastAPI(title="Customer Complaint Management API", version="1.0", lifespan=lifespan)


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS")
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://omniresol.me",
        "https://www.omniresol.me",
        "http://omniresol.me",
        "http://www.omniresol.me",
    ]


allow_origins = _cors_origins()

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    logger.info(
        "rid=%s | %s %s -> %s | %.2fms",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    response.headers["X-Request-ID"] = request_id
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(complaints_router)
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(ai_router)
app.include_router(agents_router)
app.include_router(analytics_router)
app.include_router(simulation_router)
app.include_router(history_router)
app.include_router(aliases_router)
app.include_router(regulatory_router)
app.include_router(webhooks_router)
app.include_router(pipeline_router)
app.include_router(ws_router, prefix="/api/v1")

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

