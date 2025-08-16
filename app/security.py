"""
Security utilities for the Support Desk application.

This module centralises password hashing/verification and JWT
generation/validation. It mirrors the behaviour of the original
project but includes only the pieces necessary for authentication
based on e‑mail and password. Settings such as the JWT secret,
algorithm and expiration time would normally come from environment
variables via a settings module.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from passlib.context import CryptContext


# Placeholder values; in production these come from configuration
JWT_SECRET = "please-change-me"
JWT_ALG = "HS256"
JWT_EXPIRES_HOURS = 8


auth_scheme = HTTPBearer()  # reads Authorization: Bearer <token>
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


class TokenData(BaseModel):
    user_id: str
    role: str
    exp: Optional[int] = None  # used by jwt.decode to validate expiration


def create_token(*, user_id: str, role: str) -> str:
    """Generate a signed JWT for the given user and role."""
    exp = datetime.now(tz=timezone.utc) + timedelta(hours=JWT_EXPIRES_HOURS)
    payload = {"user_id": user_id, "role": role, "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def get_current_user(req: Request, creds=Depends(auth_scheme)) -> TokenData:
    """Read and validate the JWT from the Authorization header."""
    token = creds.credentials
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return TokenData(**data)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")