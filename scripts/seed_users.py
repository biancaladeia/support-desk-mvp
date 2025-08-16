"""
Utility script to seed the Support Desk database with initial users.

This script creates a handful of users (admin, agent and user) with
pre‑defined passwords using bcrypt. It replaces the previous
`seed_and_token` script which created users without passwords and
emitted JWTs for copy‑and‑paste authentication. After running
`alembic upgrade head` to create your database, execute this script
once to insert initial accounts. You can then log in via the
`/auth/login` endpoint using the e‑mail and password combination.

Usage:

    python -m scripts.seed_users

"""

import uuid
from app.db import SessionLocal
from app.models import User, Role
from app.security import hash_password


def create_user(db: SessionLocal, *, name: str, email: str, role: Role, password: str) -> User:
    """Helper to idempotently create a user with the given attributes.

    If a user with the given e‑mail already exists, it is returned
    unchanged. Otherwise a new user is created with a freshly
    generated UUID and a bcrypt hashed password. The user is always
    marked as active.
    """
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user
    user = User(
        id=uuid.uuid4(),
        name=name,
        email=email,
        role=role,
        password_hash=hash_password(password),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def main() -> None:
    db = SessionLocal()
    try:
        admin = create_user(db, name="Admin", email="admin@admin.com", role=Role.admin, password="Admin@123")
        agent = create_user(db, name="Agent", email="agent@desk.com", role=Role.agent, password="Agent@123")
        user = create_user(db, name="User", email="user@desk.com", role=Role.agent, password="User@123")
        print("Seed complete. Created users:")
        print(f"Admin: {admin.email}")
        print(f"Agent: {agent.email}")
        print(f"User:  {user.email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()