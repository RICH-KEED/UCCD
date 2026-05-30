import os
import sys
import json
import time
import requests
import redis
import psycopg2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

API_URL = "http://localhost:8888/api/v1/webhooks/whatsapp"
TEST_CHAT_ID = "919999999999@c.us"
redis_password = os.getenv("REDIS_PASSWORD", "uccd_redis_pass")
REDIS_URL = f"redis://:{redis_password}@localhost:6379/0"
POSTGRES_URL = os.getenv("POSTGRES_URL")

def clean_database_and_redis():
    print("Cleaning up database and Redis for test...")
    # Clean Redis
    client = redis.Redis.from_url(REDIS_URL)
    client.delete(f"whatsapp_conv:{TEST_CHAT_ID}")
    
    # Clean PostgreSQL complaints from this test user
    conn = psycopg2.connect(POSTGRES_URL)
    cur = conn.cursor()
    cur.execute("DELETE FROM complaints WHERE customer_id = %s OR source_ref = %s", (TEST_CHAT_ID, TEST_CHAT_ID))
    conn.commit()
    cur.close()
    conn.close()
    print("Cleanup done.")

def check_complaint_in_db():
    conn = psycopg2.connect(POSTGRES_URL)
    cur = conn.cursor()
    cur.execute(
        "SELECT id, customer_name, account_number, customer_phone, raw_text, status "
        "FROM complaints WHERE source_ref = %s", 
        (TEST_CHAT_ID,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

def run_test():
    clean_database_and_redis()
    
    print("\n--- STEP 1: Sending first contact message (No details) ---")
    payload1 = {
        "event": "message",
        "data": {
            "chatId": TEST_CHAT_ID,
            "body": "My credit card was blocked during an ATM withdrawal. Please help.",
            "sender": {
                "id": TEST_CHAT_ID
            }
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    r_api = requests.post(API_URL, json=payload1, headers=headers)
    print(f"Response status: {r_api.status_code}")
    print(f"Response body: {r_api.json()}")
    
    # Verify response structure
    res_json1 = r_api.json()
    assert res_json1.get("status") == "replied", "Expected status 'replied'"
    assert res_json1.get("stage") == "awaiting_details", "Expected stage 'awaiting_details'"
    
    # Verify no complaint in database
    complaints = check_complaint_in_db()
    assert len(complaints) == 0, f"Expected 0 complaints, found {len(complaints)}"
    print("Step 1 validation passed: reply sent, conversation state saved in Redis, no DB complaint created.")
    
    # Verify Redis state
    client = redis.Redis.from_url(REDIS_URL)
    redis_state = client.get(f"whatsapp_conv:{TEST_CHAT_ID}")
    assert redis_state is not None, "Expected Redis state to exist"
    state_json = json.loads(redis_state)
    print(f"Redis state saved: {state_json}")
    
    print("\n--- STEP 2: Sending follow-up message with name and account number ---")
    payload2 = {
        "event": "message",
        "data": {
            "chatId": TEST_CHAT_ID,
            "body": "My name is Rajesh Kumar and my account number is 4012567890.",
            "sender": {
                "id": TEST_CHAT_ID
            }
        }
    }
    
    r_api2 = requests.post(API_URL, json=payload2, headers=headers)
    print(f"Response status: {r_api2.status_code}")
    print(f"Response body: {r_api2.json()}")
    
    res_json2 = r_api2.json()
    assert res_json2.get("status") == "complaint_created", "Expected status 'complaint_created'"
    complaint_id = res_json2.get("complaint_id")
    assert complaint_id is not None, "Expected complaint_id to be returned"
    
    # Verify complaint in database
    complaints = check_complaint_in_db()
    assert len(complaints) == 1, f"Expected 1 complaint, found {len(complaints)}"
    db_id, name, acct, phone, raw, status = complaints[0]
    
    print(f"\nCreated Complaint Details in DB:")
    print(f"ID:             {db_id}")
    print(f"Name:           {name}")
    print(f"Account No:     {acct}")
    print(f"Phone:          {phone}")
    print(f"Status:         {status}")
    print(f"Raw Text:\n{raw}")
    
    assert str(db_id) == complaint_id, "Returned ID does not match database ID"
    assert name == "Rajesh Kumar", f"Expected name 'Rajesh Kumar', got '{name}'"
    assert acct == "4012567890", f"Expected account '4012567890', got '{acct}'"
    assert phone == "919999999999", f"Expected phone '919999999999', got '{phone}'"
    
    # Verify Redis state deleted
    redis_state_after = client.get(f"whatsapp_conv:{TEST_CHAT_ID}")
    assert redis_state_after is None, "Expected Redis state to be deleted after complaint creation"
    
    print("\nStep 2 validation passed: complaint registered in DB with all details, Redis cleared.")
    print("\nSUCCESS! WHATSAPP CONVERSATION MODE FULL FLOW VERIFIED!")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        import traceback
        traceback.print_exc()
