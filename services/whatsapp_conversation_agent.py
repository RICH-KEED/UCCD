import json
import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Optional

from services.cache import r
from agents.utils import groq_chat_completion, safe_parse_json
from services.translation_service import SarvamTranslationService, TranslationStage

logger = logging.getLogger(__name__)

CONVERSATION_TTL_SECONDS = 3600  # 1 hour for chat-based interactions
CONVERSATION_KEY_PREFIX = "whatsapp_conv:"

LANG_NAMES: dict[str, str] = {
    "en": "English", "hi": "Hindi", "bn": "Bengali", "te": "Telugu", "ta": "Tamil",
    "mr": "Marathi", "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam",
    "pa": "Punjabi", "or": "Odia", "as": "Assamese", "ur": "Urdu",
    "es": "Spanish", "fr": "French", "ar": "Arabic",
}

CUSTOMER_DETAIL_KEYS = ("customer_name", "customer_email", "customer_phone", "account_number")

_sarvam: Optional[SarvamTranslationService] = None


def _get_sarvam() -> SarvamTranslationService:
    global _sarvam
    if _sarvam is None:
        _sarvam = SarvamTranslationService()
    return _sarvam


def _conv_key(chat_id: str) -> str:
    cleaned = chat_id.strip().lower()
    return f"{CONVERSATION_KEY_PREFIX}{cleaned}"


def get_conversation(chat_id: str) -> Optional[dict]:
    raw = r.get(_conv_key(chat_id))
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        logger.warning(f"Corrupt conversation state for {chat_id}, clearing.")
        r.delete(_conv_key(chat_id))
        return None


def save_conversation(chat_id: str, state: dict) -> None:
    state["updated_at"] = datetime.now(timezone.utc).isoformat()
    r.setex(_conv_key(chat_id), CONVERSATION_TTL_SECONDS, json.dumps(state, ensure_ascii=False))


def delete_conversation(chat_id: str) -> None:
    r.delete(_conv_key(chat_id))


def _wrap_user_content(text: str, label: str = "customer_message") -> str:
    return f"<{label}>\n{text}\n</{label}>"


def clean_phone_number(chat_id: str) -> str:
    # Extracts the phone number from standard WhatsApp chat IDs (e.g. 919876543210@c.us)
    parts = chat_id.split("@")
    phone = parts[0]
    return re.sub(r"\D", "", phone)


async def _detect_language_via_sarvam(text: str) -> str:
    sarvam = _get_sarvam()
    if not sarvam.api_key:
        return await _detect_language_via_groq(text)

    try:
        result = await sarvam.translate(
            text=text[:300],
            stage=TranslationStage.INBOUND,
            target_lang="en-IN",
        )
        detected = result.get("detected_language")
        if detected and len(detected) <= 5:
            return detected.lower()
    except Exception as e:
        logger.warning(f"Sarvam language detection failed: {e}")

    return await _detect_language_via_groq(text)


async def _detect_language_via_groq(text: str) -> str:
    prompt = (
        "Detect the language of the following text. "
        "Respond with ONLY the ISO 639-1 code (e.g. 'en', 'hi', 'bn', 'te', 'ta', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'ur', 'es', 'fr', 'ar'). "
        "If you cannot determine the language, respond with 'en'.\n\n"
        f"{_wrap_user_content(text[:500])}"
    )
    try:
        completion = await asyncio.to_thread(
            groq_chat_completion,
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            max_tokens=10,
        )
        lang = completion.choices[0].message.content.strip().lower()[:5]
        return lang if lang and len(lang) <= 5 else "en"
    except Exception as e:
        logger.warning(f"Groq language detection failed: {e}")
        sarvam_raw = await _sarvam_llm_complete(prompt, max_tokens=10)
        if sarvam_raw:
            lang = sarvam_raw.strip().lower()[:5]
            return lang if lang and len(lang) <= 5 else "en"
        return "en"


async def _translate_response(text: str, target_lang: str) -> str:
    if target_lang == "en":
        return text

    sarvam = _get_sarvam()
    if not sarvam.api_key:
        logger.info("Sarvam API key not set — skipping translation, sending English response.")
        return text

    try:
        result = await sarvam.translate(
            text=text,
            stage=TranslationStage.DRAFT,
            target_lang=target_lang,
        )
        if result.get("translation_status") == "success":
            return result.get("translated_text", text)
    except Exception as e:
        logger.warning(f"Sarvam translation to {target_lang} failed: {e}")

    return text


async def _sarvam_llm_complete(prompt: str, max_tokens: int = 300) -> Optional[str]:
    sarvam = _get_sarvam()
    if not sarvam.api_key:
        return None

    try:
        result = await sarvam.generate_multilingual_reply(prompt=prompt)
        if result.get("translation_status") == "success":
            return result.get("generated_text", "").strip()
    except Exception as e:
        logger.warning(f"Sarvam LLM completion failed: {e}")

    return None


