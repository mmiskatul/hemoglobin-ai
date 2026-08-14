import hashlib
import logging
from openai import AsyncOpenAI
from config import get_ai_settings

logger = logging.getLogger("ai_system.rag")


def get_pinecone_client():
    settings = get_ai_settings()
    if not settings.pinecone_api_key or not (settings.pinecone_index_host or settings.pinecone_index_name):
        return None
    try:
        from pinecone import Pinecone
        client = Pinecone(api_key=settings.pinecone_api_key)
        return client.Index(host=settings.pinecone_index_host) if settings.pinecone_index_host else client.Index(settings.pinecone_index_name)
    except Exception as err:
        logger.warning(f"Pinecone client initialization notice: {err}")
        return None


async def retrieve_context(query: str, top_k: int = 5) -> list[str]:
    """
    Embeds query and queries Pinecone vector index for semantic context.
    """
    settings = get_ai_settings()
    index = get_pinecone_client()
    if not index or not settings.openai_api_key:
        return []
    try:
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        embedding = await client.embeddings.create(
            model=settings.openai_embedding_model,
            input=query,
        )
        result = index.query(
            namespace=settings.pinecone_namespace,
            vector=embedding.data[0].embedding,
            top_k=top_k,
            include_metadata=True,
        )
        return [
            str(match.get("metadata", {}).get("text", ""))
            for match in result.get("matches", [])
            if match.get("metadata", {}).get("text")
        ]
    except Exception as err:
        logger.warning(f"RAG retrieval error: {err}")
        return []


async def upsert_knowledge(text: str, source: str = "blood-bank-policy") -> str:
    """
    Vectorizes document text and upserts into Pinecone knowledge base.
    """
    settings = get_ai_settings()
    index = get_pinecone_client()
    if not index or not settings.openai_api_key:
        raise RuntimeError("Pinecone and OpenAI embedding configuration is required")
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    embedding = await client.embeddings.create(
        model=settings.openai_embedding_model,
        input=text,
    )
    record_id = hashlib.sha256((source + ":" + text).encode("utf-8")).hexdigest()
    index.upsert(
        namespace=settings.pinecone_namespace,
        vectors=[{
            "id": record_id,
            "values": embedding.data[0].embedding,
            "metadata": {"text": text, "source": source},
        }],
    )
    return record_id
