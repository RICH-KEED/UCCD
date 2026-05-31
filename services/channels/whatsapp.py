import asyncio
import logging
import re
import threading
import time

import requests
from services.channels.base import BaseChannel
from services.channels import extract_details_llm
from api.config import get_settings
from api.models.outbound_message import OutboundMessage
from api.db.session import get_db

logger = logging.getLogger(__name__)


def _normalize_chat_id(chat_id: str) -> str:
    if "@" in chat_id:
        return chat_id
    clean = re.sub(r"\D", "", chat_id)
    return f"{clean}@c.us"


class WhatsAppChannel(BaseChannel):
    name = "whatsapp"
    display_name = "WhatsApp"
    supports_inbound = True
    supports_outbound = True
    inbound_method = "webhook"

    def __init__(self):
        settings = get_settings()
        self._settings = settings.whatsapp
        self.base_url = self._settings.openwa_base_url.rstrip("/")
        self.api_key = self._settings.openwa_api_key
        self.webhook_secret = None
        self._thread: threading.Thread | None = None
        self._stop_flag = threading.Event()

    def is_configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    async def start(self) -> None:
        if not self.is_configured():
            logger.info("WhatsApp (open-wa) not configured. Skipping.")
            return

        webhook_url = self._settings.webhook_url
        if webhook_url:
            session_name = self._settings.openwa_session_name
            headers = {
                "X-API-Key": self.api_key,
                "Content-Type": "application/json",
            }

            try:
                list_url = f"{self.base_url}/api/sessions/{session_name}/webhooks"
                existing = requests.get(list_url, headers=headers, timeout=10)
                webhooks = existing.json() if existing.status_code == 200 else []
                if isinstance(webhooks, list):
                    url_match = next((w for w in webhooks if w.get("url") == webhook_url), None)
                    if url_match:
                        logger.info(f"Webhook already registered for session '{session_name}': {webhook_url}")
                    else:
                        create_url = f"{self.base_url}/api/sessions/{session_name}/webhooks"
                        payload = {
                            "url": webhook_url,
                            "events": ["message.received"],
                        }
                        r = requests.post(create_url, json=payload, headers=headers, timeout=10)
                        if r.status_code in (200, 201):
                            logger.info(f"Webhook registered for session '{session_name}': {webhook_url}")
                        else:
                            logger.error(f"Failed to register webhook ({r.status_code}): {r.text}")
                else:
                    logger.error(f"Unexpected webhook list response: {existing.text}")
            except Exception as e:
                logger.error(f"Webhook registration failed: {e}")
        else:
            logger.info("WhatsAppChannel started (no webhook URL configured).")

    async def stop(self) -> None:
        logger.info("WhatsAppChannel stopped.")

    async def send_message(self, source_ref: str, text: str, **kwargs) -> bool:
        chat_id = _normalize_chat_id(source_ref)
        url = f"{self.base_url}/api/sessions/{self._settings.openwa_session_name}/messages/send-text"
        payload = {"chatId": chat_id, "text": text}
        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
        try:
            r = requests.post(url, json=payload, headers=headers, timeout=10)
            success = r.status_code in (200, 201)
            self._log_outbound(chat_id, text, success, None if success else r.text)
            return success
        except Exception as e:
            self._log_outbound(chat_id, text, False, str(e))
            logger.error(f"WhatsApp send_message failed: {e}")
            return False

    def _log_outbound(self, source_ref: str, text: str, success: bool, error: str | None) -> None:
        db = next(get_db())
        try:
            record = OutboundMessage(
                channel="whatsapp",
                source_ref=source_ref,
                message_text=text,
                status="sent" if success else "failed",
                error_message=error,
            )
            db.add(record)
            db.commit()
        except Exception:
            pass
        finally:
            db.close()