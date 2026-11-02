import sqlite3
from contextlib import contextmanager
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "survey.db"


@contextmanager
def get_db():
    """Открывает соединение, включает внешние ключи, делает commit/rollback."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _add_column_if_missing(conn, table, column, definition):
    columns = [row["name"] for row in conn.execute(f"PRAGMA table_info({table})")]
    if column not in columns:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def init_db():
    """Создаёт таблицы (если их нет) и добавляет новые колонки в старую базу."""
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            )""")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS surveys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                author_id INTEGER,
                category TEXT NOT NULL DEFAULT 'tech',
                end_date TEXT,
                created_at TEXT,
                FOREIGN KEY (author_id) REFERENCES users (id)
            )""")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                survey_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                FOREIGN KEY (survey_id) REFERENCES surveys (id)
            )""")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS options (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_id INTEGER NOT NULL,
                option_text TEXT NOT NULL,
                FOREIGN KEY (question_id) REFERENCES questions (id)
            )""")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_id INTEGER NOT NULL,
                option_id INTEGER NOT NULL,
                user_id INTEGER,
                created_at TEXT,
                UNIQUE (question_id, user_id),
                FOREIGN KEY (question_id) REFERENCES questions (id),
                FOREIGN KEY (option_id) REFERENCES options (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )""")

        # Миграция старой базы (если survey.db создана предыдущей версией)
        _add_column_if_missing(conn, "surveys", "category", "TEXT NOT NULL DEFAULT 'tech'")
        _add_column_if_missing(conn, "surveys", "end_date", "TEXT")
        _add_column_if_missing(conn, "surveys", "created_at", "TEXT")
        conn.execute("UPDATE surveys SET created_at = datetime('now') WHERE created_at IS NULL")


if __name__ == "__main__":
    init_db()
    print("База данных готова.")