from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes.complaints import router as complaints_router
from apscheduler.schedulers.background import BackgroundScheduler
from services.sla_service import check_all_sla
from contextlib import asynccontextmanager
from api.websocket import router as ws_router

scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(check_all_sla, 'interval', minutes=1)
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(title="Customer Complaint Management API", version="1.0",lifespan=lifespan)

allow_origins=["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(complaints_router)
app.include_router(ws_router,prefix="/api/v1")

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
