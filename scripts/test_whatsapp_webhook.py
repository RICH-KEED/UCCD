import requests
import json
import time

UCCD_WEBHOOK_URL = "http://localhost:8888/api/v1/webhooks/whatsapp"
UCCD_COMPLAINTS_URL = "http://localhost:8888/api/v1/complaints"

def test_whatsapp_bot():
    payload = {
        "event": "message.received",
        "sessionId": "uccd",
        "data": {
            "id": "true_9876543210@c.us_3EB0ABC123",
            "from": "9876543210@c.us",
            "to": "628987654321@c.us",
            "body": "Namaste, mera naam Rajesh Sharma hai aur mera card block ho gaya hai. Account number is 40125678910. Phone is 9876543210.",
            "type": "chat",
            "contact": {
                "name": "Rajesh Sharma",
                "pushName": "Rajesh"
            }
        }
    }
    
    print("\n" + "="*80)
    print("STEP 1: Injecting Simulated Inbound WhatsApp Webhook...")
    print(f"URL: {UCCD_WEBHOOK_URL}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print("="*80)
    
    try:
        response = requests.post(UCCD_WEBHOOK_URL, json=payload, timeout=10)
        print(f"Response Code: {response.status_code}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Error sending webhook: {e}")
        return

    # Wait for processing
    print("\nWaiting 5 seconds for background LLM parsing and complaint database insertion...")
    time.sleep(5)

    print("\n" + "="*80)
    print("STEP 2: Verifying Complaint Creation in Database...")
    print("="*80)
    
    try:
        # Since authentication might be required, we can login first or query directly
        # Let's try direct query or login if needed. UCCD API has a login endpoint.
        # But we can also inspect the docker logs of the api container to see details.
        print("Checking recent complaints...")
        # Login first to get a token
        login_url = "http://localhost:8888/api/v1/auth/login"
        login_payload = {
            "email": "supervisor@example.com",
            "password": "Test@123"
        }
        login_resp = requests.post(login_url, json=login_payload, timeout=5)
        if login_resp.status_code == 200:
            token = login_resp.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            comp_resp = requests.get(UCCD_COMPLAINTS_URL, headers=headers, params={"limit": 5}, timeout=5)
            if comp_resp.status_code == 200:
                resp_json = comp_resp.json()
                complaints = resp_json.get("complaints", [])
                print(f"Found {len(complaints)} recent complaints.")
                
                # Look for our complaint
                target_complaint = None
                for c in complaints:
                    if c.get("customer_id") == "9876543210" or c.get("source_ref") == "9876543210@c.us":
                        target_complaint = c
                        break
                
                if target_complaint:
                    print("\n[SUCCESS] WhatsApp complaint found in UCCD database:")
                    print(f"  Ticket ID:      {target_complaint.get('id')}")
                    print(f"  Customer Name:  {target_complaint.get('customer_name')}")
                    print(f"  Account Number: {target_complaint.get('account_number')}")
                    print(f"  Customer Phone: {target_complaint.get('customer_phone')}")
                    print(f"  Channel:        {target_complaint.get('channel')}")
                    print(f"  Raw Text:       {target_complaint.get('raw_text')}")
                    print(f"  Status:         {target_complaint.get('status')}")
                else:
                    print("\n[FAILED] Could not find the complaint for customer '9876543210@c.us' in the recent list.")
            else:
                print(f"Failed to fetch complaints: {comp_resp.status_code} - {comp_resp.text}")
        else:
            print(f"Authentication failed: {login_resp.status_code} - {login_resp.text}")
    except Exception as e:
        print(f"Error querying database: {e}")

if __name__ == "__main__":
    test_whatsapp_bot()