async def _generate_first_response(text: str, language: str) -> str:
    lang_name = LANG_NAMES.get(language, "English")

    prompt = f"""You are a customer support AI for Union Bank of India. A customer has sent a WhatsApp message.

Customer message: {_wrap_user_content(text[:800], 'customer_message')}
Customer's language: {lang_name} ({language})

Generate a short, friendly, and concise response in ENGLISH (it will be translated to {lang_name} later) to be sent over WhatsApp. 
Structure:
1. Greet the customer warmly and apologize briefly for the issue.
2. Politely request that they reply with the following details to register their complaint:
   - Full Name
   - Account Number (if applicable)
3. Keep it very short, under 80 words, suitable for a single WhatsApp text. Do not use email-like greeting lines like 'Dear Customer' or closing signatures. Just sound like a helpful chat assistant. Do not use markdown/HTML."""
    try:
        completion = await asyncio.to_thread(
            groq_chat_completion,
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            max_tokens=250,
            temperature=0.7,
        )
        english_response = completion.choices[0].message.content.strip()
        return await _translate_response(english_response, language)
    except Exception as e:
        logger.error(f"Groq first WhatsApp response generation failed: {e}")
        sarvam_response = await _sarvam_llm_complete(prompt, max_tokens=250)
        if sarvam_response:
            return await _translate_response(sarvam_response, language)
        fallback = (
            "Thank you for contacting Union Bank of India Support. We apologize for the inconvenience.\n\n"
            "To register your complaint, please reply with your:\n"
            "1. Full Name\n"
            "2. Account Number (if applicable)"
        )
        return await _translate_response(fallback, language)


async def _extract_details(text: str) -> dict:
    prompt = f"""Extract customer details from this WhatsApp message. Return ONLY a valid JSON object with these keys:
- "customer_name": the person's full name
- "account_number": any account number mentioned (digits only)
- "customer_phone": any phone number (10+ digits)
- "customer_email": any email address mentioned

If a field is not found in the text, set its value to null.

{_wrap_user_content(text[:1000])}

Output ONLY the JSON object, nothing else."""
    try:
        completion = await asyncio.to_thread(
            groq_chat_completion,
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            max_tokens=200,
        )
        raw = completion.choices[0].message.content.strip()
        return safe_parse_json(raw)
    except Exception as e:
        logger.error(f"Groq WhatsApp details extraction failed: {e}")
        sarvam_raw = await _sarvam_llm_complete(prompt, max_tokens=200)
        if sarvam_raw:
            return safe_parse_json(sarvam_raw)
        return {}


def _validate_details(details: dict) -> tuple[bool, list[str]]:
    missing = []
    if not details.get("customer_name"):
        missing.append("Full Name")
    # Phone is always known from WhatsApp channel, so we do not strictly require it or other identifiers in the message body.
    return len(missing) == 0, missing


async def _generate_missing_details_response(language: str, missing: list[str]) -> str:
    lang_name = LANG_NAMES.get(language, "English")
    missing_str = ", ".join(missing)

    prompt = f"""You are a customer support AI for Union Bank of India. A customer replied but some details are still missing.

Missing details: {missing_str}
Customer's language: {lang_name} ({language})

Generate a polite WhatsApp message in ENGLISH (it will be translated to {lang_name} later).
Ask the customer to reply with the missing details: {missing_str}.
Keep it very short (under 50 words) and suitable for a chat conversation."""
    try:
        completion = await asyncio.to_thread(
            groq_chat_completion,
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            max_tokens=150,
            temperature=0.7,
        )
        english_response = completion.choices[0].message.content.strip()
        return await _translate_response(english_response, language)
    except Exception as e:
        logger.error(f"Groq WhatsApp missing details response failed: {e}")
        sarvam_response = await _sarvam_llm_complete(prompt, max_tokens=150)
        if sarvam_response:
            return await _translate_response(sarvam_response, language)
        fallback = f"Thank you. We still need your {missing_str} to complete your registration. Please reply with this detail."
        return await _translate_response(fallback, language)


