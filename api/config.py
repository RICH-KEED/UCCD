from functools import lru_cache
import os
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class EmailSettings(BaseModel):
    mailgun_api_key: str = ""
    mailgun_domain: str = ""
    from_address: str = "complaints@abhineet.net"
    inbound_webhook_key: str = ""
    enabled: bool = False

    def is_configured(self) -> bool:
        return bool(self.mailgun_api_key and self.mailgun_domain)


class EmailConversationSettings(BaseModel):
    enabled: bool = False


class TwitterSettings(BaseModel):
    username: str = ""
    password: str = ""
    email: str = ""
    monitor_mentions: bool = True

    def is_configured(self) -> bool:
        return bool(self.username and self.password)


class InstagramSettings(BaseModel):
    username: str = ""
    password: str = ""
    session_file: str = "instagram_session.json"
    verification_code_handler: str = "console"

    def is_configured(self) -> bool:
        return bool(self.username and self.password)


class WhatsAppSettings(BaseModel):
    openwa_base_url: str = "http://localhost:8081"
    openwa_api_key: str = ""
    webhook_url: str = ""
    session_data_path: str = "whatsapp_session.json"

    def is_configured(self) -> bool:
        return bool(self.openwa_base_url)


class Settings(BaseModel):
    database_url: str
    postgres_sslmode: str = "require"
    redis_url: str = "redis://:uccd_redis_pass@localhost:6379/0"
    kafka_bootstrap_servers: str = "localhost:9093"
    jwt_secret: str
    jwt_alg: str = "HS256"
    jwt_expires_minutes: int = 720
    groq_api_key: Optional[str] = None
    sarvam_access_token: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    api_host: str = "http://localhost:8000"
    email: EmailSettings = EmailSettings()
    email_conversation: EmailConversationSettings = EmailConversationSettings()
    twitter: TwitterSettings = TwitterSettings()
    instagram: InstagramSettings = InstagramSettings()
    whatsapp: WhatsAppSettings = WhatsAppSettings()

    @classmethod
    def from_env(cls) -> "Settings":
        database_url = os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("POSTGRES_URL (or DATABASE_URL) environment variable is not set")

        jwt_secret = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY")
        if not jwt_secret:
            raise ValueError("JWT_SECRET (or SECRET_KEY) environment variable is not set")

        return cls(
            database_url=database_url,
            postgres_sslmode=os.getenv("POSTGRES_SSLMODE", "require"),
            redis_url=os.getenv("REDIS_URL", "redis://:uccd_redis_pass@localhost:6379/0"),
            kafka_bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9093"),
            jwt_secret=jwt_secret,
            jwt_alg=os.getenv("JWT_ALG", "HS256"),
            jwt_expires_minutes=int(os.getenv("JWT_EXPIRES_MINUTES", "720")),
            groq_api_key=os.getenv("GROQ_API_KEY"),
            sarvam_access_token=os.getenv("SARVAM_ACCESS_TOKEN"),
            telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN"),
            api_host=os.getenv("API_HOST", "http://localhost:8000"),
            email=EmailSettings(
                mailgun_api_key=os.getenv("MAILGUN_API_KEY", ""),
                mailgun_domain=os.getenv("MAILGUN_DOMAIN", ""),
                from_address=os.getenv("EMAIL_FROM_ADDRESS", "complaints@abhineet.net"),
                inbound_webhook_key=os.getenv("MAILGUN_INBOUND_WEBHOOK_KEY", ""),
                enabled=bool(os.getenv("MAILGUN_API_KEY") and os.getenv("MAILGUN_DOMAIN")),
            ),
            email_conversation=EmailConversationSettings(
                enabled=os.getenv("EMAIL_COMPLAINTS_CONVERSATION_MODE", "false").lower() == "true",
            ),
            twitter=TwitterSettings(
                username=os.getenv("TWITTER_USERNAME", ""),
                password=os.getenv("TWITTER_PASSWORD", ""),
                email=os.getenv("TWITTER_EMAIL", ""),
                monitor_mentions=os.getenv("TWITTER_MONITOR_MENTIONS", "true").lower() != "false",
            ),
            instagram=InstagramSettings(
                username=os.getenv("INSTAGRAM_USERNAME", ""),
                password=os.getenv("INSTAGRAM_PASSWORD", ""),
                session_file=os.getenv("INSTAGRAM_SESSION_FILE", "instagram_session.json"),
                verification_code_handler=os.getenv("INSTAGRAM_VERIFICATION_HANDLER", "console"),
            ),
            whatsapp=WhatsAppSettings(
                openwa_base_url=os.getenv("OPENWA_BASE_URL", "http://localhost:8081"),
                openwa_api_key=os.getenv("OPENWA_API_KEY", ""),
                webhook_url=os.getenv("OPENWA_WEBHOOK_URL", ""),
                session_data_path=os.getenv("OPENWA_SESSION_DATA_PATH", "whatsapp_session.json"),
            ),
        )


@lru_cache
def get_settings() -> Settings:
    return Settings.from_env()
