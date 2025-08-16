"""
Authentication routes for Support Desk API.

This module defines endpoints to register and authenticate users using
email and password credentials. It replaces the previous token-based
approach where hard‑coded JWTs were generated via a seed script. Now
clients must supply both an e‑mail and a password to obtain a
short‑lived JWT, which is then sent via the `Authorization: Bearer`
header on subsequent requests. The JWT still encodes the user’s role
(`agent` or `admin`) for RBAC checks, but it is never pre‑generated or
shared directly with the front‑end.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, Role
from app.security import create_token, hash_password, verify_password
from app.schemas import RegisterIn, UserOut


router = APIRouter()


class LoginIn(BaseModel):
    """Payload for the login endpoint.

    Both email and password are required. Optional passwords were
    previously accepted for legacy seed users, but that behaviour has
    been removed to enforce credential‑based authentication.
    """

    email: EmailStr
    password: str


class LoginOut(BaseModel):
    """Response returned by the login endpoint."""

    token: str


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    """Register a new user.

    Validates that the e‑mail is unique and persists the user with a
    bcrypt hashed password. The caller can optionally specify a role
    (defaults to `agent`).
    """
    exists = db.query(User).filter(User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=payload.name,
        email=payload.email,
        role=payload.role or Role.agent,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    """Authenticate a user via e‑mail and password.

    Looks up the user by e‑mail and verifies the provided password
    against the stored bcrypt hash. If the credentials are valid and
    the user is active, a signed JWT is returned. Otherwise an
    appropriate 4xx error is raised.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    # Enforce that a password is always provided and valid
    if not payload.password or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # Disallow login for inactive users
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User inactive")
    token = create_token(user_id=str(user.id), role=user.role.value)
    return LoginOut(token=token)