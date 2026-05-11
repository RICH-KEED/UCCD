from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("POSTGRES_URL (or DATABASE_URL) environment variable is not set")

connect_args = {}
if os.getenv("POSTGRES_SSLMODE", "require").lower() != "disable":
    connect_args["sslmode"] = os.getenv("POSTGRES_SSLMODE", "require")

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessLocal()
    try:
        yield db
    finally:
        db.close()