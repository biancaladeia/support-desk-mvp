from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.settings import settings

engine = create_engine(settings.database_url, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

# Dependency p/ FastAPI (usaremos nos endpoints)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
