import asyncio
import json
import logging
import os
import threading
import time
from dataclasses import dataclass

from services.channels.base import BaseChannel
from services.channels import extract_details_llm
from api.config import get_settings
from api.models.outbound_message import OutboundMessage
from api.db.session import get_db

logger = logging.getLogger(__name__)

STEP_PROMPTS = {
    "name": "Please provide your full name.",
    "account_no": "Please provide your account number.",
    "phone": "Please provide your phone number.",
    "email": "Please provide your email address.",
}

STEP_PROMPTS_HI = {
    "details": (
        "हमें असुविधा के लिए खेद है। कृपया अपनी शिकायत, पूरा नाम, खाता नंबर, "
        "फोन नंबर और ईमेल साझा करें।"
    ),
    "complaint": "कृपया अपनी शिकायत या समस्या विस्तार से बताएं।",
    "name": "कृपया अपना पूरा नाम बताएं।",
    "account_no": "कृपया अपना खाता नंबर बताएं।",
    "phone": "कृपया अपना फोन नंबर बताएं।",
    "email": "कृपया अपना ईमेल पता बताएं।",
    "registered": "आपकी शिकायत दर्ज हो गई है।",
    "try_later": "आपकी शिकायत दर्ज नहीं हो सकी। कृपया बाद में फिर कोशिश करें।",
}

DETAILS_REQUEST_EN = (
    "We are sorry for the inconvenience. Kindly share your complaint, full name, "
    "account number, phone number, and email so we can register this."
)

COMMENT_REPLY_EN = (
    "We are sorry for the inconvenience. We have sent you a message request to collect "
    "the details and register your complaint."
)

COMMENT_REPLY_HI = (
    "हमें असुविधा के लिए खेद है। आपकी शिकायत दर्ज करने के लिए हमने आपको मैसेज भेजा है।"
)


@dataclass
class UserSession:
    step: str = "complaint"
    complaint_text: str = ""
    name: str = ""
    account_no: str = ""
    phone: str = ""
    email: str = ""
    complaint_id: str = ""
    sender_id: str = ""
    language_code: str = "en-IN"


