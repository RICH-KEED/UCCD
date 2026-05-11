from datetime import datetime, timedelta, timezone
import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from jose import jwt
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    expires_at: str


def _demo_users() -> dict[str, dict[str, str]]:
    """
    Minimal demo auth:
    - Configure via env for quick frontend wiring.
    - Defaults are intentionally simple and should be replaced by real users DB + hashing.
    """
    return {
        os.getenv("DEMO_SUPERVISOR_EMAIL", "supervisor@example.com"): {
            "password": os.getenv("DEMO_SUPERVISOR_PASSWORD", "password"),
            "role": "SUPERVISOR",
        },
        os.getenv("DEMO_AGENT_EMAIL", "agent@example.com"): {
            "password": os.getenv("DEMO_AGENT_PASSWORD", "password"),
            "role": "AGENT",
        },
        os.getenv("DEMO_COMPLIANCE_EMAIL", "compliance@example.com"): {
            "password": os.getenv("DEMO_COMPLIANCE_PASSWORD", "password"),
            "role": "COMPLIANCE",
        },
    }


def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY")
    if not secret:
        raise HTTPException(status_code=500, detail="JWT_SECRET (or SECRET_KEY) is not set")
    return secret


def _issue_token(email: str, role: str, expires_in_minutes: int) -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=expires_in_minutes)
    payload = {"sub": email, "role": role, "iat": int(now.timestamp()), "exp": int(exp.timestamp())}
    token = jwt.encode(payload, _jwt_secret(), algorithm=os.getenv("JWT_ALG", "HS256"))
    return token, exp.isoformat()


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    users = _demo_users()
    user = users.get(body.email)
    if user is None or user["password"] != body.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    expires_in = int(os.getenv("JWT_EXPIRES_MINUTES", "720"))
    token, expires_at = _issue_token(body.email, user["role"], expires_in_minutes=expires_in)
    return LoginResponse(access_token=token, role=user["role"], expires_at=expires_at)

