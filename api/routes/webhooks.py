import hmac
import hashlib
import logging
import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session

from api.db.session import get_db
from api.models.webhook_event import WebhookEvent
from api.config import get_settings
from services.complaint_service import create_complaint_internal
from services.guardrails import check_email_guardrails, GuardResult
from services.email_conversation_agent import (
    get_conversation,
    handle_first_contact_email,
    handle_follow_up_email,
    send_complaint_confirmation,
)
from services.whatsapp_conversation_agent import (
    get_conversation as get_whatsapp_conversation,
    handle_first_contact_whatsapp,
    handle_follow_up_whatsapp,
    send_complaint_confirmation_whatsapp,
)
from services.channels import get_channel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


def _verify_mailgun_signature(token: str, timestamp: str, signature: str, webhook_key: str) -> bool:
    """Verify Mailgun webhook signature using token+timestamp HMAC."""
    if not webhook_key or not token or not timestamp or not signature:
        return False
    payload = f"{timestamp}{token}".encode()
    expected = hmac.new(webhook_key.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def _handle_complaint(event: WebhookEvent, complaint_payload: dict, db: Session) -> None:
    try:
        complaint = create_complaint_internal(complaint_payload)
        event.complaint_id = str(complaint.id)
        event.processed = True
        event.processed_at = datetime.now(timezone.utc)
    except Exception as e:
        logger.error(f"Failed to create complaint from webhook: {e}")
        event.error_message = str(e)


def _is_email_conversation_mode() -> bool:
    settings = get_settings()
    return settings.email_conversation.enabled


def _is_whatsapp_conversation_mode() -> bool:
    settings = get_settings()
    return settings.whatsapp_conversation.enabled


async def _process_whatsapp_conversation(chat_id: str, sender: str, text: str, db: Session) -> dict:
    logger.info(f"[WHATSAPP_WEBHOOK] _process_whatsapp_conversation START — chat_id={chat_id}")
    existing = get_whatsapp_conversation(chat_id)

    if existing:
        result = await handle_follow_up_whatsapp(chat_id, text, sender)
    else:
        result = await handle_first_contact_whatsapp(chat_id, text, sender)

    if result["action"] == "reply":
        channel = get_channel("whatsapp")
        if channel and channel.enabled:
            await channel.send_message(chat_id, result["text"])
        return {"status": "replied", "stage": result["stage"], "language": result.get("language")}

    complaint_payload = result["complaint_payload"]
    details = result.get("details", {})

    event = WebhookEvent(
        channel="whatsapp",
        event_type="message",
        raw_payload={"chatId": chat_id, "body": text, "sender": sender},
        received_at=datetime.now(timezone.utc),
        processed=True,
        processed_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.commit()

    complaint = create_complaint_internal(complaint_payload)
    event.complaint_id = str(complaint.id)
    db.commit()

    confirmation_task = asyncio.create_task(
        send_complaint_confirmation_whatsapp(
            chat_id=chat_id,
            complaint_id=str(complaint.id),
            customer_name=details.get("customer_name", "Customer"),
            language=result.get("language", "en"),
        )
    )
    confirmation_task.add_done_callback(
        lambda t: logger.error(
            f"WhatsApp complaint confirmation task failed for {chat_id}: {t.exception()}"
        ) if t.exception() else None
    )

    return {"status": "complaint_created", "complaint_id": str(complaint.id)}


async def _process_email_direct(from_addr: str, subject: str, body_text: str, message_id: str, db: Session) -> dict:
    event = WebhookEvent(
        channel="email",
        event_type="inbound_email",
        raw_payload={"from": from_addr, "subject": subject, "text": body_text},
        received_at=datetime.now(timezone.utc),
        processed=True,
        processed_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.commit()

    complaint_payload = {
        "customer_id": from_addr,
        "channel": "email",
        "source_ref": from_addr,
        "raw_text": f"Subject: {subject}\n\n{body_text}",
        "bot_slots": {"email_subject": subject, "message_id": message_id},
    }
    complaint = create_complaint_internal(complaint_payload)
    event.complaint_id = str(complaint.id)
    db.commit()
    return {"status": "complaint_created", "complaint_id": str(complaint.id)}


async def _process_email_conversation(from_addr: str, subject: str, body_text: str, message_id: str, db: Session) -> dict:
    logger.info(f"[EMAIL_WEBHOOK] _process_email_conversation START — from={from_addr}, subject={subject[:50]}")
    existing = get_conversation(from_addr)

    if existing:
        result = await handle_follow_up_email(from_addr, body_text)
    else:
        result = await handle_first_contact_email(from_addr, subject, body_text, message_id)

    if result["action"] == "reply":
        channel = get_channel("email")
        if channel and channel.enabled:
            await channel.send_message(
                from_addr,
                result["text"],
                subject=f"Re: {subject}" if subject else "Union Bank of India — Support",
            )
        return {"status": "replied", "stage": result["stage"], "language": result.get("language")}

    complaint_payload = result["complaint_payload"]
    details = result.get("details", {})

    event = WebhookEvent(
        channel="email",
        event_type="inbound_email",
        raw_payload={"from": from_addr, "subject": subject, "text": body_text},
        received_at=datetime.now(timezone.utc),
        processed=True,
        processed_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.commit()

    complaint = create_complaint_internal(complaint_payload)
    event.complaint_id = str(complaint.id)
    db.commit()

    confirmation_task = asyncio.create_task(
        send_complaint_confirmation(
            from_addr=from_addr,
            complaint_id=str(complaint.id),
            customer_name=details.get("customer_name", "Customer"),
            language=result.get("language", "en"),
        )
    )
    confirmation_task.add_done_callback(
        lambda t: logger.error(
            f"Complaint confirmation task failed for {from_addr}: {t.exception()}"
        ) if t.exception() else None
    )

    return {"status": "complaint_created", "complaint_id": str(complaint.id)}


@router.post("/email")
async def mailgun_inbound(request: Request, db: Session = Depends(get_db)):
    logger.info(f"[EMAIL_WEBHOOK] ======= EMAIL WEBHOOK START =======")
    logger.info(f"[EMAIL_WEBHOOK] Request received from {request.client.host if request.client else 'unknown'}")
    settings = get_settings()
    logger.info(f"[EMAIL_WEBHOOK] Email configured: {settings.email.is_configured()}, domain: '{settings.email.mailgun_domain}', from_addr: '{settings.email.from_address}'")
    logger.info(f"[EMAIL_WEBHOOK] Webhook key present: {bool(settings.email.inbound_webhook_key)}")
    logger.info(f"[EMAIL_WEBHOOK] Conversation mode enabled: {settings.email_conversation.enabled}")
    if not settings.email.is_configured():
        raise HTTPException(status_code=503, detail="Email channel not configured")

    body = await request.body()

    try:
        payload = await request.json()
        if not isinstance(payload, dict):
            payload = {"data": payload}
        logger.info(f"[EMAIL_WEBHOOK] JSON payload received: {payload}")
    except Exception:
        # Try to parse as form data (Mailgun webhooks)
        try:
            from urllib.parse import parse_qs
            form_data = parse_qs(body.decode(errors="replace"))
            # Flatten the data (parse_qs returns lists for each key)
            payload = {k: v[0] if v and len(v) == 1 else v for k, v in form_data.items()}
            logger.info(f"[EMAIL_WEBHOOK] Form payload received: {payload}")
        except Exception as e:
            payload = {"raw_body": body.decode(errors="replace")}
            logger.info(f"[EMAIL_WEBHOOK] Raw body received (form parse failed: {e}): {body.decode(errors='replace')[:200]}")

    if settings.email.inbound_webhook_key:
        # Get signature data - handle case where it might be a string instead of dict
        signature_raw = payload.get("signature")
        logger.info(f"[EMAIL_WEBHOOK] Signature raw value: {signature_raw}, type: {type(signature_raw)}")
        
        sig_data = {}
        
        if isinstance(signature_raw, dict):
            sig_data = signature_raw
        elif isinstance(signature_raw, str):
            try:
                import json
                sig_data = json.loads(signature_raw)
            except Exception:
                # For form-encoded forward format: signature is hex string, timestamp/token are top-level
                sig_data = {
                    "timestamp": payload.get("timestamp", ""),
                    "token": payload.get("token", ""),
                    "signature": signature_raw,
                }
                logger.info(f"[EMAIL_WEBHOOK] Extracted signature from top-level fields: {sig_data}")
        # If signature_raw is None or other type, sig_data remains empty dict
        
        token = sig_data.get("token", "")
        timestamp = sig_data.get("timestamp", "")
        sig_hash = sig_data.get("signature", "")
        logger.info(f"[EMAIL_WEBHOOK] Signature verification - token: '{token}', timestamp: '{timestamp}', sig_hash present: {bool(sig_hash)}")
        if not _verify_mailgun_signature(token, timestamp, sig_hash, settings.email.inbound_webhook_key):
            logger.warning(f"[EMAIL_WEBHOOK] Invalid webhook signature - token: '{token}', timestamp: '{timestamp}', sig_hash: '{sig_hash}', key_present: {bool(settings.email.inbound_webhook_key)}")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
        else:
            logger.info(f"[EMAIL_WEBHOOK] Webhook signature verified successfully")

    from_addr = payload.get("sender", payload.get("from", ""))
    subject = payload.get("subject", "")
    text = payload.get("text", payload.get("stripped-text", payload.get("body", "")))
    message_id = payload.get("Message-Id", payload.get("message-id", ""))

    # Handle Mailgun event-data envelope format
    event_data = payload.get("event-data")
    if event_data and isinstance(event_data, dict):
        msg = event_data.get("message", {})
        headers = msg.get("headers", {}) if isinstance(msg, dict) else {}
        from_addr = from_addr or headers.get("from", "")
        subject = subject or headers.get("subject", "")
        message_id = message_id or headers.get("message-id", "")
        text = text or msg.get("stripped-text", msg.get("body-plain", ""))
        event_type = event_data.get("event", "")
        logger.info(f"[EMAIL_WEBHOOK] event-data format detected, event_type={event_type}")

    logger.info(f"[EMAIL_WEBHOOK] Extracted fields - from_addr: '{from_addr}', subject: '{subject}', text_length: {len(text) if text else 0}, message_id: '{message_id}'")
    
    # Log all payload keys for debugging
    logger.info(f"[EMAIL_WEBHOOK] Payload keys: {list(payload.keys())}")
    if len(str(payload)) < 500:  # Only log small payloads to avoid huge logs
        logger.info(f"[EMAIL_WEBHOOK] Full payload: {payload}")

    event = WebhookEvent(
        channel="email",
        event_type="inbound_email",
        raw_payload=payload if isinstance(payload, dict) else {"data": str(payload)},
        received_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.commit()

    if not text or not from_addr:
        event.processed = True
        event.error_message = "Missing required fields (from/text)"
        db.commit()
        logger.info(f"[EMAIL_WEBHOOK] Missing required fields - from_addr: '{from_addr}', text: '{text}'")
        return {"status": "ignored", "reason": "missing_fields"}

    guard_report = check_email_guardrails(
        from_addr=from_addr,
        subject=subject,
        body_text=(text or ""),
    )

    if guard_report.result == GuardResult.BLOCK:
        logger.warning(
            f"Email BLOCKED by guardrails — from={from_addr}, "
            f"risk={guard_report.risk_score:.2f}, patterns={guard_report.blocked_patterns}"
        )
        event.processed = True
        event.error_message = f"Blocked by guardrails: {guard_report.reason}"
        db.commit()
        return {"status": "blocked", "reason": guard_report.reason}

    sanitized_text = text
    if guard_report.result == GuardResult.SANITIZE and guard_report.sanitized_text:
        sanitized_text = guard_report.sanitized_text
        logger.info(f"Email sanitized — from={from_addr}, risk={guard_report.risk_score:.2f}")

    # Check if there is an unresolved complaint for this customer awaiting details
    from api.models.complaint import Complaint
    pending_complaint = (
        db.query(Complaint)
        .filter(Complaint.customer_id == from_addr)
        .filter(Complaint.status != "resolved")
        .filter(Complaint.awaiting_details == True)
        .order_by(Complaint.created_at.desc())
        .first()
    )
    if pending_complaint:
        from services.channels import extract_details_llm
        details = extract_details_llm(sanitized_text)
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

            from services.channels import get_channel
            channel = get_channel("email")
            if channel and channel.enabled:
                msg = f"Thank you. Your details ({', '.join(updated_fields)}) have been updated for Ticket ID {pending_complaint.id}."
                target_lang = pending_complaint.detected_language or pending_complaint.language_code or "en-IN"
                if target_lang != "en-IN":
                    try:
                        from services.translation_service import SarvamTranslationService, TranslationStage
                        svc = SarvamTranslationService()
                        res = await svc.translate(msg, TranslationStage.PREVIEW, target_lang)
                        msg = res.get("translated_text", msg)
                    except Exception:
                        pass
                await channel.send_message(
                    from_addr,
                    msg,
                    subject=f"Details Updated — #{str(pending_complaint.id)[:8]}",
                )

            event.processed = True
            event.processed_at = datetime.now(timezone.utc)
            db.commit()
            return {"status": "details_updated", "complaint_id": str(pending_complaint.id)}
        else:
            from services.channels import get_channel
            channel = get_channel("email")
            if channel and channel.enabled:
                msg = "We could not verify your details. Please reply with your full name, email address, phone number, and account number."
                target_lang = pending_complaint.detected_language or pending_complaint.language_code or "en-IN"
                if target_lang != "en-IN":
                    try:
                        from services.translation_service import SarvamTranslationService, TranslationStage
                        svc = SarvamTranslationService()
                        res = await svc.translate(msg, TranslationStage.PREVIEW, target_lang)
                        msg = res.get("translated_text", msg)
                    except Exception:
                        pass
                await channel.send_message(
                    from_addr,
                    msg,
                    subject=f"Details Needed — #{str(pending_complaint.id)[:8]}",
                )

            event.processed = True
            event.processed_at = datetime.now(timezone.utc)
            db.commit()
            return {"status": "details_needed", "complaint_id": str(pending_complaint.id)}

    try:
        conv_mode = _is_email_conversation_mode()
        logger.info(f"[EMAIL_WEBHOOK] Conversation mode={conv_mode}")
        if conv_mode:
            logger.info("[EMAIL_WEBHOOK] Routing to AI conversation agent")
            result = await _process_email_conversation(
                from_addr=from_addr,
                subject=subject,
                body_text=sanitized_text,
                message_id=message_id,
                db=db,
            )
        else:
            result = await _process_email_direct(
                from_addr=from_addr,
                subject=subject,
                body_text=sanitized_text,
                message_id=message_id,
                db=db,
            )
        event.processed = True
        event.processed_at = datetime.now(timezone.utc)
        db.commit()
        return result
    except Exception as e:
        logger.error(f"Email processing failed: {e}")
        event.error_message = str(e)
        db.commit()
        return {"status": "error", "reason": str(e)}


@router.post("/whatsapp")
async def openwa_callback(request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    if not settings.whatsapp.is_configured():
        raise HTTPException(status_code=503, detail="WhatsApp channel not configured")

    body = await request.body()
    try:
        payload = await request.json()
        if not isinstance(payload, dict):
            payload = {"data": payload}
    except Exception:
        payload = {"raw_body": body.decode(errors="replace")}

    event = WebhookEvent(
        channel="whatsapp",
        event_type=payload.get("event", "message"),
        raw_payload=payload if isinstance(payload, dict) else {"data": str(payload)},
        received_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.commit()

    try:
        # OpenWA webhook dispatches put the message fields inside a nested "data" dict
        msg_data = payload.get("data") if isinstance(payload.get("data"), dict) else payload

        chat_id = msg_data.get("chatId") or msg_data.get("from")
        text = msg_data.get("body") or msg_data.get("content", "")
        sender = msg_data.get("sender", {}).get("id", msg_data.get("author", ""))

        if not text or not chat_id:
            event.processed = True
            event.error_message = "Missing required fields (chatId/body)"
            db.commit()
            return {"status": "ignored", "reason": "missing_fields"}

        # Check if there is an unresolved complaint for this customer awaiting details
        from api.models.complaint import Complaint
        pending_complaint = (
            db.query(Complaint)
            .filter(Complaint.customer_id == (sender or f"WA_{chat_id}"))
            .filter(Complaint.status != "resolved")
            .filter(Complaint.awaiting_details == True)
            .order_by(Complaint.created_at.desc())
            .first()
        )
        if pending_complaint:
            from services.channels import extract_details_llm
            details = extract_details_llm(text)
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

                from services.channels import get_channel
                channel = get_channel("whatsapp")
                if channel and channel.enabled:
                    msg = f"Thank you. Your details ({', '.join(updated_fields)}) have been updated for Ticket ID {pending_complaint.id}."
                    target_lang = pending_complaint.detected_language or pending_complaint.language_code or "en-IN"
                    if target_lang != "en-IN":
                        try:
                            from services.translation_service import SarvamTranslationService, TranslationStage
                            svc = SarvamTranslationService()
                            res = await svc.translate(msg, TranslationStage.PREVIEW, target_lang)
                            msg = res.get("translated_text", msg)
                        except Exception:
                            pass
                    await channel.send_message(chat_id, msg)

                event.processed = True
                event.processed_at = datetime.now(timezone.utc)
                db.commit()
                return {"status": "details_updated", "complaint_id": str(pending_complaint.id)}
            else:
                from services.channels import get_channel
                channel = get_channel("whatsapp")
                if channel and channel.enabled:
                    msg = "We could not verify your details. Please reply with your full name, email address, phone number, and account number."
                    target_lang = pending_complaint.detected_language or pending_complaint.language_code or "en-IN"
                    if target_lang != "en-IN":
                        try:
                            from services.translation_service import SarvamTranslationService, TranslationStage
                            svc = SarvamTranslationService()
                            res = await svc.translate(msg, TranslationStage.PREVIEW, target_lang)
                            msg = res.get("translated_text", msg)
                        except Exception:
                            pass
                    await channel.send_message(chat_id, msg)

                event.processed = True
                event.processed_at = datetime.now(timezone.utc)
                db.commit()
                return {"status": "details_needed", "complaint_id": str(pending_complaint.id)}

        if _is_whatsapp_conversation_mode():
            result = await _process_whatsapp_conversation(
                chat_id=chat_id,
                sender=sender,
                text=text,
                db=db,
            )
            event.processed = True
            event.processed_at = datetime.now(timezone.utc)
            db.commit()
            return result
        else:
            from services.channels import extract_details_llm
            details = extract_details_llm(text)

            complaint_payload = {
                "customer_id": sender or f"WA_{chat_id}",
                "channel": "whatsapp",
                "source_ref": chat_id,
                "raw_text": text,
            }
            if details.get("name"):
                complaint_payload["customer_name"] = details["name"]
            if details.get("account_no"):
                complaint_payload["account_number"] = details["account_no"]
            if details.get("phone"):
                complaint_payload["customer_phone"] = details["phone"]
            if details.get("email"):
                complaint_payload["customer_email"] = details["email"]

            _handle_complaint(event, complaint_payload, db)

    except Exception as e:
        logger.error(f"open-wa webhook processing failed: {e}")
        event.error_message = str(e)

    db.commit()
    return {"status": "received"}


@router.get("/{channel}/health")
def webhook_health(channel: str):
    from services.channels import get_channel

    ch = get_channel(channel)
    if ch is None:
        raise HTTPException(status_code=404, detail=f"Channel '{channel}' not registered")
    return {"channel": ch.name, "display_name": ch.display_name, "enabled": ch.enabled}


@router.get("/status")
def channel_status():
    from services.channels import list_channels
    from api.schemas.channel import ChannelStatus

    channels = [
        ChannelStatus(
            name=ch.name,
            display_name=ch.display_name,
            enabled=ch.enabled,
            supports_inbound=ch.supports_inbound,
            supports_outbound=ch.supports_outbound,
            inbound_method=ch.inbound_method,
        )
        for ch in list_channels()
    ]
    return {"channels": [c.model_dump() for c in channels]}