class InstagramChannel(BaseChannel):
    name = "instagram"
    display_name = "Instagram"
    supports_inbound = True
    supports_outbound = True
    inbound_method = "userbot"

    def __init__(self):
        settings = get_settings()
        self._settings = settings.instagram
        self._client = None
        self._own_user_id: str | None = None
        self._thread: threading.Thread | None = None
        self._stop_flag = threading.Event()
        self._last_seen_message_ids: set[str] = set()
        self._last_seen_media_ids: set[str] = set()
        self._last_seen_file = "instagram_last_seen.json"
        self._load_last_seen()
        self._sessions: dict[str, UserSession] = {}

    def _load_last_seen(self) -> None:
        try:
            if os.path.exists(self._last_seen_file):
                with open(self._last_seen_file) as f:
                    data = json.load(f)
                    self._last_seen_message_ids = set(data.get("message_ids", []))
                    self._last_seen_media_ids = set(data.get("media_ids", []))
        except Exception:
            self._last_seen_message_ids = set()
            self._last_seen_media_ids = set()

    def _save_last_seen(self) -> None:
        try:
            ids_list = list(self._last_seen_message_ids)[-2000:]
            media_ids_list = list(self._last_seen_media_ids)[-1000:]
            self._last_seen_message_ids = set(ids_list)
            self._last_seen_media_ids = set(media_ids_list)
            with open(self._last_seen_file, "w") as f:
                json.dump({"message_ids": ids_list, "media_ids": media_ids_list}, f)
        except Exception:
            pass

    def is_configured(self) -> bool:
        return self._settings.is_configured()

    def _console_challenge_handler(self, username: str, choice: str | None = None) -> str | bool:
        import sys

        if choice is None:
            logger.warning(
                "Instagram challenge required for @%s. Check email/phone for verification code.", username
            )
            sys.stderr.write(
                "\n=============================\n"
                f"SECURITY CHALLENGE for @{username}\n"
                "Instagram requires verification. Check your email or phone.\n"
                "=============================\n"
            )
            try:
                code = input("Enter verification code: ").strip()
                return code if code else False
            except (EOFError, OSError):
                logger.error("No TTY available for Instagram challenge input.")
                return False
        else:
            sys.stderr.write(f"\nChallenge: {choice}\n")
            try:
                answer = input("Enter response: ").strip()
                return answer if answer else False
            except (EOFError, OSError):
                return False

    async def start(self) -> None:
        if not self.is_configured():
            logger.info("Instagram userbot not configured. Skipping.")
            return
        try:
            from instagrapi import Client
            from instagrapi.exceptions import (
                ChallengeRequired,
                LoginRequired,
                PleaseWaitFewMinutes,
            )

            self._client = Client()
            session_file = self._settings.session_file

            handler = self._settings.verification_code_handler
            if handler == "console":
                self._client.challenge_code_handler = self._console_challenge_handler
            else:
                logger.info("Instagram verification handler: %s (challenges will not auto-resolve)", handler)

            logged_in = False

            if os.path.exists(session_file):
                try:
                    self._client.load_settings(session_file)
                    self._client.get_timeline_feed()
                    logged_in = True
                    logger.info("Instagram session restored from file.")
                except (LoginRequired, Exception):
                    logger.info("Instagram session expired or invalid, performing fresh login.")
                    try:
                        os.remove(session_file)
                    except OSError:
                        pass

            if not logged_in:
                try:
                    self._client.login(self._settings.username, self._settings.password)
                    self._client.dump_settings(session_file)
                    logger.info("Instagram session saved to %s", session_file)
                except ChallengeRequired:
                    logger.error(
                        "Instagram requires a security challenge. "
                        "Run: python scripts/setup_instagram_session.py"
                    )
                    return
                except PleaseWaitFewMinutes:
                    logger.error("Instagram is rate-limiting. Wait a few minutes and restart.")
                    return

            self._own_user_id = str(self._client.user_id)
            logger.info("Instagram logged in as %s (id=%s)", self._settings.username, self._own_user_id)

        except ImportError:
            logger.error("instagrapi package not installed. Install with: pip install instagrapi")
            return
        except Exception as e:
            logger.error("Instagram sign-in failed: %s", e)
            return

        self._stop_flag.clear()
        self._thread = threading.Thread(target=self._poll_dms, daemon=True)
        self._thread.start()
        logger.info("InstagramChannel userbot polling started.")

    async def stop(self) -> None:
        self._stop_flag.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
        logger.info("InstagramChannel stopped.")

    def _dm_reply(self, thread_id: str, text: str) -> bool:
        if self._client is None:
            return False
        try:
            self._client.direct_send(text[:1000], thread_ids=[int(thread_id)])
            self._log_outbound(thread_id, text[:1000], True, None)
            return True
        except Exception as e:
            self._log_outbound(thread_id, text[:1000], False, str(e))
            logger.error(f"Instagram DM reply failed: {e}")
            return False

    def _dm_user(self, user_id: str, text: str) -> bool:
        if self._client is None:
            return False
        try:
            self._client.direct_send(text[:1000], user_ids=[int(user_id)])
            self._log_outbound(user_id, text[:1000], True, None)
            return True
        except Exception as e:
            self._log_outbound(user_id, text[:1000], False, str(e))
            logger.error("Instagram message request failed: %s", e)
            return False

    def _comment_reply(self, media_id: str, text: str) -> bool:
        if self._client is None:
            return False
        try:
            self._client.media_comment(media_id, text[:1000])
            self._log_outbound(media_id, text[:1000], True, None)
            return True
        except Exception as e:
            self._log_outbound(media_id, text[:1000], False, str(e))
            logger.error("Instagram comment reply failed: %s", e)
            return False

    @staticmethod
    def _detect_language(text: str) -> str:
        if any("\u0900" <= ch <= "\u097F" for ch in text):
            return "hi-IN"
        return "en-IN"

    @staticmethod
    def _is_hindi(language_code: str | None) -> bool:
        return bool(language_code and language_code.lower().startswith("hi"))

    def _prompt(self, key: str, language_code: str | None = None) -> str:
        if self._is_hindi(language_code):
            return STEP_PROMPTS_HI[key]
        if key == "details":
            return DETAILS_REQUEST_EN
        if key == "complaint":
            return "Welcome to Union Bank of India Support!\n\nPlease describe your complaint or issue in detail."
        if key == "registered":
            return "Your complaint is registered."
        if key == "try_later":
            return "Could not register your complaint. Please try again later."
        return STEP_PROMPTS[key]

    def _merge_details(self, session: UserSession, details: dict) -> None:
        if details.get("complaint_text"):
            session.complaint_text = details["complaint_text"]
        if details.get("name"):
            session.name = details["name"]
        if details.get("account_no"):
            session.account_no = details["account_no"]
        if details.get("phone"):
            session.phone = details["phone"]
        if details.get("email"):
            session.email = details["email"]

    def _next_missing_step(self, session: UserSession) -> str | None:
        if not session.complaint_text:
            return "complaint"
        if not session.name:
            return "name"
        if not session.account_no:
            return "account_no"
        if not session.phone:
            return "phone"
        if not session.email:
            return "email"
        return None

    def _handle_tagged_media(self, media) -> None:
        media_id = str(getattr(media, "id", "") or getattr(media, "pk", ""))
        if not media_id or media_id in self._last_seen_media_ids:
            return

        user = getattr(media, "user", None)
        sender_id = str(getattr(user, "pk", "") or getattr(user, "id", ""))
        username = str(getattr(user, "username", "") or sender_id)
        caption = str(getattr(media, "caption_text", "") or getattr(media, "caption", "") or "").strip()
        language_code = self._detect_language(caption)

        self._last_seen_media_ids.add(media_id)
        logger.info("Instagram tagged media from %s: '%s...'", username, caption[:40])

        self._comment_reply(media_id, COMMENT_REPLY_HI if self._is_hindi(language_code) else COMMENT_REPLY_EN)

        if not sender_id:
            logger.warning("Instagram tagged media %s has no author id; cannot send message request.", media_id)
            return

        session = self._sessions.get(sender_id) or UserSession(sender_id=sender_id, language_code=language_code)
        session.language_code = language_code
        session.complaint_text = caption
        session.step = "details"
        self._sessions[sender_id] = session
        self._dm_user(sender_id, self._prompt("details", session.language_code))

    def _handle_dm(self, sender_id: str, text_strip: str, thread_id: str, api_host: str) -> None:
        incoming_language = self._detect_language(text_strip)
        if sender_id not in self._sessions:
            # ── smart extraction: try to pull details from the first message ──
            details = extract_details_llm(text_strip)
            if details["name"] and (details["account_no"] or details["phone"] or details["email"]):
                session = UserSession(sender_id=sender_id, language_code=incoming_language)
                session.complaint_text = details["complaint_text"]
                session.name = details["name"]
                session.account_no = details["account_no"] or ""
                session.phone = details["phone"] or ""
                session.email = details["email"] or ""
                logger.info("Instagram: extracted all details from first DM, creating complaint directly.")
                self._create_complaint_from_session(session, thread_id, api_host)
                return
            # ── normal flow ──
            self._sessions[sender_id] = UserSession(sender_id=sender_id, language_code=incoming_language)
            self._dm_reply(thread_id, self._prompt("complaint", incoming_language))
            return

        session = self._sessions[sender_id]
        if self._is_hindi(incoming_language) or not self._is_hindi(session.language_code):
            session.language_code = incoming_language

        if text_strip.lower() in ("/start", "/reset"):
            self._sessions[sender_id] = UserSession(sender_id=sender_id, language_code=session.language_code)
            self._dm_reply(thread_id, f"Session reset. {self._prompt('complaint', session.language_code)}")
            return

        if session.step == "registered":
            if self._is_hindi(session.language_code):
                self._dm_reply(
                    thread_id,
                    f"{self._prompt('registered', session.language_code)}\n"
                    f"टिकट ID: {session.complaint_id}\n"
                    f"समाधान होने पर आपको सूचित किया जाएगा।"
                )
            else:
                self._dm_reply(thread_id,
                    f"Your complaint is registered.\nTicket ID: {session.complaint_id}\nYou will be notified when it is resolved."
                )
            del self._sessions[sender_id]
            return

        if session.step == "details":
            details = extract_details_llm(text_strip)
            self._merge_details(session, details)
            missing_step = self._next_missing_step(session)
            if missing_step:
                session.step = missing_step
                self._dm_reply(thread_id, self._prompt(missing_step, session.language_code))
                return
            self._create_complaint_from_session(session, thread_id, api_host)
            return

        if session.step == "complaint":
            session.complaint_text = text_strip
            session.step = "name"
            self._dm_reply(thread_id, self._prompt("name", session.language_code))
            return

        if session.step == "name":
            session.name = text_strip
            session.step = "account_no"
            self._dm_reply(thread_id, self._prompt("account_no", session.language_code))
            return

        if session.step == "account_no":
            session.account_no = text_strip
            session.step = "phone"
            self._dm_reply(thread_id, self._prompt("phone", session.language_code))
            return

        if session.step == "phone":
            session.phone = text_strip
            session.step = "email"
            self._dm_reply(thread_id, self._prompt("email", session.language_code))
            return

        if session.step == "email":
            session.email = text_strip
            self._create_complaint_from_session(session, thread_id, api_host)

    def _create_complaint_from_session(self, session: UserSession, thread_id: str, api_host: str) -> None:
        import requests

        payload = {
            "customer_id": f"IG_{session.sender_id}",
            "channel": "instagram",
            "source_ref": thread_id,
            "raw_text": session.complaint_text,
            "language_code": session.language_code,
        }

        try:
            res = requests.post(f"{api_host}/api/v1/complaints", json=payload, timeout=10)
            if res.status_code == 201:
                complaint_data = res.json()
                session.complaint_id = complaint_data.get("id")
                session.step = "registered"

                try:
                    requests.put(
                        f"{api_host}/api/v1/complaints/{session.complaint_id}/details",
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

                if self._is_hindi(session.language_code):
                    self._dm_reply(thread_id,
                        f"शिकायत दर्ज हो गई है!\n"
                        f"टिकट ID: {session.complaint_id}\n"
                        f"नाम: {session.name}\n"
                        f"खाता: {session.account_no}\n"
                        f"फोन: {session.phone}\n"
                        f"ईमेल: {session.email}\n\n"
                        f"हमारी टीम आपके मामले की समीक्षा कर रही है। समाधान होने पर आपको सूचित किया जाएगा।"
                    )
                else:
                    self._dm_reply(thread_id,
                        f"Complaint Registered!\n"
                        f"Ticket ID: {session.complaint_id}\n"
                        f"Name: {session.name}\n"
                        f"Account: {session.account_no}\n"
                        f"Phone: {session.phone}\n"
                        f"Email: {session.email}\n\n"
                        f"Our team is reviewing your case. You will be notified when it is resolved."
                    )
            else:
                logger.warning(f"API returned status {res.status_code}: {res.text}")
                self._dm_reply(thread_id, self._prompt("try_later", session.language_code))
        except Exception as api_err:
            logger.warning(f"Failed to create Instagram complaint: {api_err}")
            self._dm_reply(thread_id, self._prompt("try_later", session.language_code))

    def _poll_dms(self) -> None:
        logger.info("Instagram DM poller activated.")
        api_host = get_settings().api_host

        while not self._stop_flag.is_set():
            try:
                if self._client is None:
                    time.sleep(30)
                    continue

                newly_processed = False
                try:
                    for media in self._client.usertag_medias(self._own_user_id, amount=10):
                        before_count = len(self._last_seen_media_ids)
                        self._handle_tagged_media(media)
                        newly_processed = newly_processed or len(self._last_seen_media_ids) > before_count
                except Exception as e:
                    logger.error("Error polling Instagram tagged media: %s", e)

                threads = self._client.direct_threads(amount=20)
                for thread in threads:
                    thread_id = str(thread.pk)
                    messages = self._client.direct_messages(thread_id, amount=5)
                    for msg in messages:
                        msg_id = str(getattr(msg, "id", "") or getattr(msg, "item_id", ""))
                        if not msg_id or msg_id in self._last_seen_message_ids:
                            continue

                        sender_id = str(msg.user_id)
                        if sender_id == self._own_user_id:
                            self._last_seen_message_ids.add(msg_id)
                            continue

                        text = getattr(msg, "text", "")
                        if not text:
                            self._last_seen_message_ids.add(msg_id)
                            continue

                        self._last_seen_message_ids.add(msg_id)
                        newly_processed = True
                        text_strip = text.strip()
                        logger.info(f"Instagram DM from {sender_id}: '{text_strip[:40]}...'")

                        self._handle_dm(sender_id, text_strip, thread_id, api_host)

                if newly_processed:
                    self._save_last_seen()

            except Exception as e:
                logger.error(f"Error in Instagram DM polling: {e}")
            finally:
                time.sleep(60)

    async def send_message(self, source_ref: str, text: str, **kwargs) -> bool:
        if self._client is None:
            logger.error("Instagram client not authenticated")
            return False

        truncated = text[:1000]
        try:
            self._client.direct_send(truncated, thread_ids=[int(source_ref)])
            self._log_outbound(source_ref, truncated, True, None)
            return True
        except Exception as e:
            self._log_outbound(source_ref, truncated, False, str(e))
            logger.error(f"Instagram send_message failed: {e}")
            return False

    def _log_outbound(self, source_ref: str, text: str, success: bool, error: str | None) -> None:
        db = next(get_db())
        try:
            record = OutboundMessage(
                channel="instagram",
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
