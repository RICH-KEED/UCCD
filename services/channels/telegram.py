import asyncio
import json
import os
import logging
import threading
import time
import re
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, asdict

import requests

from services.channels.base import BaseChannel
from services.channels import extract_details_llm
from services.cache import r
from api.db.session import get_db
from api.models.outbound_message import OutboundMessage

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org"

CONVERSATION_TTL_SECONDS = 3600
CONVERSATION_KEY_PREFIX = "tg_conv:"

STEPS = ["complaint", "name", "account_no", "phone", "email", "registered"]

STEP_PROMPTS = {
    "complaint": "Please describe your complaint or issue in detail.",
    "name": "Please provide your full name.",
    "account_no": "Please provide your account number.",
    "phone": "Please provide your phone number.",
    "email": "Please provide your email address.",
}

COMPLAINT_ACKNOWLEDGMENT = "Thank you for describing your issue. Now, let's collect your details."


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
    language_code: str = "en-IN"
    updated_at: str = ""


def _tg_conv_key(chat_id: int) -> str:
    return f"{CONVERSATION_KEY_PREFIX}{chat_id}"


def _get_tg_session(chat_id: int) -> Optional[dict]:
    raw = r.get(_tg_conv_key(chat_id))
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        r.delete(_tg_conv_key(chat_id))
        return None


def _save_tg_session(chat_id: int, session: dict) -> None:
    session["updated_at"] = datetime.now(timezone.utc).isoformat()
    r.setex(_tg_conv_key(chat_id), CONVERSATION_TTL_SECONDS, json.dumps(session, ensure_ascii=False))


