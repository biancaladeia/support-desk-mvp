from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from app.settings import settings

auth_scheme = HTTPBearer()  # lê Authorization: Bearer <token>

class TokenData(BaseModel):
    user_id: str
    role: str
    exp: Optional[int] = None  # para o jwt.decode validar expiração

def create_token(*, user_id: str, role: str) -> str:
    """Gera um JWT assinado para o user/role informado."""
    exp = datetime.now(tz=timezone.utc) + timedelta(hours=settings.jwt_expires_hours)
    payload = {"user_id": user_id, "role": role, "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_alg)

def get_current_user(req: Request, creds=Depends(auth_scheme)) -> TokenData:
    """Lê e valida o JWT do header Authorization: Bearer <token>."""
    token = creds.credentials
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
        return TokenData(**data)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===== Guards =====

def require_admin(user: TokenData = Depends(get_current_user)) -> TokenData:
    """Permite apenas admin; admin também é agente implicitamente."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return user

def require_agent(user: TokenData = Depends(get_current_user)) -> TokenData:
    """Permite agent e admin (admin herda permissão)."""
    if user.role not in ("agent", "admin"):
        raise HTTPException(status_code=403, detail="Agents only")
    return user

def require_agent_or_admin(user: TokenData = Depends(get_current_user)) -> TokenData:
    # igual ao require_agent, deixo explícito pra semântica
    if user.role not in ("agent", "admin"):
        raise HTTPException(status_code=403, detail="Agents or admins only")
    return user