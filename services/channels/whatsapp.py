import asyncio
import logging
import threading
import time

import requests
from services.channels.base import BaseChannel
from services.channels import extract_details_llm
from api.config import get_settings
from api.models.outbound_message import OutboundMessage
from api.db.session import get_db

logger = logging.getLogger(__name__)


class WhatsAppChannel(BaseChannel):
    name = "whatsapp"
    display_name = "WhatsApp"
    supports_inbound = True
    supports_outbound = True
    inbound_method = "polling"

    def __init__(self):
        settings = get_settings()
        self._settings = settings.whatsapp
        self.base_url = self._settings.openwa_base_url.rstrip("/")
        self.api_key = self._settings.openwa_api_key
        self._thread: threading.Thread | None = None
        self._stop_flag = threading.Event()

    def is_configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    async def start(self) -> None:
        if not self.is_configured():
            logger.info("WhatsApp (open-wa) not configured. Skipping.")
            return
        logger.info("WhatsAppChannel started (webhook mode active).")

    async def stop(self) -> None:
        logger.info("WhatsAppChannel stopped.")

    async def send_message(self, source_ref: str, text: str, **kwargs) -> bool:
        url = f"{self.base_url}/api/sessions/uccd/messages/send-text"
        payload = {"chatId": source_ref, "text": text}
        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
        try:
            r = requests.post(url, json=payload, headers=headers, timeout=10)
            success = r.status_code in (200, 201)
            self._log_outbound(source_ref, text, success, None if success else r.text)
            return success
        except Exception as e:
            self._log_outbound(source_ref, text, False, str(e))
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