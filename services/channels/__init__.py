import asyncio
import logging
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
        return True

    if channel_name == "twitter":
        msg = (
            f"Ticket ID: {complaint.id}\n"
            f"Category: {complaint.complaint_type or 'General'}\n"
            f"SLA: {sla_hours}h | Severity: {sev_str}"
        )
    else:
        msg = (
            f"Ticket Triage Assessment\n"
            f"Ticket ID: {complaint.id}\n"
            f"Category: {complaint.complaint_type or 'General'}\n"
            f"SLA Deadline: {sla_hours} hours\n"
            f"Severity Level: {sev_str}\n\n"
            f"AI Draft:\n{ai_draft}"
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