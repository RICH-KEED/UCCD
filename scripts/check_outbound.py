import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()
import psycopg2

def check_outbound_messages():
    conn = psycopg2.connect(os.getenv("POSTGRES_URL"))
    cur = conn.cursor()
    cur.execute("SELECT id, channel, source_ref, message_text, status, error_message, sent_at FROM outbound_messages ORDER BY sent_at DESC LIMIT 5")
    rows = cur.fetchall()
    
    print("\n" + "="*80)
    print("LOGGED OUTBOUND MESSAGES (Last 5):")
    print("="*80)
    for r in rows:
        print(f"ID:           {r[0]}")
        print(f"Channel:      {r[1]}")
        print(f"Recipient:    {r[2]}")
        print(f"Status:       {r[4]}")
        print(f"Sent At:      {r[6]}")
        print(f"Text Snippet: {r[3][:100]}...")
        if r[5]:
            print(f"Error:        {r[5]}")
        print("-"*80)
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    check_outbound_messages()
