import time
import asyncio
import logging
import functools

logger = logging.getLogger(__name__)


def time_node(node_name: str):
    def decorator(func):
        @functools.wraps(func)
        def sync_wrapper(state, *args, **kwargs):
            complaint_id = str(state.get("complaint_id", "unknown"))
            pipeline_run_id = state.get("pipeline_run_id", "")
            start = time.perf_counter()
            logger.info("[%s] START | complaint_id=%s", node_name, complaint_id)
            try:
                result = func(state, *args, **kwargs)
                elapsed = (time.perf_counter() - start) * 1000
                logger.info("[%s] DONE | complaint_id=%s | elapsed=%.1fms", node_name, complaint_id, elapsed)
                try:
                    from api.websocket import broadcast_pipeline_stage
                    safe_result = _safe_serialize(result)
                    broadcast_pipeline_stage(complaint_id, pipeline_run_id, node_name, "completed", safe_result, elapsed)
                except Exception:
                    pass
                return result
            except Exception:
                elapsed = (time.perf_counter() - start) * 1000
                logger.error("[%s] FAILED | complaint_id=%s | elapsed=%.1fms", node_name, complaint_id, elapsed, exc_info=True)
                try:
                    from api.websocket import broadcast_pipeline_stage
                    broadcast_pipeline_stage(complaint_id, pipeline_run_id, node_name, "failed", {}, elapsed)
                except Exception:
                    pass
                raise

        @functools.wraps(func)
        async def async_wrapper(state, *args, **kwargs):
            complaint_id = str(state.get("complaint_id", "unknown"))
            pipeline_run_id = state.get("pipeline_run_id", "")
            start = time.perf_counter()
            logger.info("[%s] START | complaint_id=%s", node_name, complaint_id)
            try:
                result = await func(state, *args, **kwargs)
                elapsed = (time.perf_counter() - start) * 1000
                logger.info("[%s] DONE | complaint_id=%s | elapsed=%.1fms", node_name, complaint_id, elapsed)
                try:
                    from api.websocket import broadcast_pipeline_stage
                    safe_result = _safe_serialize(result)
                    broadcast_pipeline_stage(complaint_id, pipeline_run_id, node_name, "completed", safe_result, elapsed)
                except Exception:
                    pass
                return result
            except Exception:
                elapsed = (time.perf_counter() - start) * 1000
                logger.error("[%s] FAILED | complaint_id=%s | elapsed=%.1fms", node_name, complaint_id, elapsed, exc_info=True)
                try:
                    from api.websocket import broadcast_pipeline_stage
                    broadcast_pipeline_stage(complaint_id, pipeline_run_id, node_name, "failed", {}, elapsed)
                except Exception:
                    pass
                raise

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


def _safe_serialize(data):
    if isinstance(data, dict):
        return {k: _safe_value(v) for k, v in data.items()}
    return {"result": str(data)}


def _safe_value(v):
    if isinstance(v, dict):
        return {kk: _safe_value(vv) for kk, vv in v.items()}
    if isinstance(v, list):
        return [_safe_value(item) for item in v]
    if isinstance(v, (str, int, float, bool, type(None))):
        return v
    return str(v)