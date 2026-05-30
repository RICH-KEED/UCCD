import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()
import psycopg2

def add_col():
    conn = psycopg2.connect(os.getenv("POSTGRES_URL"))
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE outbound_messages ADD COLUMN IF NOT EXISTS msg_metadata JSONB DEFAULT '{}'::jsonb;")
        conn.commit()
        print("Successfully added msg_metadata column to outbound_messages table!")
    except Exception as e:
        print(f"Error adding column: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    add_col()
