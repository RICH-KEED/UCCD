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


@dataclass
class UserSession:
    step: str = "complaint"
    complaint_text: str = ""
    name: str = ""
    account_no: str = ""
    phone: str = ""
    email: str = ""
    complaint_id: str = ""
    screen_name: str = ""


class TwitterChannel(BaseChannel):
    name = "twitter"
    display_name = "Twitter/X"
    supports_inbound = True
    supports_outbound = True
    inbound_method = "userbot"

    def __init__(self):
        settings = get_settings()
        self._settings = settings.twitter
        self.username = self._settings.username
        self._client = None
        self._last_seen_tweet_id: int | None = None
        self._thread: threading.Thread | None = None
        self._stop_flag = threading.Event()
        self._last_seen_file = "twitter_last_seen.json"
        self._load_last_seen()
        self._sessions: dict[str, UserSession] = {}

    def _load_last_seen(self) -> None:
        try:
            if os.path.exists(self._last_seen_file):
                with open(self._last_seen_file) as f:
                    data = json.load(f)
                    self._last_seen_tweet_id = data.get("last_tweet_id")
        except Exception:
            self._last_seen_tweet_id = None

    def _save_last_seen(self, tweet_id: int) -> None:
        try:
            with open(self._last_seen_file, "w") as f:
                json.dump({"last_tweet_id": tweet_id}, f)
        except Exception:
            pass

    def is_configured(self) -> bool:
        return self._settings.is_configured()

    async def start(self) -> None:
        if not self.is_configured():
            logger.warning("Twitter userbot not configured. Skipping.")
            return

        try:
            from tweety import Twitter as TweetyClient
            from tweety.exceptions import (
                ActionRequired as TweetyActionRequired,
                DeniedLogin as TweetyDeniedLogin,
            )

            self._client = TweetyClient(self.username)

            if self._settings.auth_token:
                logger.warning("Twitter: authenticating via auth_token cookie for @%s...", self.username)
                await self._client.load_auth_token(self._settings.auth_token)
            else:
                await self._client.sign_in(
                    self.username,
                    self._settings.password,
                    extra=self._settings.email or None,
                )
        except ImportError:
            logger.error("tweety-ns package not installed. Install with: pip install tweety-ns")
            self._client = None
            return
        except TweetyActionRequired as e:
            logger.error(
                f"Twitter login requires additional action: {e.message}. "
                "You may need to provide a 2FA code or solve a captcha. "
                "Check your Twitter account security settings."
            )
            self._client = None
            return
        except TweetyDeniedLogin as e:
            logger.error(f"Twitter login denied (invalid auth_token?): {e}")
            self._client = None
            return
        except Exception as e:
            logger.error(f"Twitter sign-in failed: {e}")
            self._client = None
            return

        if self._client.me is None:
            logger.error("Twitter sign-in completed but user is not authenticated. Polling disabled.")
            self._client = None
            return

        self._stop_flag.clear()
        self._thread = threading.Thread(target=self._poll_mentions, daemon=True)
        self._thread.start()
        logger.warning("TwitterChannel userbot polling STARTED for @%s", self.username)

    async def stop(self) -> None:
        self._stop_flag.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
        logger.warning("TwitterChannel stopped.")

    def _is_authenticated(self) -> bool:
        return self._client is not None and self._client.me is not None

    def _run_async(self, coro):
        if not asyncio.iscoroutine(coro) and not hasattr(coro, "__await__") and not isinstance(coro, asyncio.Future):
            return coro
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()

    def _reply(self, tid: int, text: str) -> bool:
        if not self._is_authenticated():
            logger.error("Twitter _reply: client is None (not authenticated)")
            return False
        try:
            self._run_async(self._client.create_tweet(text[:280], reply_to=tid))
            self._log_outbound(str(tid), text[:280], True, None)
            return True
        except Exception as e:
            self._log_outbound(str(tid), text[:280], False, str(e))
            logger.error(f"Twitter reply failed: {e}")
            return False

    def _handle_mention(self, screen_name: str, text_strip: str, tid: int, api_host: str) -> None:
        if screen_name not in self._sessions:
            # ── smart extraction: try to pull details from the first mention ──
            details = extract_details_llm(text_strip)
            if details["name"] and (details["account_no"] or details["phone"] or details["email"]):
                session = UserSession(screen_name=screen_name)
                session.complaint_text = details["complaint_text"]
                session.name = details["name"]
                session.account_no = details["account_no"] or ""
                session.phone = details["phone"] or ""
                session.email = details["email"] or ""
                logger.info("Twitter: extracted all details from first mention, creating complaint directly.")
                self._create_complaint_from_session(session, tid, api_host)
                return
            # ── normal flow ──
            self._sessions[screen_name] = UserSession(screen_name=screen_name)
            if not self._reply(tid,
                f"@{screen_name} Welcome to Union Bank of India Support!\n\nPlease describe your complaint or issue in detail."
            ):
                logger.warning("Twitter: failed to send welcome reply to @%s (tid=%d)", screen_name, tid)
            return

        session = self._sessions[screen_name]

        if text_strip.lower() in ("/start", "/reset"):
            self._sessions[screen_name] = UserSession(screen_name=screen_name)
            if not self._reply(tid, f"@{screen_name} Session reset. Please describe your complaint or issue in detail."):
                logger.warning("Twitter: failed to send reset reply to @%s (tid=%d)", screen_name, tid)
            return

        if session.step == "registered":
            if not self._reply(tid,
                f"@{screen_name} Your complaint is registered. Ticket ID: {session.complaint_id}. You will be notified when it is resolved."
            ):
                logger.warning("Twitter: failed to send registered reply to @%s (tid=%d)", screen_name, tid)
            del self._sessions[screen_name]
            return

        if session.step == "complaint":
            session.complaint_text = text_strip
            session.step = "name"
            if not self._reply(tid, f"@{screen_name} {STEP_PROMPTS['name']}"):
                logger.warning("Twitter: failed to send name prompt to @%s (tid=%d)", screen_name, tid)
            return

        if session.step == "name":
            session.name = text_strip
            session.step = "account_no"
            if not self._reply(tid, f"@{screen_name} {STEP_PROMPTS['account_no']}"):
                logger.warning("Twitter: failed to send account prompt to @%s (tid=%d)", screen_name, tid)
            return

        if session.step == "account_no":
            session.account_no = text_strip
            session.step = "phone"
            if not self._reply(tid, f"@{screen_name} {STEP_PROMPTS['phone']}"):
                logger.warning("Twitter: failed to send phone prompt to @%s (tid=%d)", screen_name, tid)
            return

        if session.step == "phone":
            session.phone = text_strip
            session.step = "email"
            if not self._reply(tid, f"@{screen_name} {STEP_PROMPTS['email']}"):
                logger.warning("Twitter: failed to send email prompt to @%s (tid=%d)", screen_name, tid)
            return

        if session.step == "email":
            session.email = text_strip
            self._create_complaint_from_session(session, tid, api_host)

    def _create_complaint_from_session(self, session: UserSession, tid: int, api_host: str) -> None:
        import requests

        payload = {
            "customer_id": f"@{session.screen_name}",
            "channel": "twitter",
            "source_ref": str(tid),
            "raw_text": session.complaint_text,
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

                self._reply(tid,
                    f"@{session.screen_name} Complaint Registered!\n"
                    f"Ticket ID: {session.complaint_id}\n"
                    f"Name: {session.name}\n"
                    f"Account: {session.account_no}\n"
                    f"Phone: {session.phone}\n"
                    f"Email: {session.email}\n\n"
                    f"Our team is reviewing your case. You will be notified when it is resolved."
                )
            else:
                logger.warning(f"API returned status {res.status_code}: {res.text}")
                self._reply(tid, f"@{session.screen_name} Could not register your complaint. Please try again later.")
        except Exception as api_err:
            logger.warning(f"Failed to create Twitter complaint: {api_err}")
            self._reply(tid, f"@{session.screen_name} Could not register your complaint. Please try again later.")

    def _poll_mentions(self) -> None:
        logger.warning("Twitter mention poller activated for @%s", self.username)
        api_host = get_settings().api_host
        cycle_count = 0

        while not self._stop_flag.is_set():
            try:
                if not self._is_authenticated():
                    logger.warning("Twitter poller: client not authenticated, waiting...")
                    time.sleep(30)
                    continue

                mentions = self._client.get_mentions()
                cycle_count += 1

                if cycle_count % 10 == 0:
                    logger.warning(
                        "Twitter poller heartbeat: cycle=%d, mentions=%d, last_seen_id=%s",
                        cycle_count,
                        len(mentions) if mentions else 0,
                        self._last_seen_tweet_id,
                    )

                if not mentions:
                    time.sleep(30)
                    continue

                max_seen = self._last_seen_tweet_id or 0
                for tweet in mentions:
                    tid = int(getattr(tweet, "id", 0))
                    if tid <= max_seen:
                        continue
                    max_seen = max(max_seen, tid)
                    text = getattr(tweet, "text", "")
                    author = getattr(tweet, "author", {})
                    screen_name = getattr(author, "screen_name", "unknown") if hasattr(author, "screen_name") else "unknown"

                    if not text:
                        continue

                    text_strip = text.strip()
                    logger.warning("Twitter mention from @%s: '%s...'", screen_name, text_strip[:40])

                    self._handle_mention(screen_name, text_strip, tid, api_host)

                self._save_last_seen(max_seen)
                self._last_seen_tweet_id = max_seen

            except Exception as e:
                logger.error(f"Error in Twitter polling: {e}")
            finally:
                time.sleep(60)

    async def send_message(self, source_ref: str, text: str, **kwargs) -> bool:
        if not self._is_authenticated():
            logger.error("Twitter client not authenticated")
            return False

        truncated = text[:280]
        try:
            await self._client.create_tweet(truncated, reply_to=int(source_ref))
            self._log_outbound(source_ref, truncated, True, None)
            return True
        except Exception as e:
            self._log_outbound(source_ref, truncated, False, str(e))
            logger.error(f"Twitter send_message failed: {e}")
            return False

    def _log_outbound(self, source_ref: str, text: str, success: bool, error: str | None) -> None:
        db = next(get_db())
        try:
            record = OutboundMessage(
                channel="twitter",
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