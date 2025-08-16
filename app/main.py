"""
Entry point for the Support Desk FastAPI application.

This minimal example mounts only the authentication routes and the
`/me` endpoint for demonstration purposes. In the original project
there are additional routers for ticket management and CORS settings
defined in app.settings.
"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.security import get_current_user, TokenData


app = FastAPI(title="Support Desk MVP", version="0.1.0")

# Allow local front‑end dev server by default
origins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router, prefix="/auth", tags=["auth"])


@app.get("/me")
def me(user: TokenData = Depends(get_current_user)):
    return {"user_id": user.user_id, "role": user.role}