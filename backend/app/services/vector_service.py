"""Wraps Gemini embeddings + Pinecone so the rest of the app just deals with
plain text in and ranked matches out.
"""

from google import genai
from pinecone import Pinecone, ServerlessSpec

from app.config import settings

client = genai.Client(api_key=settings.gemini_api_key)

_pc = Pinecone(api_key=settings.pinecone_api_key)
_EMBED_DIM = 3072


def _ensure_index():
    existing = [i["name"] for i in _pc.list_indexes()]
    if settings.pinecone_index_name not in existing:
        _pc.create_index(
            name=settings.pinecone_index_name,
            dimension=_EMBED_DIM,
            metric="cosine",
            spec=ServerlessSpec(
                cloud=settings.pinecone_cloud,
                region=settings.pinecone_region,
            ),
        )
    return _pc.Index(settings.pinecone_index_name)


def embed_text(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    response = client.models.embed_content(
        model=settings.gemini_embedding_model,
        contents=text[:20000],
    )

    return response.embeddings[0].values


def upsert_candidate(job_id: str, candidate_id: str, resume_text: str, metadata: dict):
    index = _ensure_index()
    vector = embed_text(resume_text)

    index.upsert(
        vectors=[
            {
                "id": candidate_id,
                "values": vector,
                "metadata": {**metadata, "job_id": job_id},
            }
        ],
        namespace=job_id,
    )


def query_top_candidates(job_id: str, job_criteria_text: str, top_k: int = 50):
    index = _ensure_index()

    vector = embed_text(job_criteria_text)

    response = index.query(
        vector=vector,
        top_k=top_k,
        namespace=job_id,
        include_metadata=True,
    )

    return [
        {
            "candidate_id": m["id"],
            "score": m["score"],
            "metadata": m.get("metadata", {}),
        }
        for m in response["matches"]
    ]


def delete_job_namespace(job_id: str):
    index = _ensure_index()
    try:
        index.delete(delete_all=True, namespace=job_id)
    except Exception:
        pass