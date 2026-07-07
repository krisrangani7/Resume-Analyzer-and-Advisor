"""Wraps Gemini embeddings + Pinecone so the rest of the app just deals with
plain text in and ranked matches out.
"""
import google.generativeai as genai
from pinecone import Pinecone, ServerlessSpec

from app.config import settings

genai.configure(api_key=settings.gemini_api_key)

_pc = Pinecone(api_key=settings.pinecone_api_key)
_EMBED_DIM = 768  # text-embedding-004 output size


def _ensure_index():
    existing = [i["name"] for i in _pc.list_indexes()]
    if settings.pinecone_index_name not in existing:
        _pc.create_index(
            name=settings.pinecone_index_name,
            dimension=_EMBED_DIM,
            metric="cosine",
            spec=ServerlessSpec(cloud=settings.pinecone_cloud, region=settings.pinecone_region),
        )
    return _pc.Index(settings.pinecone_index_name)


def embed_text(text: str, task_type: str = "retrieval_document") -> list[float]:
    """task_type: 'retrieval_document' for candidate resumes,
    'retrieval_query' for the job-criteria query."""
    result = genai.embed_content(
        model=f"models/{settings.gemini_embedding_model}",
        content=text[:20000],  # keep payload sane
        task_type=task_type,
        output_dimensionality=_EMBED_DIM,
    )
    return result["embedding"]


def upsert_candidate(job_id: str, candidate_id: str, resume_text: str, metadata: dict):
    index = _ensure_index()
    vector = embed_text(resume_text, task_type="retrieval_document")
    index.upsert(
        vectors=[{"id": candidate_id, "values": vector, "metadata": {**metadata, "job_id": job_id}}],
        namespace=job_id,
    )


def query_top_candidates(job_id: str, job_criteria_text: str, top_k: int = 50):
    """Returns [{candidate_id, score, metadata}] ranked by semantic similarity
    to the job's criteria, scoped to that job's namespace."""
    index = _ensure_index()
    vector = embed_text(job_criteria_text, task_type="retrieval_query")
    response = index.query(
        vector=vector,
        top_k=top_k,
        namespace=job_id,
        include_metadata=True,
    )
    return [
        {"candidate_id": match["id"], "score": match["score"], "metadata": match.get("metadata", {})}
        for match in response.get("matches", [])
    ]


def delete_job_namespace(job_id: str):
    index = _ensure_index()
    try:
        index.delete(delete_all=True, namespace=job_id)
    except Exception:
        pass  # namespace may not exist yet
