from fastapi import FastAPI
from app.settings import settings

app = FastAPI(title="Support Desk MVP", version="0.1.0")

@app.get("/health")
def health():
    return {"status": "ok", "env": settings.env}

