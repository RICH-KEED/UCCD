from unittest.mock import MagicMock, patch
import threading
import time


class FakeTweet:
    def __init__(self, tid: int, text: str, screen_name: str):
        self.id = tid
        self.text = text
        self.author = FakeAuthor(screen_name)


class FakeAuthor:
    def __init__(self, screen_name: str):
        self.screen_name = screen_name


def make_channel():
    from services.channels.twitter import TwitterChannel

    channel = TwitterChannel()
    channel._client = MagicMock()
    channel._last_seen_tweet_id = None
    channel._sessions.clear()
    return channel


def _poll_one(channel, mentions):
    channel._client.get_mentions.return_value = mentions
    with patch("requests.post"), patch("services.channels.twitter.time.sleep"), \
         patch.object(channel, "_log_outbound"):
        channel._stop_flag.clear()
        t = threading.Thread(target=channel._poll_mentions, daemon=True)
        t.start()
        time.sleep(1)
        channel._stop_flag.set()
        t.join(timeout=3)


def test_first_mention_asks_for_complaint():
    channel = make_channel()
    _poll_one(channel, [FakeTweet(100, "Hello", "john_doe")])

    assert channel._client.reply.call_count == 1
    assert "Welcome to Union Bank" in channel._client.reply.call_args[0][0]
    assert "john_doe" in channel._sessions
    assert channel._sessions["john_doe"].step == "complaint"


def test_handle_mention_complaint_to_name():
    channel = make_channel()
    channel._handle_mention("jane", "Hello", 100, "http://localhost:8000")
    channel._handle_mention("jane", "My card is blocked", 101, "http://localhost:8000")
    channel._handle_mention("jane", "John Doe", 102, "http://localhost:8000")

    calls = channel._client.reply.call_args_list
    assert len(calls) == 3
    assert "full name" in str(calls[1])
    assert "account number" in str(calls[2])
    assert channel._sessions["jane"].step == "account_no"
    assert channel._sessions["jane"].complaint_text == "My card is blocked"
    assert channel._sessions["jane"].name == "John Doe"


def test_handle_mention_full_flow():
    channel = make_channel()

    with patch("requests.post") as mock_post:
        mock_post.return_value.status_code = 201
        mock_post.return_value.json.return_value = {"id": "tw-xyz"}

        channel._handle_mention("user1", "Hi", 1, "http://localhost:8000")
        channel._handle_mention("user1", "Transfer failed", 2, "http://localhost:8000")
        channel._handle_mention("user1", "John Doe", 3, "http://localhost:8000")
        channel._handle_mention("user1", "ACC123", 4, "http://localhost:8000")
        channel._handle_mention("user1", "9876543210", 5, "http://localhost:8000")
        channel._handle_mention("user1", "j@example.com", 6, "http://localhost:8000")

    texts = [str(c) for c in channel._client.reply.call_args_list]
    assert any("full name" in t for t in texts)
    assert any("account number" in t for t in texts)
    assert any("phone number" in t for t in texts)
    assert any("email" in t for t in texts)
    assert any("Complaint Registered" in t for t in texts)
    assert channel._sessions["user1"].step == "registered"
    assert channel._sessions["user1"].complaint_id == "tw-xyz"


def test_duplicate_mention_skipped():
    channel = make_channel()
    channel._last_seen_tweet_id = 100
    _poll_one(channel, [FakeTweet(50, "Old", "old_user")])

    channel._client.reply.assert_not_called()


def test_after_registration_no_duplicate():
    from services.channels.twitter import UserSession

    channel = make_channel()
    channel._sessions["user2"] = UserSession(
        step="registered", complaint_text="Old", name="J", account_no="A",
        phone="P", email="E", complaint_id="existing", screen_name="user2",
    )
    channel._handle_mention("user2", "Any msg", 200, "http://localhost:8000")

    assert channel._client.reply.call_count == 1
    assert "registered" in channel._client.reply.call_args[0][0].lower()