import asyncio
import logging
import os
import re
from typing import Optional

from services.channels.base import BaseChannel

logger = logging.getLogger(__name__)

_registry: dict[str, BaseChannel] = {}


def register(channel: BaseChannel) -> None:
    if not channel.is_configured():
        logger.info(f"Channel '{channel.name}' is not configured — skipping registration.")
        return
    channel.enabled = True
    _registry[channel.name] = channel
    logger.info(f"Channel '{channel.name}' ({channel.display_name}) registered.")


def get_channel(name: str) -> Optional[BaseChannel]:
    return _registry.get(name)


def list_channels() -> list[BaseChannel]:
    return list(_registry.values())


def try_extract_details(text: str) -> dict:
    """Try to extract customer details from a free-text message.
    Returns dict with keys: name, account_no, phone, email, complaint_text.
    complaint_text is the full text stripped of trailing detail markers.
    All values are None if not found."""
    result: dict = {
        "name": None,
        "account_no": None,
        "phone": None,
        "email": None,
        "complaint_text": text.strip(),
    }

    # ── email ──
    email_match = re.search(r"[\w\.\-]+@[\w\.\-]+\.\w{2,}", text)
    if email_match:
        result["email"] = email_match.group(0).strip()

    # ── phone (10-14 digits, optional + prefix, spaces/dashes allowed) ──
    phone_match = re.search(r"(\+?\d[\d\s\-()]{8,16}\d)", text)
    if phone_match:
        raw = re.sub(r"[\s\-()]", "", phone_match.group(0))
        if 10 <= len(raw) <= 14:
            result["phone"] = raw

    # ── account number (prefix-aware, then bare digits fallback) ──
    acct_match = re.search(
        r"(?:ACC(?:OUNT)?|ACCT|A/?C)\s*#?\s*(\d{4,16})", text, re.IGNORECASE
    )
    if acct_match:
        result["account_no"] = acct_match.group(1)
    else:
        acct_match = re.search(r"\b(\d{6,16})\b", text)
        if acct_match:
            result["account_no"] = acct_match.group(1)

    # ── name ──
    name_match = re.search(
        r"(?:name\s*(?:is|:)?\s*|I\s+am\s+|this\s+is\s+)"
        r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})", text
    )
    if not name_match:
        name_match = re.search(
            r"(?:called|named)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})", text
        )
    if not name_match:
        name_match = re.search(
            r"\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){1,3})\b", text
        )
    if name_match:
        result["name"] = name_match.group(1).strip()

    # ── strip detail clues from complaint_text ──
    body = result["complaint_text"]
    for pat in [
        r"\bname\b", r"\baccount\b", r"\bACC\b", r"\bphone\b", r"\bemail\b",
        r"\b[^.]+@[^.]+\.\w+\b",
    ]:
        if re.search(pat, body, re.IGNORECASE):
            body = re.sub(rf"({pat})[^\n]*", "", body, flags=re.IGNORECASE)
            body = body.strip().rstrip(",;").strip()
    result["complaint_text"] = body if body else text.strip()

    return result


