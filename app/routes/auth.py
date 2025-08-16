from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import User
from app.security import create_token

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
