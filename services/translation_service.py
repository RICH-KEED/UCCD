import os
import asyncio
import logging
from enum import Enum
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_api_key_cache: Optional[str] = None

def _get_api_key() -> str:
    global _api_key_cache
    if _api_key_cache is None:
        _api_key_cache = os.getenv("SARVAM_ACCESS_TOKEN", "")
    return _api_key_cache

class TranslationStage(Enum):
    INBOUND = "inbound"
    PREVIEW = "preview"
    DRAFT = "draft"
    REPORT = "report"

class SarvamTranslationService:

    def __init__(self):
        self.api_key = _get_api_key()
        if not self.api_key:
            logger.warning("[WARN] SARVAM_ACCESS_TOKEN not set. Translation will be skipped.")
        elif len(self.api_key.strip()) < 10:
            logger.warning("[WARN] SARVAM_ACCESS_TOKEN appears too short")

    @staticmethod
    def _route(stage: TranslationStage, target_lang: Optional[str] = None) -> dict:
        if stage in (TranslationStage.INBOUND, TranslationStage.PREVIEW):
            return {
                "model": "mayura:v1",
                "mode": "modern-colloquial",
                "source_language_code": "auto",
                "target_language_code": target_lang or "en-IN",
            }
        return {
            "model": "sarvam-translate:v1",
            "mode": "formal",
            "source_language_code": "en-IN",
            "target_language_code": target_lang or "en-IN",
        }

    async def _call_sarvam(self, payload: dict, endpoint: str = "/translate") -> dict:
        async with httpx.AsyncClient(
            base_url="https://api.sarvam.ai",
            headers={"api-subscription-key": self.api_key, "Content-Type": "application/json"},
            timeout=30.0,
        ) as client:
            response = await client.post(endpoint, json=payload)
        if response.status_code >= 500:
            response.raise_for_status()
        if response.status_code >= 400:
            response.raise_for_status()
        return response.json()

    async def _call_with_fallback(
        self, primary_payload: dict, fallback_payload: dict, original_text: str, endpoint: str = "/translate"
    ) -> dict:
        try:
            return await self._call_sarvam(primary_payload, endpoint)
        except Exception as e:
            logger.error(f"[Sarvam] Primary translation failed: {e}")
            try:
                return await self._call_sarvam(fallback_payload, endpoint)
            except Exception as e2:
                logger.error(f"[Sarvam] Fallback translation failed: {e2}")
                return {
                    "translated_text": original_text,
                    "detected_language": None,
                    "model_used": None,
                    "mode_used": None,
                    "translation_status": "failed",
                }

    async def translate(
        self,
        text: str,
        stage: TranslationStage,
        target_lang: Optional[str] = None,
        source_lang: Optional[str] = None,
    ) -> dict:
        if not text or not text.strip():
            return {
                "translated_text": text,
                "detected_language": None,
                "model_used": None,
                "mode_used": None,
                "translation_status": "skipped",
            }

        if not self.api_key:
            return {
                "translated_text": text,
                "detected_language": None,
                "model_used": None,
                "mode_used": None,
                "translation_status": "skipped",
            }

        if "\n" in text:
            lines = text.split("\n")
            async def translate_line(line: str) -> dict:
                if not line.strip():
                    return {"translated_text": line, "translation_status": "success"}
                return await self.translate(line, stage, target_lang, source_lang)

            results = await asyncio.gather(*(translate_line(l) for l in lines))
            translated_lines = [r.get("translated_text", "") for r in results]
            first_success = next((r for r in results if r.get("translation_status") == "success" and r.get("model_used")), {})
            return {
                "translated_text": "\n".join(translated_lines),
                "detected_language": first_success.get("detected_language"),
                "model_used": first_success.get("model_used"),
                "mode_used": first_success.get("mode_used"),
                "translation_status": "success",
            }

        route = self._route(stage, target_lang)
        if source_lang:
            route["source_language_code"] = source_lang
        if target_lang:
            route["target_language_code"] = target_lang

        payload = {
            "input": text,
            **route,
        }

        try:
            result = await self._call_sarvam(payload)
            translated = result.get("translated_text", text)
            detected_lang = result.get("source_language_code")
            target = route.get("target_language_code", "en-IN")

            # Fallback: mayura:v1 auto-detect may fail for longer texts,
            # returning same text + detecting as target language
            if (stage in (TranslationStage.INBOUND, TranslationStage.PREVIEW)
                    and translated == text
                    and detected_lang == target
                    and route.get("source_language_code") == "auto"):
                for src in ("hi-IN", "ta-IN", "te-IN", "bn-IN", "mr-IN", "gu-IN"):
                    fallback_route = {**route, "source_language_code": src, "model": "sarvam-translate:v1", "mode": "formal"}
                    try:
                        fb = await self._call_sarvam({"input": text, **fallback_route})
                        fb_text = fb.get("translated_text", text)
                        if fb_text != text:
                            logger.info(f"[Sarvam] INBOUND fallback succeeded with lang={src}")
                            return {
                                "translated_text": fb_text,
                                "detected_language": fb.get("source_language_code", src),
                                "model_used": "sarvam-translate:v1",
                                "mode_used": "formal",
                                "translation_status": "success",
                            }
                    except Exception:
                        continue

            return {
                "translated_text": translated,
                "detected_language": detected_lang,
                "model_used": route["model"],
                "mode_used": route["mode"],
                "translation_status": "success",
            }
        except Exception as e:
            status_code = getattr(e, "response", None)
            if status_code is not None and hasattr(status_code, "status_code"):
                code = status_code.status_code
            else:
                code = None

            if code and 500 <= code < 600:
                logger.warning(f"[Sarvam] 5xx error, retrying after 1s: {e}")
                await asyncio.sleep(1)
                try:
                    result = await self._call_sarvam(payload)
                    return {
                        "translated_text": result.get("translated_text", text),
                        "detected_language": result.get("source_language_code"),
                        "model_used": route["model"],
                        "mode_used": route["mode"],
                        "translation_status": "success",
                    }
                except Exception as retry_err:
                    logger.error(f"[Sarvam] Retry failed: {retry_err}")

            if stage in (TranslationStage.DRAFT, TranslationStage.REPORT):
                fallback_route = {
                    "model": "mayura:v1",
                    "mode": "formal",
                    "source_language_code": "en-IN",
                    "target_language_code": target_lang or "en-IN",
                }
                fallback_payload = {"input": text, **fallback_route}
                return await self._call_with_fallback(payload, fallback_payload, text)

            logger.error(f"[Sarvam] Translation failed: {e}")
            return {
                "translated_text": text,
                "detected_language": None,
                "model_used": None,
                "mode_used": None,
                "translation_status": "failed",
            }

    async def generate_multilingual_reply(
        self,
        prompt: str,
        target_lang: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ) -> dict:
        """Generate a reply using Sarvam-105B in the user's language."""
        if not self.api_key:
            return {
                "generated_text": prompt,
                "translated_text": None,
                "translation_status": "skipped",
            }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": "sarvam-105b",
            "messages": messages,
            "temperature": 0.7,
            "top_p": 1,
        }

        try:
            result = await self._call_sarvam(payload, "/v1/chat/completions")
            generated = result.get("choices", [{}])[0].get("message", {}).get("content", prompt)
            return {
                "generated_text": generated,
                "translation_status": "success",
            }
        except Exception as e:
            logger.error(f"[Sarvam-105B] Generation failed: {e}")
            return {
                "generated_text": prompt,
                "translation_status": "failed",
            }
