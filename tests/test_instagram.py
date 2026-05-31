from unittest.mock import MagicMock, patch
import threading
import time


class FakeMessage:
    def __init__(self, msg_id: str, user_id: str, text: str):
        self.id = msg_id
        self.item_id = msg_id
        self.user_id = user_id
        self.text = text


class FakeThread:
    def __init__(self, pk: int):
        self.pk = pk


class FakeUser:
    def __init__(self, pk: str, username: str):
        self.pk = pk
        self.username = username


class FakeMedia:
    def __init__(self, media_id: str, user_id: str, username: str, caption_text: str):
        self.id = media_id
        self.pk = media_id
        self.user = FakeUser(user_id, username)
        self.caption_text = caption_text


def make_channel():
    from services.channels.instagram import InstagramChannel

    channel = InstagramChannel()
    channel._client = MagicMock()
    channel._own_user_id = "11111"
    channel._last_seen_message_ids.clear()
    channel._sessions.clear()
    return channel


def _poll_one(channel, messages):
    channel._client.direct_threads.return_value = [FakeThread(999)]
    channel._client.direct_messages.return_value = messages
    channel._client.usertag_medias.return_value = []
    with patch("requests.post"), patch("services.channels.instagram.time.sleep"), \
         patch.object(channel, "_log_outbound"), patch.object(channel, "_save_last_seen"):
        channel._stop_flag.clear()
        t = threading.Thread(target=channel._poll_dms, daemon=True)
        t.start()
        time.sleep(1)
        channel._stop_flag.set()
        t.join(timeout=3)


def test_first_dm_asks_for_complaint():
    channel = make_channel()
    _poll_one(channel, [FakeMessage("msg-1", "22222", "Hello")])

    assert channel._client.direct_send.call_count == 1
    assert "Welcome" in channel._client.direct_send.call_args[0][0]
    assert "22222" in channel._sessions
    assert channel._sessions["22222"].step == "complaint"


def test_tagged_post_comments_and_sends_message_request():
    channel = make_channel()
    media = FakeMedia("media-1", "22222", "john_doe", "My card is blocked")

    with patch.object(channel, "_log_outbound"):
        channel._handle_tagged_media(media)

    channel._client.media_comment.assert_called_once()
    assert "sorry" in channel._client.media_comment.call_args[0][1].lower()
    channel._client.direct_send.assert_called_once()
    assert "Kindly share" in channel._client.direct_send.call_args[0][0]
    assert channel._client.direct_send.call_args.kwargs["user_ids"] == [22222]
    assert channel._sessions["22222"].step == "details"
    assert channel._sessions["22222"].complaint_text == "My card is blocked"


def test_tagged_post_details_dm_registers_complaint():
    channel = make_channel()
    media = FakeMedia("media-1", "22222", "john_doe", "My card is blocked")

    with patch.object(channel, "_log_outbound"):
        channel._handle_tagged_media(media)

    details = {
        "name": "John Doe",
        "account_no": "123456",
        "phone": "9876543210",
        "email": "j@example.com",
        "complaint_text": "My card is blocked",
    }
    with patch("services.channels.instagram.extract_details_llm", return_value=details), \
         patch("requests.post") as mock_post, \
         patch("requests.put"):
        mock_post.return_value.status_code = 201
        mock_post.return_value.json.return_value = {"id": "ig-tag"}

        channel._handle_dm("22222", "Name John Doe account 123456 phone 9876543210 email j@example.com", "999", "http://localhost:8000")

    payload = mock_post.call_args.kwargs["json"]
    assert payload["channel"] == "instagram"
    assert payload["raw_text"] == "My card is blocked"
    assert payload["language_code"] == "en-IN"
    assert channel._sessions["22222"].step == "registered"
    assert channel._sessions["22222"].complaint_id == "ig-tag"


def test_hindi_dm_uses_hindi_prompts_and_registration():
    channel = make_channel()

    with patch("requests.post") as mock_post, patch("requests.put"):
        mock_post.return_value.status_code = 201
        mock_post.return_value.json.return_value = {"id": "ig-hi"}

        channel._handle_dm("33333", "मेरी कार्ड पेमेंट फेल हो गई", "888", "http://localhost:8000")
        channel._handle_dm("33333", "मेरी कार्ड पेमेंट फेल हो गई", "888", "http://localhost:8000")
        channel._handle_dm("33333", "राजेश कुमार", "888", "http://localhost:8000")
        channel._handle_dm("33333", "1234567890", "888", "http://localhost:8000")
        channel._handle_dm("33333", "9876543210", "888", "http://localhost:8000")
        channel._handle_dm("33333", "r@example.com", "888", "http://localhost:8000")

    texts = [c.args[0] for c in channel._client.direct_send.call_args_list]
    assert any("कृपया" in t for t in texts)
    assert any("शिकायत दर्ज" in t for t in texts)
    assert mock_post.call_args.kwargs["json"]["language_code"] == "hi-IN"


def test_handle_dm_complaint_to_name():
    channel = make_channel()
    channel._handle_dm("33333", "Hello", "888", "http://localhost:8000")
    channel._handle_dm("33333", "My card is blocked", "888", "http://localhost:8000")
    channel._handle_dm("33333", "John Doe", "888", "http://localhost:8000")

    calls = channel._client.direct_send.call_args_list
    assert len(calls) == 3
    assert "full name" in str(calls[1])
    assert "account number" in str(calls[2])
    assert channel._sessions["33333"].step == "account_no"
    assert channel._sessions["33333"].complaint_text == "My card is blocked"
    assert channel._sessions["33333"].name == "John Doe"


def test_handle_dm_full_flow():
    channel = make_channel()

    with patch("requests.post") as mock_post:
        mock_post.return_value.status_code = 201
        mock_post.return_value.json.return_value = {"id": "ig-xyz"}

        channel._handle_dm("44444", "Hi", "888", "http://localhost:8000")
        channel._handle_dm("44444", "Transfer failed", "888", "http://localhost:8000")
        channel._handle_dm("44444", "John Doe", "888", "http://localhost:8000")
        channel._handle_dm("44444", "ACC123", "888", "http://localhost:8000")
        channel._handle_dm("44444", "9876543210", "888", "http://localhost:8000")
        channel._handle_dm("44444", "j@example.com", "888", "http://localhost:8000")

    texts = [str(c) for c in channel._client.direct_send.call_args_list]
    assert any("full name" in t for t in texts)
    assert any("account number" in t for t in texts)
    assert any("phone number" in t for t in texts)
    assert any("email" in t for t in texts)
    assert any("Complaint Registered" in t for t in texts)
    assert channel._sessions["44444"].step == "registered"
    assert channel._sessions["44444"].complaint_id == "ig-xyz"


def test_duplicate_message_skipped():
    channel = make_channel()
    channel._last_seen_message_ids.add("msg-old")
    _poll_one(channel, [FakeMessage("msg-old", "55555", "Already seen")])

    channel._client.direct_send.assert_not_called()
    assert "55555" not in channel._sessions


def test_own_message_skipped():
    channel = make_channel()
    _poll_one(channel, [FakeMessage("msg-own", "11111", "outbound msg")])

    channel._client.direct_send.assert_not_called()
    assert "11111" not in channel._sessions