async def _generate_complaint_confirmation(language: str, complaint_id: str, customer_name: str) -> str:
    lang_name = LANG_NAMES.get(language, "English")

    prompt = f"""You are a customer support AI for Union Bank of India. A customer's complaint has been registered.

Customer name: {customer_name}
Complaint ID: {complaint_id}
Customer's language: {lang_name} ({language})

Generate a reassuring confirmation message in ENGLISH (it will be translated to {lang_name} later) to be sent over WhatsApp.
- Greet them (e.g. "Thank you {customer_name}")
- Confirm the complaint is registered
- State the Ticket ID clearly: {complaint_id}
- Keep it under 60 words and suitable for a chat message."""
    try:
        completion = await asyncio.to_thread(
            groq_chat_completion,
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            max_tokens=200,
            temperature=0.7,
        )
        english_response = completion.choices[0].message.content.strip()
        return await _translate_response(english_response, language)
    except Exception as e:
        logger.error(f"Groq WhatsApp confirmation generation failed: {e}")
        sarvam_response = await _sarvam_llm_complete(prompt, max_tokens=200)
        if sarvam_response:
            return await _translate_response(sarvam_response, language)
        fallback = (
            f"Thank you, {customer_name}. Your complaint has been registered successfully.\n\n"
            f"Ticket ID: {complaint_id}\n\n"
            f"Our team is analyzing your case and will get back to you shortly."
        )
        return await _translate_response(fallback, language)


async def handle_first_contact_whatsapp(
    chat_id: str,
    text: str,
    sender: str,
) -> dict:
    language = await _detect_language_via_sarvam(text)
    logger.info(f"New WhatsApp conversation started — chat_id={chat_id}, language={language}")

    # Extract details from first message
    first_details = await _extract_details(text)
    
    # Prepopulate phone from chat ID if not extracted
    if not first_details.get("customer_phone"):
        first_details["customer_phone"] = clean_phone_number(chat_id)

    first_valid, first_missing = _validate_details(first_details)

    if first_valid:
        logger.info(
            f"First WhatsApp message from {chat_id} already contains all required details — "
            f"creating complaint directly."
        )
        complaint_payload = {
            "customer_id": sender or f"WA_{chat_id}",
            "channel": "whatsapp",
            "source_ref": chat_id,
            "raw_text": text,
            "language_code": language,
            **{k: first_details.get(k) for k in CUSTOMER_DETAIL_KEYS},
        }
        return {
            "action": "create_complaint",
            "complaint_payload": complaint_payload,
            "language": language,
            "details": first_details,
        }

    response_text = await _generate_first_response(text, language)

    state = {
        "chat_id": chat_id,
        "sender": sender,
        "stage": "awaiting_details",
        "detected_language": language,
        "original_body": text,
        "accumulated_details": first_details,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    save_conversation(chat_id, state)

    return {
        "action": "reply",
        "text": response_text,
        "language": language,
        "stage": "awaiting_details",
    }


async def handle_follow_up_whatsapp(chat_id: str, text: str, sender: str) -> dict:
    conv = get_conversation(chat_id)
    if conv is None:
        return await handle_first_contact_whatsapp(chat_id, text, sender)

    detected_lang = await _detect_language_via_sarvam(text)
    language = detected_lang if detected_lang != "en" else conv.get("detected_language", "en")

    # Extract new details
    new_details = await _extract_details(text)
    
    # Merge details
    accumulated = conv.get("accumulated_details") or {}
    merged_details = {}
    for k in CUSTOMER_DETAIL_KEYS:
        merged_details[k] = new_details.get(k) or accumulated.get(k)
        
    if not merged_details.get("customer_phone"):
        merged_details["customer_phone"] = clean_phone_number(chat_id)

    valid, missing = _validate_details(merged_details)

    if not valid:
        # Save updated details back to state
        conv["accumulated_details"] = merged_details
        save_conversation(chat_id, conv)
        
        response_text = await _generate_missing_details_response(language, missing)
        return {
            "action": "reply",
            "text": response_text,
            "language": language,
            "stage": "awaiting_details",
        }

    # Combined complaint text
    full_text = f"Initial message:\n{conv.get('original_body', '')}\n\nFollow-up:\n{text}"

    complaint_payload = {
        "customer_id": sender or conv.get("sender") or f"WA_{chat_id}",
        "channel": "whatsapp",
        "source_ref": chat_id,
        "raw_text": full_text,
        "language_code": language,
        **{k: merged_details.get(k) for k in CUSTOMER_DETAIL_KEYS},
    }

    return {
        "action": "create_complaint",
        "complaint_payload": complaint_payload,
        "language": language,
        "details": merged_details,
    }


async def send_complaint_confirmation_whatsapp(
    chat_id: str,
    complaint_id: str,
    customer_name: str,
    language: str,
) -> None:
    from services.channels import get_channel

    response_text = await _generate_complaint_confirmation(language, complaint_id, customer_name)
    channel = get_channel("whatsapp")
    if channel and channel.enabled:
        try:
            await channel.send_message(chat_id, response_text)
        except Exception as e:
            logger.error(f"Failed to send WhatsApp complaint confirmation to {chat_id}: {e}")
    delete_conversation(chat_id)
    logger.info(f"WhatsApp complaint {complaint_id} confirmed to {chat_id}, conversation cleared.")
