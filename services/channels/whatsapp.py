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
        self._stop_flag.clear()
        self._thread = threading.Thread(target=self._poll_messages, daemon=True)
        self._thread.start()
        logger.info("WhatsAppChannel polling thread started.")

    async def stop(self) -> None:
        self._stop_flag.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
        logger.info("WhatsAppChannel stopped.")

    def _poll_messages(self) -> None:
        logger.info("WhatsApp poller activated. Checking for unread messages...")
        while not self._stop_flag.is_set():
            try:
                resp = requests.get(f"{self.base_url}/api/getUnreadMessages", timeout=15)
                if resp.status_code != 200:
                    time.sleep(10)
                    continue

                messages = resp.json().get("response", [])
                for msg in messages:
                    chat_id = msg.get("chatId") or msg.get("from")
                    text = msg.get("body") or msg.get("content", "")
                    sender = msg.get("sender", {}).get("id", msg.get("author", ""))

                    if not text or not chat_id:
                        continue

                    logger.info(f"WhatsApp received message from {sender}: '{text[:40]}...'")

                    details = extract_details_llm(text)

                    api_host = get_settings().api_host
                    payload = {
                        "customer_id": sender or f"WA_{chat_id}",
                        "channel": "whatsapp",
                        "source_ref": chat_id,
                        "raw_text": text,
                    }
                    if details.get("name"):
                        payload["customer_name"] = details["name"]
                    if details.get("account_no"):
                        payload["account_number"] = details["account_no"]
                    if details.get("phone"):
                        payload["customer_phone"] = details["phone"]
                    if details.get("email"):
                        payload["customer_email"] = details["email"]
                    logger.info("WhatsApp details extracted: name=%s, acct=%s, phone=%s, email=%s",
                                details.get("name"), details.get("account_no"),
                                details.get("phone"), details.get("email"))

                    try:
                        res = requests.post(f"{api_host}/api/v1/complaints", json=payload, timeout=10)
                        if res.status_code == 201:
                            complaint_data = res.json()
                            complaint_id = complaint_data.get("id")
                            name_part = f" {details['name']}!" if details.get("name") else ""
                            requests.post(
                                f"{self.base_url}/api/sendMessage",
                                json={
                                    "chatId": chat_id,
                                    "content": f" Thank you{name_part}\n\n*Ticket ID:* `{complaint_id}`\n\nYour complaint has been registered. Our team will review it shortly.",
                                },
                                timeout=10,
                            )
                        else:
                            logger.warning(f"WhatsApp complaint creation returned {res.status_code}")
                    except Exception as api_err:
                        logger.warning(f"Failed to create WhatsApp complaint: {api_err}")

            except Exception as e:
                logger.error(f"Error in WhatsApp polling: {e}")
            finally:
                time.sleep(5)

    async def send_message(self, source_ref: str, text: str, **kwargs) -> bool:
        url = f"{self.base_url}/api/sendMessage"
        payload = {"chatId": source_ref, "content": text}
        payload.update(kwargs)
        try:
            r = requests.post(url, json=payload, timeout=10)
            success = r.status_code == 200
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