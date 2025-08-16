from app.db import SessionLocal
from app.models import User, Role
from app.security import create_token
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def main():
    db = SessionLocal()
    try:
        # cria admin se não existir
        admin = db.query(User).filter(User.email == "admin@example.com").first()
        if not admin:
            admin = User(name="Admin", email="admin@example.com", role=Role.admin)
            db.add(admin); db.commit(); db.refresh(admin)
            print(f"Admin criado: {admin.id}")

        # cria agent se não existir
        agent = db.query(User).filter(User.email == "agent@example.com").first()
        if not agent:
            agent = User(name="Agent", email="agent@example.com", role=Role.agent)
            db.add(agent); db.commit(); db.refresh(agent)
            print(f"Agent criado: {agent.id}")

        # gera tokens
        admin_token = create_token(user_id=str(admin.id), role=admin.role.value)
        agent_token = create_token(user_id=str(agent.id), role=agent.role.value)

        print("\n=== TOKENS ===")
        print(f"ADMIN  ({admin.email}): {admin_token}")
        print(f"AGENT  ({agent.email}): {agent_token}")
        print("\nUse estes tokens no header Authorization: Bearer <token>")
    finally:
        db.close()

if __name__ == "__main__":
    main()
