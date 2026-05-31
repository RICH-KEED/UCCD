import json
import threading
import time
from unittest.mock import MagicMock, patch

import pytest


class MockRedis:
    def __init__(self):
        self._store = {}

    def get(self, key):
        return self._store.get(key)

    def setex(self, key, ttl, value):
        self._store[key] = value

    def delete(self, key):
        self._store.pop(key, None)


@pytest.fixture(autouse=True)
def mock_redis():
    mock_r = MockRedis()
    with patch("services.channels.telegram.r", mock_r), patch("services.cache.r", mock_r):
        yield mock_r


def make_channel():
    from services.channels.telegram import TelegramChannel, UserSession

    channel = TelegramChannel(token="test-bot-token", api_host="http://localhost:8000")
    return channel, UserSession


def _mock_response(status_code=200, json_data=None):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data or {}
    resp.text = "mock"
    return resp


def _make_update(update_id, chat_id, text):
    return {
        "update_id": update_id,
        "message": {
            "message_id": update_id,
            "chat": {"id": chat_id, "type": "private"},
            "from": {"id": chat_id, "username": "testuser", "first_name": "Test"},
            "text": text,
            "date": 1717000000,
        },
    }


def test_first_message_greets():
    channel, _ = make_channel()
    update = _make_update(100, 55555, "/start")

    with patch("requests.get") as mock_get, patch("requests.post") as mock_post:
        mock_get.side_effect = [
            _mock_response(200, {"ok": True, "result": [update]}),
            _mock_response(200, {"ok": True, "result": []}),
        ]
        channel._stop_flag.clear()
        t = threading.Thread(target=channel._poll_updates, daemon=True)
        t.start()
        time.sleep(2)
        channel._stop_flag.set()
        t.join(timeout=5)

    msgs = [c for c in mock_post.call_args_list if "sendMessage" in str(c)]
    assert len(msgs) == 1
    assert "Welcome to Union Bank of India Support" in str(msgs[0])


def test_describe_complaint_then_asks_name():
    channel, _ = make_channel()
    u1 = _make_update(1, 555, "/start")
    u2 = _make_update(2, 555, "My card is blocked")

    with patch("requests.get") as mock_get, patch("requests.post") as mock_post:
        mock_get.side_effect = [
            _mock_response(200, {"ok": True, "result": [u1]}),
            _mock_response(200, {"ok": True, "result": [u2]}),
            _mock_response(200, {"ok": True, "result": []}),
        ]
        channel._stop_flag.clear()
        t = threading.Thread(target=channel._poll_updates, daemon=True)
        t.start()
        time.sleep(2)
        channel._stop_flag.set()
        t.join(timeout=5)

    msgs = [c for c in mock_post.call_args_list if "sendMessage" in str(c)]
    assert len(msgs) >= 3
    all_text = " ".join(str(c) for c in msgs)
    assert "full name" in all_text


def test_full_conversation_flow():
    channel, _ = make_channel()
    updates = [
        _make_update(1, 999, "/start"),
        _make_update(2, 999, "My card is blocked"),
        _make_update(3, 999, "John Doe"),
        _make_update(4, 999, "ACC123456"),
        _make_update(5, 999, "9876543210"),
        _make_update(6, 999, "john@example.com"),
    ]

    with patch("requests.get") as mock_get, patch("requests.post") as mock_post:
        side_effects = []
        for u in updates:
            side_effects.append(_mock_response(200, {"ok": True, "result": [u]}))
        side_effects.append(_mock_response(200, {"ok": True, "result": []}))
        mock_get.side_effect = side_effects
        mock_post.return_value = _mock_response(201, {"id": "conv-123"})

        channel._stop_flag.clear()
        t = threading.Thread(target=channel._poll_updates, daemon=True)
        t.start()
        time.sleep(3)
        channel._stop_flag.set()
        t.join(timeout=5)

    send_msg_calls = [c for c in mock_post.call_args_list if "sendMessage" in str(c)]
    complaint_calls = [c for c in mock_post.call_args_list if "api/v1/complaints" in str(c)]

    assert len(send_msg_calls) == 7
    assert "Welcome" in str(send_msg_calls[0])
    assert "collect your details" in str(send_msg_calls[1])
    assert "full name" in str(send_msg_calls[2])
    assert "account number" in str(send_msg_calls[3])
    assert "phone number" in str(send_msg_calls[4])
    assert "email" in str(send_msg_calls[5])
    assert len(complaint_calls) == 1

    payload = complaint_calls[0][1]["json"]
    assert payload["raw_text"] == "My card is blocked"
    assert payload["channel"] == "telegram"

    from services.channels.telegram import _get_tg_session
    session = _get_tg_session(999)
    assert session["step"] == "registered"
    assert session["complaint_id"] == "conv-123"


def test_after_registration_no_duplicate():
    channel, UserSession = make_channel()

    from services.channels.telegram import _save_tg_session, asdict
    session = UserSession(
        step="registered",
        complaint_text="Old",
        name="John",
        account_no="ACC",
        phone="123",
        email="j@j.com",
        complaint_id="existing-id",
        chat_id=999,
    )
    _save_tg_session(999, asdict(session))

    update = _make_update(10, 999, "Any random message")

    with patch("requests.get") as mock_get, patch("requests.post") as mock_post:
        mock_get.side_effect = [
            _mock_response(200, {"ok": True, "result": [update]}),
            _mock_response(200, {"ok": True, "result": []}),
        ]
        channel._stop_flag.clear()
        t = threading.Thread(target=channel._poll_updates, daemon=True)
        t.start()
        time.sleep(2)
        channel._stop_flag.set()
        t.join(timeout=5)

    complaint_calls = [c for c in mock_post.call_args_list if "api/v1/complaints" in str(c)]
    assert len(complaint_calls) == 0

    msgs = [c for c in mock_post.call_args_list if "sendMessage" in str(c)]
    assert "registered" in str(msgs[0]).lower()

    from services.channels.telegram import _get_tg_session
    assert _get_tg_session(999) is None


def test_session_is_isolated_per_chat():
    channel, _ = make_channel()
    u1 = _make_update(1, 111, "/start")
    u2 = _make_update(2, 222, "/start")
    u3 = _make_update(3, 111, "Issue from user 111")
    u4 = _make_update(4, 222, "Issue from user 222")

    with patch("requests.get") as mock_get, patch("requests.post") as mock_post:
        mock_get.side_effect = [
            _mock_response(200, {"ok": True, "result": [u1]}),
            _mock_response(200, {"ok": True, "result": [u2]}),
            _mock_response(200, {"ok": True, "result": [u3]}),
            _mock_response(200, {"ok": True, "result": [u4]}),
            _mock_response(200, {"ok": True, "result": []}),
        ]
        channel._stop_flag.clear()
        t = threading.Thread(target=channel._poll_updates, daemon=True)
        t.start()
        time.sleep(3)
        channel._stop_flag.set()
        t.join(timeout=5)

    from services.channels.telegram import _get_tg_session

    s111 = _get_tg_session(111)
    s222 = _get_tg_session(222)
    assert s111 is not None
    assert s222 is not None
    assert s111["step"] == "name"
    assert s222["step"] == "name"
    assert s111["complaint_text"] == "Issue from user 111"
    assert s222["complaint_text"] == "Issue from user 222"