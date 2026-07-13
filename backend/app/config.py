from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/resume_analyzer"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-flash-lite"
    gemini_embedding_model: str = "gemini-embedding-001"

    pinecone_api_key: str = ""
    pinecone_index_name: str = "resume-analyzer"
    pinecone_cloud: str = "aws"
    pinecone_region: str = "us-east-1"

    cors_origins: str = "http://localhost:5173"
    upload_dir: str = "./uploads"


settings = Settings()
