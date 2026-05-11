from fastapi import WebSocket, APIRouter , WebSocketDisconnect
from typing import Set
from datetime import datetime, timezone
import asyncio

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

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
    """
    Allow sync contexts (routes, schedulers) to broadcast.
    """
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(message))
    except RuntimeError:
        asyncio.run(manager.broadcast(message))

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

