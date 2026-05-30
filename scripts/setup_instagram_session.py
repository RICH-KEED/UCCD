"""Interactive script to set up Instagram session with challenge handling.

Usage:
    python scripts/setup_instagram_session.py

Performs an interactive login to Instagram, handling any security challenges
(2FA, verification codes). The session file is saved to the project root and
can be used by Docker containers for automatic login.

Environment variables (from .env or inline):
    INSTAGRAM_USERNAME     - Instagram username
    INSTAGRAM_PASSWORD     - Instagram password
    INSTAGRAM_SESSION_FILE - Path to save session (default: instagram_session.json)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()


def console_challenge_handler(username, choice=None):
    if choice is None:
        print(f"\n{'=' * 60}")
        print(f"SECURITY CHALLENGE for @{username}")
        print("Instagram requires verification. Check your email or phone for a code.")
        print(f"{'=' * 60}")
        code = input("Enter the verification code: ").strip()
        return code if code else False
    else:
        print(f"\nChallenge: {choice}")
        print(f"{'=' * 60}")
        answer = input("Enter response: ").strip()
        return answer if answer else False


def setup_session():
    from instagrapi import Client
    from instagrapi.exceptions import (
        ChallengeRequired,
        LoginRequired,
        PleaseWaitFewMinutes,
    )

    username = os.getenv("INSTAGRAM_USERNAME", "")
    password = os.getenv("INSTAGRAM_PASSWORD", "")
    session_file = os.getenv("INSTAGRAM_SESSION_FILE", "instagram_session.json")

    if not username or not password:
        print("ERROR: INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD must be set in .env")
        sys.exit(1)

    client = Client()
    client.challenge_code_handler = console_challenge_handler

    print(f"Attempting login for @{username}...")

    if os.path.exists(session_file):
        try:
            client.load_settings(session_file)
            client.get_timeline_feed()
            client.dump_settings(session_file)
            print(f"Session restored and updated from {session_file}")
            return
        except Exception:
            print("Existing session expired, performing fresh login...")
            try:
                os.remove(session_file)
            except OSError:
                pass

    try:
        client.login(username, password)
        client.dump_settings(session_file)
        print(f"\nSUCCESS: Logged in as @{client.username}")
        print(f"Session saved to: {session_file}")
    except ChallengeRequired:
        print("\nERROR: Challenge required but could not be resolved.")
        print("Try:")
        print("  1. Log into instagram.com and approve any login attempts")
        print("  2. Turn off Two-Factor Authentication in Settings > Security")
        print("  3. Wait 15 minutes and try again")
        sys.exit(1)
    except PleaseWaitFewMinutes:
        print("\nERROR: Instagram is rate-limiting. Wait a few minutes and try again.")
        sys.exit(1)
    except LoginRequired:
        print("\nERROR: Login failed. Check username/password.")
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    setup_session()