def _delete_tg_session(chat_id: int) -> None:
    r.delete(_tg_conv_key(chat_id))


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
    def _detect_language(self, text: str) -> str:
        """Detect language of the text. Returns language code like 'hi-IN' or 'en-IN'."""
        # Simple heuristic: if text contains any Hindi character, assume Hindi
        if re.search(r"[\u0900-\u097F]", text):
            return "hi-IN"
        return "en-IN"

    def _translate_text(self, text: str, target_lang: str) -> Optional[str]:
        """Translate English text to target language using Sarvam.
        Returns translated text if successful, else None."""
        if target_lang == "en-IN":
            return text
        try:
            sarvam_key = os.getenv("SARVAM_ACCESS_TOKEN", "")
            if not sarvam_key:
                logger.warning("Sarvam API key not set for translation")
                return None
            resp = requests.post(
                "https://api.sarvam.ai/v1/chat/completions",
                headers={
                    "api-subscription-key": sarvam_key,
                    "Content-Type": "application/json",
                },
                json={
                    "model": "sarvam-105b",
                    "messages": [{"role": "user", "content": f"Translate the following English text to {target_lang}: {text}"}],
                    "temperature": 0.0,
                    "top_p": 1,
                },
                timeout=15,
            )
            if resp.status_code == 200:
                translated = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                return translated.strip() if translated else None
            else:
                logger.warning("Sarvam translation returned status %s", resp.status_code)
                return None
        except Exception as e:
            logger.warning("Sarvam translation failed: %s", e)
            return None

    def _get_localized_text(self, english_text: str, session: UserSession) -> str:
        if session.language_code == "en-IN":
            return english_text
        translated = self._translate_text(english_text, session.language_code)
        if translated is not None:
            return translated
        return english_text   # fallback to English

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
        db = next(get_db())
        try:
            from api.models.complaint import Complaint
            pending_complaint = (
                db.query(Complaint)
                .filter(Complaint.customer_id == f"TG_{chat_id}")
                .filter(Complaint.status != "resolved")
                .filter(Complaint.awaiting_details == True)
                .order_by(Complaint.created_at.desc())
                .first()
            )
            if pending_complaint:
                details = extract_details_llm(text_strip)
                updated_fields = []
                if details.get("name"):
                    pending_complaint.customer_name = details["name"]
                    updated_fields.append("name")
                if details.get("phone"):
                    pending_complaint.customer_phone = details["phone"]
                    updated_fields.append("phone")
                if details.get("email"):
                    pending_complaint.customer_email = details["email"]
                    updated_fields.append("email")
                if details.get("account_no"):
                    pending_complaint.account_number = details["account_no"]
                    updated_fields.append("account number")

                if updated_fields:
                    pending_complaint.awaiting_details = False
                    db.commit()
                    db.refresh(pending_complaint)

                    try:
                        from api.websocket import broadcast_event
                        broadcast_event({
                            "type": "complaint_details_updated",
                            "ts": datetime.now(timezone.utc).isoformat(),
                            "complaint_id": str(pending_complaint.id),
                        })
                    except Exception:
                        pass

                    msg = self._get_localized_text(
                        f"Thank you. Your details ({', '.join(updated_fields)}) have been updated for Ticket ID `{pending_complaint.id}`.",
                        UserSession(language_code=self._detect_language(text_strip))
                    )
                    self._send_telegram(chat_id, msg)
                    return
                else:
                    msg = self._get_localized_text(
                        "We could not verify your details. Please reply with your full name, email address, phone number, and account number.",
                        UserSession(language_code=self._detect_language(text_strip))
                    )
                    self._send_telegram(chat_id, msg)
                    return
        except Exception as e:
            logger.error(f"Error checking pending details in telegram: {e}")
        finally:
            db.close()

        session_raw = _get_tg_session(chat_id)

        if session_raw is None:
            detected_lang = self._detect_language(text_strip)
            details = extract_details_llm(text_strip)
            if details["name"] and (details["account_no"] or details["phone"] or details["email"]):
                session = UserSession(chat_id=chat_id, language_code=detected_lang)
                session.complaint_text = details["complaint_text"]
                session.name = details["name"]
                session.account_no = details["account_no"] or ""
                session.phone = details["phone"] or ""
                session.email = details["email"] or ""
                logger.info("Telegram: extracted all details from first message, creating complaint directly.")
                self._create_complaint_from_session(session, chat_id, base_url)
                return
            session = UserSession(chat_id=chat_id, language_code=detected_lang)
            _save_tg_session(chat_id, asdict(session))
            welcome = self._get_localized_text(
                "\U0001f3e6 *Welcome to Union Bank of India Support!*\n\nPlease describe your complaint or issue in detail.",
                session,
            )
            self._send_telegram(chat_id, welcome)
            return

        session = UserSession(**session_raw)

        if text_strip.lower() == "/start":
            detected_lang = self._detect_language(text_strip)
            new_session = UserSession(chat_id=chat_id, language_code=detected_lang)
            _save_tg_session(chat_id, asdict(new_session))
            welcome = self._get_localized_text(
                "\U0001f3e6 *Welcome to Union Bank of India Support!*\n\nPlease describe your complaint or issue in detail.",
                new_session,
            )
            self._send_telegram(chat_id, welcome)
            return

        if text_strip.lower() == "/reset":
            detected_lang = session.language_code
            new_session = UserSession(chat_id=chat_id, language_code=detected_lang)
            _save_tg_session(chat_id, asdict(new_session))
            reset_msg = self._get_localized_text(
                "\U0001f504 *Session reset.*\n\nPlease describe your complaint or issue in detail.",
                new_session,
            )
            self._send_telegram(chat_id, reset_msg)
            return

        if session.step == "registered":
            msg = self._get_localized_text(
                f"\u2705 *Your complaint is registered.*\n\n*Ticket ID:* `{session.complaint_id}`\n\nYou will be notified when it is resolved.",
                session,
            )
            self._send_telegram(chat_id, msg)
            _delete_tg_session(chat_id)
            return

        if session.step == "complaint":
            session.complaint_text = text_strip
            session.step = "name"
            _save_tg_session(chat_id, asdict(session))
            ack = self._get_localized_text(COMPLAINT_ACKNOWLEDGMENT, session)
            self._send_telegram(chat_id, ack)
            name_prompt = self._get_localized_text(STEP_PROMPTS["name"], session)
            self._send_telegram(chat_id, name_prompt)
            return

        if session.step == "name":
            session.name = text_strip
            session.step = "account_no"
            _save_tg_session(chat_id, asdict(session))
            prompt = self._get_localized_text(STEP_PROMPTS["account_no"], session)
            self._send_telegram(chat_id, prompt)
            return

        if session.step == "account_no":
            session.account_no = text_strip
            session.step = "phone"
            _save_tg_session(chat_id, asdict(session))
            prompt = self._get_localized_text(STEP_PROMPTS["phone"], session)
            self._send_telegram(chat_id, prompt)
            return

        if session.step == "phone":
            session.phone = text_strip
            session.step = "email"
            _save_tg_session(chat_id, asdict(session))
            prompt = self._get_localized_text(STEP_PROMPTS["email"], session)
            self._send_telegram(chat_id, prompt)
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
        if session.language_code != "en-IN":
            payload["language_code"] = session.language_code

        try:
            res = requests.post(f"{self.api_host}/api/v1/complaints", json=payload, timeout=8)
            if res.status_code == 201:
                complaint_data = res.json()
                session.complaint_id = complaint_data.get("id")
                session.step = "registered"
                _save_tg_session(chat_id, asdict(session))

                self._update_complaint_details(session)

                confirm = self._get_localized_text(
                    f"\u2705 *Complaint Registered!*\n\n"
                    f"*Ticket ID:* `{session.complaint_id}`\n"
                    f"*Name:* {session.name}\n"
                    f"*Account:* {session.account_no}\n"
                    f"*Phone:* {session.phone}\n"
                    f"*Email:* {session.email}\n\n"
                    f"Our team is reviewing your case. You will be notified when it is resolved.",
                    session,
                )
                self._send_telegram(chat_id, confirm)
            else:
                logger.warning(f"API returned status {res.status_code}: {res.text}")
                err = self._get_localized_text(
                    "\u274c Could not register your complaint. Please try again later.",
                    session,
                )
                self._send_telegram(chat_id, err)
        except Exception as api_err:
            logger.warning(f"Failed to create complaint: {api_err}")
            err = self._get_localized_text(
                "\u274c Could not register your complaint. Please try again later.",
                session,
            )
            self._send_telegram(chat_id, err)

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