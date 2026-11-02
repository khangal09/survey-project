import sqlite3
from contextlib import asynccontextmanager
from datetime import date
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from pydantic import BaseModel, Field, field_validator

from database import BASE_DIR, get_db, init_db
from seed import seed_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_data()
    yield


app = FastAPI(title="Статопрос", lifespan=lifespan)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------- Модели запросов ----------
class RegisterData(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[\w.\-]+$")
    password: str = Field(min_length=6, max_length=72)


class LoginData(BaseModel):
    username: str
    password: str


class SurveyCreate(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=5, max_length=2000)
    author_id: int
    category: Literal["study", "life", "leisure", "tech"] = "tech"
    options: list[str] = Field(min_length=2, max_length=10)
    end_date: Optional[date] = None

    @field_validator("title", "description")
    @classmethod
    def strip_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Поле не может быть пустым")
        return v

    @field_validator("options")
    @classmethod
    def clean_options(cls, v: list[str]) -> list[str]:
        cleaned = [o.strip()[:200] for o in v if o.strip()]
        if len(cleaned) < 2:
            raise ValueError("Нужно минимум два варианта ответа")
        if len({o.lower() for o in cleaned}) != len(cleaned):
            raise ValueError("Варианты ответа не должны повторяться")
        return cleaned


class AnswerIn(BaseModel):
    question_id: int
    option_id: int


class VoteIn(BaseModel):
    user_id: Optional[int] = None
    answers: list[AnswerIn] = Field(min_length=1)


# ---------- Вспомогательные функции ----------
def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except (ValueError, TypeError):  # битый или служебный хеш
        return False


def is_closed(end_date: Optional[str]) -> bool:
    return bool(end_date) and end_date < date.today().isoformat()


def load_questions(conn, survey_id: int, with_votes: bool = False) -> list[dict]:
    rows = conn.execute(
        """
        SELECT q.id AS qid, q.question_text, o.id AS oid, o.option_text, COUNT(v.id) AS votes
        FROM questions q
        JOIN options o ON o.question_id = q.id
        LEFT JOIN votes v ON v.option_id = o.id
        WHERE q.survey_id = ?
        GROUP BY q.id, o.id
        ORDER BY q.id, o.id
        """,
        (survey_id,),
    ).fetchall()

    questions: dict[int, dict] = {}
    for r in rows:
        q = questions.setdefault(r["qid"], {"id": r["qid"], "text": r["question_text"], "options": []})
        option = {"id": r["oid"], "text": r["option_text"]}
        if with_votes:
            option["votes"] = r["votes"]
        q["options"].append(option)
    return list(questions.values())


SURVEY_SELECT = """
    SELECT s.id, s.title, s.description, s.category, s.created_at, s.end_date,
           s.author_id, u.username AS author,
           (SELECT COUNT(*) FROM votes v
             WHERE v.question_id = (SELECT MIN(id) FROM questions WHERE survey_id = s.id)) AS votes
    FROM surveys s
    LEFT JOIN users u ON u.id = s.author_id
"""


# ---------- Пользователи ----------
@app.post("/api/register")
def register(user: RegisterData):
    hashed = pwd_context.hash(user.password)
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (user.username, hashed),
            )
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Пользователь уже существует")
    return {"message": "Успешная регистрация"}


@app.post("/api/login")
def login(user: LoginData):
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, username, password_hash FROM users WHERE username = ?",
            (user.username,),
        ).fetchone()
    if not row or not verify_password(user.password, row["password_hash"]):
        raise HTTPException(status_code=400, detail="Неверный логин или пароль")
    return {"message": "Успешный вход", "user_id": row["id"], "username": row["username"]}


# ---------- Опросы ----------
@app.get("/api/surveys")
def get_surveys():
    with get_db() as conn:
        rows = conn.execute(SURVEY_SELECT + " ORDER BY s.created_at DESC, s.id DESC").fetchall()
    return [dict(r) for r in rows]


@app.get("/api/surveys/{survey_id}")
def get_survey(survey_id: int):
    with get_db() as conn:
        row = conn.execute(SURVEY_SELECT + " WHERE s.id = ?", (survey_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Опрос не найден")
        survey = dict(row)
        survey["closed"] = is_closed(survey["end_date"])
        survey["questions"] = load_questions(conn, survey_id)
    return survey


@app.get("/api/surveys/{survey_id}/results")
def get_results(survey_id: int):
    with get_db() as conn:
        if not conn.execute("SELECT 1 FROM surveys WHERE id = ?", (survey_id,)).fetchone():
            raise HTTPException(status_code=404, detail="Опрос не найден")
        return {"questions": load_questions(conn, survey_id, with_votes=True)}


@app.post("/api/surveys", status_code=201)
def create_survey(data: SurveyCreate):
    with get_db() as conn:
        if not conn.execute("SELECT 1 FROM users WHERE id = ?", (data.author_id,)).fetchone():
            raise HTTPException(status_code=400, detail="Пользователь не найден. Войдите заново.")

        survey_id = conn.execute(
            "INSERT INTO surveys (title, description, author_id, category, end_date, created_at) "
            "VALUES (?, ?, ?, ?, ?, datetime('now'))",
            (data.title, data.description, data.author_id, data.category,
             data.end_date.isoformat() if data.end_date else None),
        ).lastrowid
        question_id = conn.execute(
            "INSERT INTO questions (survey_id, question_text) VALUES (?, ?)",
            (survey_id, data.title),
        ).lastrowid
        conn.executemany(
            "INSERT INTO options (question_id, option_text) VALUES (?, ?)",
            [(question_id, opt) for opt in data.options],
        )
    return {"message": "Опрос создан", "id": survey_id}


@app.post("/api/surveys/{survey_id}/vote")
def vote(survey_id: int, data: VoteIn):
    with get_db() as conn:
        survey = conn.execute(
            "SELECT id, end_date FROM surveys WHERE id = ?", (survey_id,)
        ).fetchone()
        if not survey:
            raise HTTPException(status_code=404, detail="Опрос не найден")
        if is_closed(survey["end_date"]):
            raise HTTPException(status_code=400, detail="Опрос уже завершён")

        question_ids = {r["id"] for r in conn.execute(
            "SELECT id FROM questions WHERE survey_id = ?", (survey_id,))}
        given = [a.question_id for a in data.answers]
        if set(given) != question_ids or len(given) != len(question_ids):
            raise HTTPException(status_code=400, detail="Ответьте на все вопросы")

        for a in data.answers:
            ok = conn.execute(
                "SELECT 1 FROM options WHERE id = ? AND question_id = ?",
                (a.option_id, a.question_id),
            ).fetchone()
            if not ok:
                raise HTTPException(status_code=400, detail="Недопустимый вариант ответа")

        if data.user_id is not None and not conn.execute(
                "SELECT 1 FROM users WHERE id = ?", (data.user_id,)).fetchone():
            raise HTTPException(status_code=400, detail="Пользователь не найден")

        try:
            conn.executemany(
                "INSERT INTO votes (question_id, option_id, user_id, created_at) "
                "VALUES (?, ?, ?, datetime('now'))",
                [(a.question_id, a.option_id, data.user_id) for a in data.answers],
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="Вы уже участвовали в этом опросе")

        return {"message": "Голос учтён", "questions": load_questions(conn, survey_id, with_votes=True)}


# ---------- Фронтенд (должен быть последним) ----------
app.mount("/", StaticFiles(directory=BASE_DIR / "frontend", html=True), name="frontend")
