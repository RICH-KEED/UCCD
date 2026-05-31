import logging
import re
from datetime import datetime, timezone

import requests
from services.channels.base import BaseChannel
from api.config import get_settings
from api.models.outbound_message import OutboundMessage
from api.db.session import get_db

logger = logging.getLogger(__name__)

MAILGUN_API = "https://api.mailgun.net/v3"


class EmailChannel(BaseChannel):
    name = "email"
    display_name = "Email"
    supports_inbound = True
    supports_outbound = True
    inbound_method = "webhook"

    def __init__(self):
        settings = get_settings()
        self._settings = settings.email

    def is_configured(self) -> bool:
        return self._settings.is_configured()

    async def start(self) -> None:
        if not self.is_configured():
            logger.info("Email (Mailgun) not configured. Skipping.")
            return
        logger.info("EmailChannel ready for webhook inbound + Mailgun API outbound.")

    async def stop(self) -> None:
        logger.info("EmailChannel stopped.")

    async def send_message(self, source_ref: str, text: str, **kwargs) -> bool:
        if not self._settings.mailgun_api_key or not self._settings.mailgun_domain:
            return False

        subject = kwargs.get("subject", "Union Bank of India — Support Update")
        from_addr = self._settings.from_address

        # Bold any UUID in the text
        def bold_uuids(match):
            return f'<b>{match.group(0)}</b>'

        text = re.sub(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', bold_uuids, text, flags=re.IGNORECASE)

        data = {
            "from": f"Union Bank of India <{from_addr}>",
            "to": source_ref,
            "subject": subject,
            "html": (
                f'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:10px;">'
                f'<div style="background:#0033a0;padding:16px;text-align:center;">'
                f'<h2 style="color:#fff;margin:0;">Union Bank of India</h2></div>'
                f'<div style="padding:12px;border:1px solid #ddd;white-space:pre-wrap;">{text}</div>'
                f'<div style="font-size:12px;color:#888;margin-top:16px;">'
                f'This is an automated message from Union Bank of India Customer Support.</div></div>'
            ),
        }

        try:
            response = requests.post(
                f"{MAILGUN_API}/{self._settings.mailgun_domain}/messages",
                auth=("api", self._settings.mailgun_api_key),
                data=data,
                timeout=10,
            )
            success = response.status_code == 200
            if success:
                provider_id = response.json().get("id", "")
            else:
                provider_id = None
            self._log_outbound(source_ref, text, success, None if success else f"HTTP {response.status_code}: {response.text}", provider_id)
            return success
        except Exception as e:
            self._log_outbound(source_ref, text, False, str(e))
            logger.error(f"Mailgun send failed: {e}")
            return False

    def _log_outbound(self, source_ref: str, text: str, success: bool, error: str | None, provider_id: str | None = None) -> None:
        db = next(get_db())
        try:
            record = OutboundMessage(
                channel="email",
                source_ref=source_ref,
                message_text=text,
                status="sent" if success else "failed",
                provider_message_id=provider_id,
                error_message=error,
            )
            db.add(record)
            db.commit()
        except Exception:
            pass
        finally:
            db.close()