import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class AIAgentSettings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8001

    # JWT Security Configuration
    jwt_secret: str = "ee0c0c25c2fb8b1d5201624ae256bdf24870717b8c8b6674a98590aa58c281e4"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    # Cloudinary Configuration
    cloudinary_cloud_name: str = "smartbloodhub"
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    cloudinary_upload_preset: str = "smart_blood_hub_preset"

    # MongoDB Atlas Cloud Database Configuration
    mongodb_uri: str = "mongodb+srv://username:password@cluster0.mongodb.net/ai_blood_hub?retryWrites=true&w=majority"
    mongodb_db_name: str = "ai_blood_hub"

    # SMTP Email Configuration
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "noreply@smartbloodhub.org"

    # OpenAI Configuration
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    # Pinecone Vector RAG Configuration
    pinecone_api_key: str = ""
    pinecone_index_name: str = "hemoglobin-knowledge"
    pinecone_index_host: str = ""
    pinecone_namespace: str = "hemoglobin-knowledge"

    # Standalone AI Subsystem Microservice (ai-system/) Connection
    ai_system_url: str = "http://localhost:8002"

    @property
    def get_mongo_url(self) -> str:
        return self.mongodb_uri

    @property
    def get_smtp_pass(self) -> str:
        raw = self.smtp_pass or self.smtp_password or os.getenv("SMTP_PASS", "")
        return raw.replace(" ", "").strip()

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_ai_settings() -> AIAgentSettings:
    return AIAgentSettings()
