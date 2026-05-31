import os
import time
import threading
import logging
import requests
from api.db.session import get_db
from api.models.complaint import Complaint
from agents.orchestrator import run_pipeline
from api.websocket import broadcast_event
from datetime import datetime, timezone
from uuid import uuid4

logger = logging.getLogger(__name__)

def start_telegram_bot():
    """
    Initializes the Telegram bot thread if the token is present.
    """
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token or token == "YOUR_TELEGRAM_BOT_TOKEN" or token.strip() == "":
        logger.info("TELEGRAM_BOT_TOKEN not configured. Telegram bot service remains disabled.")
        return

    thread = threading.Thread(target=poll_telegram_updates, args=(token,), daemon=True)
    thread.start()
    logger.info("Telegram Ingestion bot polling thread started.")

def poll_telegram_updates(token: str):
    offset = 0
    url = f"https://api.telegram.org/bot{token}"
    logger.info("Telegram Bot listener activated. Polling...")

    while True:
        try:
            # Poll for updates
            response = requests.get(
                f"{url}/getUpdates",
                params={"offset": offset, "timeout": 20},
                timeout=25
            )
            if response.status_code != 200:
                logger.warning(f"Telegram API getUpdates returned status {response.status_code}. Retrying in 15 seconds...")
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
                if text_strip == "/start":
                    requests.post(
                        f"{url}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": "🏦 *Welcome to Union Bank of India Support!*\n\nPlease type your complaint or issue details below. Our AI-driven triage system will log it immediately and provide an initial assessment.",
                            "parse_mode": "Markdown"
                        }
                    )
                    continue

                # Inbound complaint flow
                logger.info(f"Telegram Bot received ticket from {username} (Chat ID {chat_id}): '{text_strip[:40]}...'")
                
                # Send typing feedback
                requests.post(f"{url}/sendChatAction", json={"chat_id": chat_id, "action": "typing"})

                # Post complaint to local API (handles WS broadcast + pipeline)
                api_host = os.getenv("API_HOST", "http://localhost:8000")
                payload = {
                    "customer_id": f"TG_{chat_id}",
                    "channel": "Telegram",
                    "source_ref": str(chat_id),
                    "raw_text": text_strip
                }

                try:
                    res = requests.post(f"{api_host}/api/v1/complaints", json=payload, timeout=8)
                    if res.status_code == 201:
                        complaint_data = res.json()
                        complaint_id = complaint_data.get("id")
                        requests.post(
                            f"{url}/sendMessage",
                            json={
                                "chat_id": chat_id,
                                "text": f"🎫 *Ticket Logged!*\n\n*Ticket ID:* `{complaint_id}`\n\nOur AI triage agents are reviewing your case. We will send you an initial report and estimated resolution time shortly.",
                                "parse_mode": "Markdown"
                            }
                        )
                    else:
                        logger.warning(f"API returned status {res.status_code}: {res.text}")
                        # Direct DB write fallback
                        save_fallback_db(chat_id, text_strip)
                except Exception as api_err:
                    logger.warning(f"Failed to post to API: {api_err}. Running DB write fallback...")
                    save_fallback_db(chat_id, text_strip)

        except Exception as e:
            logger.error(f"Error in Telegram Bot update cycle: {e}")
            time.sleep(5)

def save_fallback_db(chat_id: int, text: str):
    """
    Fallback method to save the complaint to the database directly and trigger the pipeline.
    """
    db = next(get_db())
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    url = f"https://api.telegram.org/bot{token}"
    try:
        complaint_id = uuid4()
        db_complaint = Complaint(
            id=complaint_id,
            customer_id=f"TG_{chat_id}",
            channel="Telegram",
            source_ref=str(chat_id),
            raw_text=text,
            status="queued",
            created_at=datetime.now(timezone.utc)
        )
        db.add(db_complaint)
        db.commit()

        # Send status update
        requests.post(
            f"{url}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": f"🎫 *Ticket Logged (DB Fallback)!*\n\n*Ticket ID:* `{complaint_id}`\n\nOur AI agents are analyzing your case.",
                "parse_mode": "Markdown"
            }
        )

        # Broadcast WebSocket creation
        broadcast_event({
            "type": "complaint_created",
            "ts": datetime.now(timezone.utc).isoformat(),
            "complaint_id": str(complaint_id),
            "status": "queued",
            "channel": "Telegram",
            "customer_id": f"TG_{chat_id}",
            "raw_text": text,
        })

        # Launch pipeline thread
        threading.Thread(
            target=run_pipeline,
            kwargs={
                "complaint_id": str(complaint_id),
                "raw_text": text,
                "channel": "Telegram",
                "customer_id": f"TG_{chat_id}"
            },
            daemon=True
        ).start()

    except Exception as db_err:
        logger.error(f"DB Fallback write failed: {db_err}")
        requests.post(
            f"{url}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": "❌ We are experiencing database issues. Your complaint could not be saved. Please try again later."
            }
        )
    finally:
        db.close()
