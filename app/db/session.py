import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.core.config import settings

_is_serverless = os.environ.get("VERCEL", "") == "1"

_engine_kwargs = {"pool_pre_ping": True}
if _is_serverless:
    _engine_kwargs["pool_size"] = 1
    _engine_kwargs["max_overflow"] = 0
else:
    _engine_kwargs["pool_size"] = 10
    _engine_kwargs["max_overflow"] = 20

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
