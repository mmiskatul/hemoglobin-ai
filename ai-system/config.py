import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class AISystemSettings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8002

    # OpenAI LLM & Embedding Settings
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    # Pinecone Vector Store Settings
    pinecone_api_key: str = ""
    pinecone_index_name: str = "hemoglobin-knowledge"
    pinecone_index_host: str = ""
    pinecone_namespace: str = "hemoglobin-knowledge"

    # MongoDB Atlas Database for live donor queries & chat history
    mongodb_uri: str = "mongodb+srv://username:password@cluster0.mongodb.net/ai_blood_hub?retryWrites=true&w=majority"
    mongodb_db_name: str = "ai_blood_hub"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_ai_settings() -> AISystemSettings:
    return AISystemSettings()
