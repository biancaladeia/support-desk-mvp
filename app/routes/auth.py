# app/routes/auth.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import User, Role
from app.security import create_token, require_admin

router = APIRouter()

class LoginIn(BaseModel):
    email: EmailStr

class LoginOut(BaseModel):
    token: str

@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    token = create_token(user_id=str(user.id), role=user.role.value)
    return LoginOut(token=token)

# ---- novo ----
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    role: Role = Role.agent

@router.post("/register", response_model=LoginOut, dependencies=[Depends(require_admin)])
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="User already exists")
    user = User(name=payload.name, email=payload.email, role=payload.role)
    db.add(user); db.commit(); db.refresh(user)
    token = create_token(user_id=str(user.id), role=user.role.value)
    return LoginOut(token=token)