def extract_details_llm(text: str) -> dict:
    """Use the Groq LLM to extract customer details from free-text,
    with Sarvam AI as fallback, and regex as last-resort fallback.
    Returns dict with: name, account_no, phone, email, complaint_text."""
    from agents.utils import groq_chat_completion, safe_parse_json

    if not text or not text.strip():
        return try_extract_details(text)

    prompt = (
        "Extract customer details from this message. "
        "Return ONLY a valid JSON object (no markdown, no backticks) with these keys:\n"
        '- "customer_name": the person\'s full name\n'
        '- "account_number": any account number mentioned (digits only)\n'
        '- "customer_phone": any phone number (10+ digits)\n'
        '- "customer_email": any email address mentioned\n'
        '- "complaint_text": a short one-sentence summary of the complaint or issue described\n\n'
        "If a field is not found in the text, set its value to null.\n\n"
        f"Message:\n{text}"
    )

    result: dict = {
        "name": None,
        "account_no": None,
        "phone": None,
        "email": None,
        "complaint_text": text.strip(),
    }

    raw = None

    # ── try Groq ──
    try:
        completion = groq_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            max_tokens=200,
            temperature=0.0,
        )
        raw = completion.choices[0].message.content.strip()
    except Exception as e:
        logger.warning("Groq detail extraction failed: %s", e)

    # ── fallback: Sarvam AI ──
    if not raw:
        try:
            sarvam_key = os.getenv("SARVAM_ACCESS_TOKEN", "")
            if sarvam_key:
                import requests as _r
                resp = _r.post(
                    "https://api.sarvam.ai/v1/chat/completions",
                    headers={
                        "api-subscription-key": sarvam_key,
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "sarvam-105b",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.0,
                        "top_p": 1,
                    },
                    timeout=15,
                )
                if resp.status_code == 200:
                    raw = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                    raw = raw.strip() if raw else None
                    logger.info("Sarvam LLM extraction succeeded as fallback.")
                else:
                    logger.warning("Sarvam LLM returned status %s", resp.status_code)
        except Exception as se:
            logger.warning("Sarvam LLM detail extraction failed: %s", se)

    # ── parse LLM output ──
    if raw:
        parsed = safe_parse_json(raw) if isinstance(raw, str) else {}
        result["name"] = parsed.get("customer_name") or None
        result["account_no"] = parsed.get("account_number") or None
        result["phone"] = parsed.get("customer_phone") or None
        result["email"] = parsed.get("customer_email") or None
        if parsed.get("complaint_text"):
            result["complaint_text"] = parsed["complaint_text"]
        return result

    # ── last resort: regex ──
    logger.warning("Both Groq and Sarvam LLM failed — falling back to regex extraction.")
    return try_extract_details(text)


async def send_response(complaint, text: str) -> bool:
    channel_name = complaint.channel.lower()
    channel = _registry.get(channel_name)
    if not channel or not channel.enabled:
        logger.warning(f"No enabled channel found for '{channel_name}' — cannot send response.")
        return False
    if not complaint.source_ref:
        logger.warning(f"Complaint {complaint.id} has no source_ref — cannot send response via {channel_name}.")
        return False
    return await channel.send_message(complaint.source_ref, text)


def _severity_str(complaint) -> str:
    if complaint.severity_score is not None:
        return f"{complaint.severity_score:.2f}"
    return "N/A"


def send_response_sync(complaint, text: str) -> bool:
    return asyncio.run(send_response(complaint, text))


def send_triage_update_sync(complaint, ai_draft: str) -> bool:
    return asyncio.run(send_triage_update(complaint, ai_draft))


async def send_triage_update(complaint, ai_draft: str) -> bool:
    channel_name = complaint.channel.lower()
    channel = _registry.get(channel_name)
    if not channel or not channel.enabled:
        logger.warning(f"No enabled channel found for '{channel_name}' — cannot send triage update.")
        return False
    if not complaint.source_ref:
        logger.warning(f"Complaint {complaint.id} has no source_ref — cannot send triage via {channel_name}.")
        return False

    tier_hours = {"REGULATORY": 5, "HIGH": 24, "MEDIUM": 48, "NORMAL": 72}
    sla_hours = tier_hours.get(complaint.sla_tier, 72)
    sev_str = _severity_str(complaint)

    if channel_name in ("instagram", "telegram"):
        return False

    if channel_name == "twitter":
        msg = (
            f"Ticket ID: {complaint.id}\n"
            f"Category: {complaint.complaint_type or 'General'}\n"
            f"SLA: {sla_hours}h | Severity: {sev_str}"
        )
    else:
        msg = (
            f"TICKET TRIAGE ASSESSMENT\n"
            f"=========================\n\n"
            f"Ticket ID       : {complaint.id}\n"
            f"Category        : {complaint.complaint_type or 'General'}\n"
            f"SLA Deadline    : {sla_hours} hours\n"
            f"Severity Level  : {sev_str}\n\n"
            f"--- AI DRAFT RESPONSE ---\n\n"
            f"{ai_draft}\n\n"
            f"---\n"
            f"This is an automated triage update from Union Bank of India Support."
        )
    return await channel.send_message(complaint.source_ref, msg)


async def start_all() -> None:
    for channel in _registry.values():
        if channel.enabled:
            try:
                await channel.start()
            except Exception as e:
                logger.error(f"Failed to start channel '{channel.name}': {e}")


async def stop_all() -> None:
    for channel in _registry.values():
        if channel.enabled:
            try:
                await channel.stop()
            except Exception as e:
                logger.error(f"Failed to stop channel '{channel.name}': {e}")