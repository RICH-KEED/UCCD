import sys, os
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.getcwd())

from dotenv import load_dotenv
load_dotenv()

from api.db.session import engine, Base, get_db
from api.models.user import User
from api.auth import hash_password

DEMO_USERS = [
    {
        "email": os.getenv("DEMO_SUPERVISOR_EMAIL", ""),
        "full_name": "Supervisor Demo",
        "role": "SUPERVISOR",
        "password": os.getenv("DEMO_SUPERVISOR_PASSWORD", ""),
    },
    {
        "email": os.getenv("DEMO_COMPLIANCE_EMAIL", ""),
        "full_name": "Compliance Demo",
        "role": "COMPLIANCE",
        "password": os.getenv("DEMO_COMPLIANCE_PASSWORD", ""),
    },
]

AGENT_USERS = [
    {"email": "rahul.sharma@unionbank.com", "full_name": "Rahul Sharma", "role": "AGENT", "department": "loans", "password": "union@123"},
    {"email": "priya.patel@unionbank.com", "full_name": "Priya Patel", "role": "AGENT", "department": "technical", "password": "union@123"},
    {"email": "amit.kumar@unionbank.com", "full_name": "Amit Kumar", "role": "AGENT", "department": "cards", "password": "union@123"},
    {"email": "sneha.gupta@unionbank.com", "full_name": "Sneha Gupta", "role": "AGENT", "department": "accounts", "password": "union@123"},
    {"email": "vikram.singh@unionbank.com", "full_name": "Vikram Singh", "role": "AGENT", "department": "service", "password": "union@123"},
]

Base.metadata.create_all(bind=engine)

db = next(get_db())
try:
    deleted = db.query(User).delete()
    db.commit()
    print(f"Deleted {deleted} existing user(s).")

    for u in DEMO_USERS:
        if not u["email"] or not u["password"]:
            print(f"Skipping {u['role']}: missing email or password in env")
            continue
        user = User(
            email=u["email"],
            full_name=u["full_name"],
            hashed_password=hash_password(u["password"]),
            role=u["role"],
            is_active=True,
        )
        db.add(user)
        print(f"Seeded {u['role']}: {u['email']}")

    for u in AGENT_USERS:
        if not u["email"] or not u["password"]:
            print(f"Skipping {u['full_name']}: missing email or password")
            continue
        user = User(
            email=u["email"],
            full_name=u["full_name"],
            hashed_password=hash_password(u["password"]),
            role=u["role"],
            is_active=True,
        )
        db.add(user)
        print(f"Seeded {u['role']} [{u['department']}]: {u['email']} ({u['full_name']})")

    db.commit()
    print("Done. Total agents: 5 specialist (Union Bank).")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()