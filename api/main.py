import asyncio
import uuid
import time
import logging
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
from apscheduler.schedulers.background import BackgroundScheduler
from services.sla_service import check_all_sla
from services.regulatory_service import check_all_regulatory
from contextlib import asynccontextmanager
from api.config import get_settings
from api.websocket import router as ws_router, manager

logger = logging.getLogger("uccd.request")

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    manager.set_main_loop(asyncio.get_running_loop())
    scheduler.add_job(check_all_sla, 'interval', minutes=1)
    scheduler.add_job(check_all_regulatory, 'interval', minutes=5)
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

settings = get_settings()

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
    allow_origins=settings.cors_allowed_origins,
    allow_origin_regex=settings.cors_allowed_origin_regex,
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
app.include_router(ws_router, prefix="/api/v1")

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

