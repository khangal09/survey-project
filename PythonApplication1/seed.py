import random
from database import get_db, init_db

# Пароль у служебного пользователя "admin" не существует: войти под ним нельзя.
UNUSABLE_HASH = "!disabled"

# (название, описание, рубрика, [(вопрос, [варианты])])
SURVEYS = [
    ("Любимый язык программирования", "Выберите ваш основной инструмент", "tech",
     [("Какой язык вы учите первым?", ["Python", "JavaScript", "Java", "C++"]),
      ("Что важнее в коде?", ["Скорость", "Читаемость", "Безопасность"])]),
    ("Лучшая ОС для работы", "Windows, Mac или Linux?", "tech",
     [("На какой ОС вы работаете?", ["Windows", "macOS", "Linux"]),
      ("Что важнее в ОС?", ["Удобство", "Безопасность", "Скорость"])]),
    ("Как вы добираетесь до учебы?", "Транспортный вопрос", "life",
     [("На чем вы ездите?", ["Метро", "Автобус", "Машина", "Пешком"]),
      ("Сколько времени занимает дорога?", ["< 30 мин", "30-60 мин", "> 1 часа"])]),
    ("Любимый предмет в школе", "Ностальгия", "study",
     [("Какой предмет был любимым?", ["Математика", "Информатика", "История", "Литература"])]),
    ("Кофе или чай?", "Главный напиток студента", "life",
     [("Что вы пьете чаще?", ["Кофе", "Чай", "Воду"])]),
    ("Сколько часов вы спите?", "Режим дня", "life",
     [("Сколько часов сна вам хватает?", ["< 6 часов", "6-8 часов", "> 8 часов"])]),
    ("Любимый фреймворк", "Фронтенд или бэкенд?", "tech",
     [("Какой фреймворк вам нравится?", ["React", "Vue", "Django", "FastAPI"])]),
    ("Играете ли вы в видеоигры?", "Геймерская тема", "leisure",
     [("Как часто вы играете?", ["Каждый день", "Раз в неделю", "Редко", "Не играю"])]),
    ("Какая погода вам нравится?", "Погодные предпочтения", "leisure",
     [("Какая погода идеальна?", ["Солнечная", "Дождливая", "Снежная", "Облачная"])]),
    ("Ваш любимый жанр фильмов", "Кино", "leisure",
     [("Что предпочитаете смотреть?", ["Фантастика", "Комедия", "Драма", "Ужасы"])]),
    ("Сколько раз в день вы едите?", "Питание", "life",
     [("Сколько приемов пищи в день?", ["1-2", "3", "4-5", "Больше 5"])]),
    ("Занимаетесь ли вы спортом?", "Здоровый образ жизни", "life",
     [("Сколько раз в неделю тренируетесь?", ["0 раз", "1-2 раза", "3-4 раза", "Каждый день"])]),
    ("Любимый мессенджер", "Средства связи", "tech",
     [("Чем пользуетесь чаще?", ["Telegram", "WhatsApp", "VK", "Discord"])]),
    ("Планируете ли вы поехать за границу?", "Путешествия", "leisure",
     [("Куда бы хотели поехать?", ["Европа", "Азия", "Америка", "Не планирую"])]),
    ("Ваш любимый праздник", "Традиции", "leisure",
     [("Какой праздник ждете больше всего?", ["Новый год", "День рождения", "Лето", "Хэллоуин"])]),
]


def seed_data():
    """Наполняет базу демо-данными (повторный запуск ничего не дублирует)."""
    init_db()
    with get_db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO users (id, username, password_hash) VALUES (1, 'admin', ?)",
            (UNUSABLE_HASH,),
        )
        # Старая версия хранила 'fakehash123' — заменяем на безопасное значение
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE username = 'admin' AND password_hash = 'fakehash123'",
            (UNUSABLE_HASH,),
        )

        for index, (title, desc, category, questions) in enumerate(SURVEYS):
            row = conn.execute("SELECT id FROM surveys WHERE title = ?", (title,)).fetchone()
            is_new = row is None
            if is_new:
                cur = conn.execute(
                    "INSERT INTO surveys (title, description, author_id, category, created_at) "
                    "VALUES (?, ?, 1, ?, datetime('now', ?))",
                    (title, desc, category, f"-{index} days"),
                )
                survey_id = cur.lastrowid
            else:
                survey_id = row["id"]
                conn.execute("UPDATE surveys SET category = ? WHERE id = ?", (category, survey_id))

            question_ids = []
            for q_text, options in questions:
                q_row = conn.execute(
                    "SELECT id FROM questions WHERE question_text = ? AND survey_id = ?",
                    (q_text, survey_id),
                ).fetchone()
                if q_row:
                    question_id = q_row["id"]
                else:
                    question_id = conn.execute(
                        "INSERT INTO questions (survey_id, question_text) VALUES (?, ?)",
                        (survey_id, q_text),
                    ).lastrowid
                question_ids.append(question_id)

                for opt in options:
                    exists = conn.execute(
                        "SELECT 1 FROM options WHERE option_text = ? AND question_id = ?",
                        (opt, question_id),
                    ).fetchone()
                    if not exists:
                        conn.execute(
                            "INSERT INTO options (question_id, option_text) VALUES (?, ?)",
                            (question_id, opt),
                        )

            # Демо-ответы только для только что созданных опросов
            if is_new:
                for _ in range(random.randint(5, 40)):
                    for question_id in question_ids:
                        option_ids = [r["id"] for r in conn.execute(
                            "SELECT id FROM options WHERE question_id = ?", (question_id,))]
                        conn.execute(
                            "INSERT INTO votes (question_id, option_id, user_id, created_at) "
                            "VALUES (?, ?, NULL, datetime('now'))",
                            (question_id, random.choice(option_ids)),
                        )
    print(f"База данных наполнена: {len(SURVEYS)} опросов.")


if __name__ == "__main__":
    seed_data()
