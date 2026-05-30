from fastapi import WebSocket, APIRouter , WebSocketDisconnect
from typing import Set
from datetime import datetime, timezone
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._main_loop = None

    def set_main_loop(self, loop):
        self._main_loop = loop

    async def connect(self, websocket:WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

def broadcast_event(message: dict):
    if manager._main_loop is not None and manager._main_loop.is_running():
        asyncio.run_coroutine_threadsafe(manager.broadcast(message), manager._main_loop)
    else:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(manager.broadcast(message))
        except RuntimeError:
            asyncio.run(manager.broadcast(message))


def broadcast_violation_predicted(complaint_id: str, breach_probability: float, reason: str = ""):
    broadcast_event({
        "type": "violation_predicted",
        "ts": datetime.now(timezone.utc).isoformat(),
        "complaint_id": complaint_id,
        "breach_probability": round(breach_probability, 4),
        "reason": reason,
    })


def broadcast_cluster_spike(cluster_id: str, ticket_count: int):
    broadcast_event({
        "type": "cluster_spike",
        "ts": datetime.now(timezone.utc).isoformat(),
        "cluster_id": cluster_id,
        "ticket_count": ticket_count,
    })


def broadcast_agent_overload(agent_email: str, active_tickets: int, capacity: int):
    broadcast_event({
        "type": "agent_overload",
        "ts": datetime.now(timezone.utc).isoformat(),
        "agent": agent_email,
        "active_tickets": active_tickets,
        "capacity": capacity,
    })


def broadcast_pipeline_stage(complaint_id: str, pipeline_run_id: str, stage: str, status: str, data: dict = None, elapsed_ms: float = None):
    broadcast_event({
        "type": "pipeline_stage_completed",
        "ts": datetime.now(timezone.utc).isoformat(),
        "stage": stage,
        "status": status,
        "complaint_id": complaint_id,
        "pipeline_run_id": pipeline_run_id,
        "data": data or {},
        "elapsed_ms": round(elapsed_ms, 1) if elapsed_ms else None,
    })


def broadcast_pipeline_completed(complaint_id: str, pipeline_run_id: str, assigned_to: str = None):
    broadcast_event({
        "type": "pipeline_completed",
        "ts": datetime.now(timezone.utc).isoformat(),
        "complaint_id": complaint_id,
        "pipeline_run_id": pipeline_run_id,
        "assigned_to": assigned_to,
    })

@router.websocket("/ws/supervisor")
async def supervisor_ws(websocket: WebSocket):
    await manager.connect(websocket)
    await websocket.send_json(
        {
            "type": "connected",
            "channel": "supervisor",
            "ts": datetime.now(timezone.utc).isoformat(),
            "active_connections": len(manager.active_connections),
        }
    )
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

