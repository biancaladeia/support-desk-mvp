from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import User, Role
from app.security import create_token, hash_password, verify_password
from app.schemas import RegisterIn, UserOut

router = APIRouter()

class LoginIn(BaseModel):
    email: EmailStr
    password: str | None = None  # opcional p/ manter compatibilidade com usuários seed


class LoginOut(BaseModel):
    token: str

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    # e-mail único
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
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Se existir password_hash, exigir senha válida
    if user.password_hash:
        if not payload.password or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user_id=str(user.id), role=user.role.value)
    return LoginOut(token=token)