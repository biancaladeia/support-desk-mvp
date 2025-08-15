from fastapi import FastAPI
from app.settings import settings
from app.routes import tickets_router

app = FastAPI(title="Support Desk MVP", version="0.1.0")

@app.get("/health")
def health():
    return {"status": "ok", "env": settings.env}

app.include_router(tickets_router, prefix="/tickets", tags=["tickets"])
