import asyncio
import os
import logging
import threading
import time
from dataclasses import dataclass

import requests

from services.channels.base import BaseChannel
from services.channels import extract_details_llm
from api.db.session import get_db
from api.models.outbound_message import OutboundMessage

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org"

STEPS = ["complaint", "name", "account_no", "phone", "email", "registered"]

STEP_PROMPTS = {
    "complaint": "Please describe your complaint or issue in detail.",
    "name": "Please provide your full name.",
    "account_no": "Please provide your account number.",
    "phone": "Please provide your phone number.",
    "email": "Please provide your email address.",
}


@dataclass
class UserSession:
    step: str = "complaint"
    complaint_text: str = ""
    name: str = ""
    account_no: str = ""
    phone: str = ""
    email: str = ""
    complaint_id: str = ""
    chat_id: int = 0


class TelegramChannel(BaseChannel):
    name = "telegram"
    display_name = "Telegram"
    supports_inbound = True
    supports_outbound = True
    inbound_method = "polling"

    def __init__(self, token: str = "", api_host: str = "http://localhost:8000"):
        self.token = token or os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.api_host = api_host or os.getenv("API_HOST", "http://localhost:8000")
        self._thread: threading.Thread | None = None
        self._stop_flag = threading.Event()
        self._sessions: dict[int, UserSession] = {}

    def is_configured(self) -> bool:
        return bool(self.token and self.token.strip() and self.token != "YOUR_TELEGRAM_BOT_TOKEN")

    async def start(self) -> None:
        if not self.is_configured():
            logger.info("Telegram bot token not configured. Skipping.")
            return
        self._stop_flag.clear()
        self._thread = threading.Thread(target=self._poll_updates, daemon=True)
        self._thread.start()
        logger.info("TelegramChannel polling thread started.")

    async def stop(self) -> None:
        self._stop_flag.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
        logger.info("TelegramChannel stopped.")

    def _send_telegram(self, chat_id: int, text: str, parse_mode: str = "Markdown") -> bool:
        base_url = f"{TELEGRAM_API}/bot{self.token}"
        try:
            r = requests.post(
                f"{base_url}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
                timeout=10,
            )
            return r.status_code == 200
        except Exception as e:
            logger.error(f"Telegram send failed for chat {chat_id}: {e}")
            return False

    def _handle_update(self, chat_id: int, text_strip: str, base_url: str) -> None:
        if chat_id not in self._sessions:
            details = extract_details_llm(text_strip)
            if details["name"] and (details["account_no"] or details["phone"] or details["email"]):
                session = UserSession(chat_id=chat_id)
                session.complaint_text = details["complaint_text"]
                session.name = details["name"]
                session.account_no = details["account_no"] or ""
                session.phone = details["phone"] or ""
                session.email = details["email"] or ""
                logger.info("Telegram: extracted all details from first message, creating complaint directly.")
                self._create_complaint_from_session(session, chat_id, base_url)
                return
            self._sessions[chat_id] = UserSession(chat_id=chat_id)
            self._send_telegram(
                chat_id,
                "\U0001f3e6 *Welcome to Union Bank of India Support!*\n\nPlease describe your complaint or issue in detail.",
            )
            return

        session = self._sessions[chat_id]

        if text_strip.lower() == "/start":
            self._sessions[chat_id] = UserSession(chat_id=chat_id)
            self._send_telegram(
                chat_id,
                "\U0001f3e6 *Welcome to Union Bank of India Support!*\n\nPlease describe your complaint or issue in detail.",
            )
            return

        if text_strip.lower() == "/reset":
            self._sessions[chat_id] = UserSession(chat_id=chat_id)
            self._send_telegram(chat_id, "\U0001f504 *Session reset.*\n\nPlease describe your complaint or issue in detail.")
            return

        if session.step == "registered":
            self._send_telegram(
                chat_id,
                f"\u2705 *Your complaint is registered.*\n\n*Ticket ID:* `{session.complaint_id}`\n\nYou will be notified when it is resolved.",
            )
            del self._sessions[chat_id]
            return

        if session.step == "complaint":
            session.complaint_text = text_strip
            session.step = "name"
            self._send_telegram(chat_id, STEP_PROMPTS["name"])
            return

        if session.step == "name":
            session.name = text_strip
            session.step = "account_no"
            self._send_telegram(chat_id, STEP_PROMPTS["account_no"])
            return

        if session.step == "account_no":
            session.account_no = text_strip
            session.step = "phone"
            self._send_telegram(chat_id, STEP_PROMPTS["phone"])
            return

        if session.step == "phone":
            session.phone = text_strip
            session.step = "email"
            self._send_telegram(chat_id, STEP_PROMPTS["email"])
            return

        if session.step == "email":
            session.email = text_strip
            self._create_complaint_from_session(session, chat_id, base_url)

    def _create_complaint_from_session(self, session: UserSession, chat_id: int, base_url: str) -> None:
        payload = {
            "customer_id": f"TG_{chat_id}",
            "channel": "telegram",
            "source_ref": str(chat_id),
            "raw_text": session.complaint_text,
        }

        try:
            res = requests.post(f"{self.api_host}/api/v1/complaints", json=payload, timeout=8)
            if res.status_code == 201:
                complaint_data = res.json()
                session.complaint_id = complaint_data.get("id")
                session.step = "registered"

                self._update_complaint_details(session)

                self._send_telegram(
                    chat_id,
                    f"\u2705 *Complaint Registered!*\n\n"
                    f"*Ticket ID:* `{session.complaint_id}`\n"
                    f"*Name:* {session.name}\n"
                    f"*Account:* {session.account_no}\n"
                    f"*Phone:* {session.phone}\n"
                    f"*Email:* {session.email}\n\n"
                    f"Our team is reviewing your case. You will be notified when it is resolved.",
                )
            else:
                logger.warning(f"API returned status {res.status_code}: {res.text}")
                self._send_telegram(chat_id, "\u274c Could not register your complaint. Please try again later.")
        except Exception as api_err:
            logger.warning(f"Failed to create complaint: {api_err}")
            self._send_telegram(chat_id, "\u274c Could not register your complaint. Please try again later.")

    def _update_complaint_details(self, session: UserSession) -> None:
        if not session.complaint_id:
            return
        try:
            res = requests.put(
                f"{self.api_host}/api/v1/complaints/{session.complaint_id}/details",
                json={
                    "customer_name": session.name or None,
                    "customer_email": session.email or None,
                    "customer_phone": session.phone or None,
                    "account_number": session.account_no or None,
                },
                timeout=10,
            )
        except Exception:
            pass

    def _poll_updates(self) -> None:
        offset = 0
        base_url = f"{TELEGRAM_API}/bot{self.token}"
        logger.info("Telegram Bot listener activated. Polling...")

        while not self._stop_flag.is_set():
            try:
                response = requests.get(
                    f"{base_url}/getUpdates",
                    params={"offset": offset, "timeout": 20},
                    timeout=25,
                )
                if response.status_code != 200:
                    logger.warning(f"Telegram getUpdates returned {response.status_code}. Retrying...")
                    time.sleep(15)
                    continue

                data = response.json()
                updates = data.get("result", [])
                for update in updates:
                    offset = update["update_id"] + 1
                    message = update.get("message", {})
                    chat = message.get("chat", {})
                    chat_id = chat.get("id")
                    text = message.get("text")
                    from_user = message.get("from", {})
                    username = from_user.get("username") or from_user.get("first_name") or "Telegram User"

                    if not text or not chat_id:
                        continue

                    text_strip = text.strip()
                    logger.info(f"Telegram from {username} (Chat {chat_id}): '{text_strip[:40]}...'")

                    requests.post(f"{base_url}/sendChatAction", json={"chat_id": chat_id, "action": "typing"})

                    self._handle_update(chat_id, text_strip, base_url)

            except Exception as e:
                logger.error(f"Error in Telegram polling cycle: {e}")
                time.sleep(5)
            time.sleep(0.5)

    async def send_message(self, source_ref: str, text: str, **kwargs) -> bool:
        if not self.token:
            return False
        url = f"{TELEGRAM_API}/bot{self.token}/sendMessage"
        payload = {"chat_id": source_ref, "text": text}
        payload.update(kwargs)
        try:
            r = requests.post(url, json=payload, timeout=10)
            success = r.status_code == 200
            self._log_outbound(source_ref, text, success, None if success else r.text, r.json().get("result", {}).get("message_id") if success else None)
            return success
        except Exception as e:
            self._log_outbound(source_ref, text, False, str(e))
            logger.error(f"Telegram send_message failed: {e}")
            return False

    async def format_resolution_message(self, complaint, resolution_text: str) -> str:
        return f"\u2705 *Your Complaint Has Been Resolved!*\n\n*Ticket ID:* `{complaint.id}`\n\n*Resolution:*\n{resolution_text}"

    def _log_outbound(self, source_ref: str, text: str, success: bool, error: str | None, provider_id: str | None = None) -> None:
        db = next(get_db())
        try:
            record = OutboundMessage(
                channel="telegram",
                source_ref=source_ref,
                message_text=text,
                status="sent" if success else "failed",
                provider_message_id=str(provider_id) if provider_id else None,
                error_message=error,
            )
            db.add(record)
            db.commit()
        except Exception:
            pass
        finally:
            db.close()