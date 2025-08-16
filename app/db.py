"""
Database configuration for the Support Desk example.

This version uses an in‑process SQLite database for illustrative
purposes. In the real project, the URL is read from the environment
via pydantic settings and the dialect is PostgreSQL.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


# In production the URL comes from environment variables (see settings.py).
DATABASE_URL = 'sqlite:///./support_desk.db'

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    """Yield a SQLAlchemy session for dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()