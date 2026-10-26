from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import sqlite3
from passlib.context import CryptContext
from database import DB_PATH, init_db
from seed import seed_data
from contextlib import asynccontextmanager

# Инициализация базы данных и заполнение при запуске
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()      # Создаем таблицы
    seed_data()    # Добавляем 15 опросов, вопросов и вариантов
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserAuth(BaseModel):
    username: str
    password: str

class SurveyCreate(BaseModel):
    title: str
    description: str
    author_id: int

@app.post("/api/register")
def register(user: UserAuth):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (user.username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Пользователь уже существует")
    hashed_pw = pwd_context.hash(user.password)
    cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (user.username, hashed_pw))
    conn.commit()
    conn.close()
    return {"message": "Успешная регистрация"}

@app.post("/api/login")
def login(user: UserAuth):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (user.username,))
    db_user = cursor.fetchone()
    conn.close()
    if not db_user or not pwd_context.verify(user.password, db_user[2]):
        raise HTTPException(status_code=400, detail="Неверный логин или пароль")
    return {"message": "Успешный вход", "user_id": db_user[0], "username": db_user[1]}

@app.get("/api/surveys")
def get_surveys():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, description, author_id FROM surveys")
    surveys = cursor.fetchall()
    conn.close()
    return [{"id": s[0], "title": s[1], "description": s[2], "author_id": s[3]} for s in surveys]

@app.get("/api/surveys/{survey_id}")
def get_survey_details(survey_id: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, description, author_id FROM surveys WHERE id = ?", (survey_id,))
    survey = cursor.fetchone()
    if not survey:
        conn.close()
        raise HTTPException(status_code=404, detail="Опрос не найден")
    
    cursor.execute("SELECT id, question_text FROM questions WHERE survey_id = ?", (survey_id,))
    questions_raw = cursor.fetchall()
    
    questions = []
    for q in questions_raw:
        cursor.execute("SELECT id, option_text FROM options WHERE question_id = ?", (q[0],))
        options_raw = cursor.fetchall()
        options = [{"id": o[0], "text": o[1]} for o in options_raw]
        questions.append({"id": q[0], "text": q[1], "options": options})
    
    conn.close()
    return {
        "id": survey[0],
        "title": survey[1],
        "description": survey[2],
        "author_id": survey[3],
        "questions": questions
    }

@app.post("/api/surveys")
def create_survey(survey: SurveyCreate):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO surveys (title, description, author_id) VALUES (?, ?, ?)", (survey.title, survey.description, survey.author_id))
    conn.commit()
    conn.close()
    return {"message": "Опрос создан"}

# --- РАЗДАЧА СТАТИЧЕСКИХ ФАЙЛОВ (ФРОНТЕНД) ---
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")