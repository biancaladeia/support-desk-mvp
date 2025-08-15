# alembic/env.py
from __future__ import annotations

from logging.config import fileConfig
from pathlib import Path
import sys

from alembic import context
from sqlalchemy import engine_from_config, pool

# --- deixar o pacote "app" acessível quando rodar alembic ---
# (raiz do projeto = pai da pasta "alembic")
sys.path.append(str(Path(__file__).resolve().parents[1]))

# Alembic config
config = context.config

# Logs
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Carregar DATABASE_URL do .env via pydantic-settings
from app.settings import settings  # noqa: E402
config.set_main_option("sqlalchemy.url", settings.database_url)

# Metadata dos modelos para autogenerate
from app.models import Base  # noqa: E402
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Executa migrations em modo offline (sem Engine)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Executa migrations em modo online (com Engine/Connection)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
