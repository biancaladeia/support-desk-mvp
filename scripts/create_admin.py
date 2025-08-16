# scripts/create_admin.py
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import SessionLocal
from app.models import User, Role
from passlib.hash import bcrypt
import uuid

db = SessionLocal()
user = User(
    id=uuid.uuid4(),
    name="Admin",
    email="admin@admin.com",
    password_hash=bcrypt.hash("admin123"),
    role=Role.admin,
    is_active=True,
)
db.add(user)
db.commit()
print("Usuário admin criado!")