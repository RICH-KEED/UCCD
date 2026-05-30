import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()
import psycopg2

def check_complaint_details(complaint_id):
    conn = psycopg2.connect(os.getenv("POSTGRES_URL"))
    cur = conn.cursor()
    cur.execute("SELECT id, status, sla_tier, priority_tier, severity_score, ai_draft, source_ref, created_at, updated_at FROM complaints WHERE id = %s", (complaint_id,))
    r = cur.fetchone()
    
    if r:
        print("\n" + "="*80)
        print("COMPLAINT DETAILS:")
        print("="*80)
        print(f"ID:             {r[0]}")
        print(f"Status:         {r[1]}")
        print(f"SLA Tier:       {r[2]}")
        print(f"Priority:       {r[3]}")
        print(f"Severity:       {r[4]}")
        print(f"Source Ref:     {r[6]}")
        print(f"Created At:     {r[7]}")
        print(f"Updated At:     {r[8]}")
        print(f"AI Draft:\n{r[5]}")
        print("="*80)
    else:
        print("Complaint not found.")
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    import sys
    cid = sys.argv[1] if len(sys.argv) > 1 else "946b0957-80c8-4f48-86ce-29e825863b00"
    check_complaint_details(cid)
