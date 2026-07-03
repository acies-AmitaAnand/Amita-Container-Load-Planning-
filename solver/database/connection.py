# database/connection.py
# ─────────────────────────────────────────────────────────────────────────────
# NeonDB (Postgres) connection via psycopg2.
# Set DATABASE_URL in your .env:
#   DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
# ─────────────────────────────────────────────────────────────────────────────

import os
import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["NEON_DB_URL"]


@contextmanager
def get_conn():
    """Yield a psycopg2 connection, commit on success, rollback on error."""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()