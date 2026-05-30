import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()
from api.db.session import get_db
from api.models.outbound_message import OutboundMessage

def test_log():
    db = next(get_db())
    try:
        record = OutboundMessage(
            channel="whatsapp",
            source_ref="test_ref",
            message_text="test text",
            status="failed",
            error_message="test error",
        )
        db.add(record)
        db.commit()
        print("Success! Logged successfully.")
    except Exception as e:
        print(f"Exception during logging: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_log()
