from fastapi import FastAPI, Depends
from app.settings import settings
from app.routes import tickets_router
from app.routes.auth import router as auth_router
from app.security import get_current_user, TokenData
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Support Desk MVP", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=False,
    allow_methods=["*"],   # inclui OPTIONS/POST/GET/…
    allow_headers=["*"],   # ex.: Content-Type, Authorization
)

@app.get("/health")
def health():
    return {"status": "ok", "env": settings.env}

app.include_router(tickets_router, prefix="/tickets", tags=["tickets"])

app.include_router(auth_router, prefix="/auth", tags=["auth"])

@app.get("/me")
def me(user: TokenData = Depends(get_current_user)):
    return {"user_id": user.user_id, "role": user.role}