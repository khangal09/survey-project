import sqlite3
from database import DB_PATH, init_db

def seed_data():
    init_db() 
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Тест хэрэглэгч
    cursor.execute("INSERT OR IGNORE INTO users (id, username, password_hash) VALUES (1, 'admin', 'fakehash123')")

    # 15 опрос, тус бүрд нь асуулт, сонголтууд
    surveys_data = [
        {
            "title": "Любимый язык программирования", 
            "desc": "Выберите ваш основной инструмент",
            "questions": [
                {"q": "Какой язык вы учите первым?", "opts": ["Python", "JavaScript", "Java", "C++"]},
                {"q": "Что важнее в коде?", "opts": ["Скорость", "Читаемость", "Безопасность"]}
            ]
        },
        {
            "title": "Лучшая ОС для работы", 
            "desc": "Windows, Mac или Linux?",
            "questions": [
                {"q": "На какой ОС вы работаете?", "opts": ["Windows", "macOS", "Linux"]},
                {"q": "Что важнее в ОС?", "opts": ["Удобство", "Безопасность", "Скорость"]}
            ]
        },
        {
            "title": "Как вы добираетесь до учебы?", 
            "desc": "Транспортный вопрос",
            "questions": [
                {"q": "На чем вы ездите?", "opts": ["Метро", "Автобус", "Машина", "Пешком"]},
                {"q": "Сколько времени занимает дорога?", "opts": ["< 30 мин", "30-60 мин", "> 1 часа"]}
            ]
        },
        {
            "title": "Любимый предмет в школе", 
            "desc": "Ностальгия",
            "questions": [
                {"q": "Какой предмет был любимым?", "opts": ["Математика", "Информатика", "История", "Литература"]}
            ]
        },
        {
            "title": "Кофе или чай?", 
            "desc": "Главный напиток студента",
            "questions": [
                {"q": "Что вы пьете чаще?", "opts": ["Кофе", "Чай", "Воду"]}
            ]
        },
        {
            "title": "Сколько часов вы спите?", 
            "desc": "Режим дня",
            "questions": [
                {"q": "Сколько часов сна вам хватает?", "opts": ["< 6 часов", "6-8 часов", "> 8 часов"]}
            ]
        },
        {
            "title": "Любимый фреймворк", 
            "desc": "Фронтенд или бэкенд?",
            "questions": [
                {"q": "Какой фреймворк вам нравится?", "opts": ["React", "Vue", "Django", "FastAPI"]}
            ]
        },
        {
            "title": "Играете ли вы в видеоигры?", 
            "desc": "Геймерская тема",
            "questions": [
                {"q": "Как часто вы играете?", "opts": ["Каждый день", "Раз в неделю", "Редко", "Не играю"]}
            ]
        },
        {
            "title": "Какая погода вам нравится?", 
            "desc": "Погодные предпочтения",
            "questions": [
                {"q": "Какая погода идеальна?", "opts": ["Солнечная", "Дождливая", "Снежная", "Облачная"]}
            ]
        },
        {
            "title": "Ваш любимый жанр фильмов", 
            "desc": "Кино",
            "questions": [
                {"q": "Что предпочитаете смотреть?", "opts": ["Фантастика", "Комедия", "Драма", "Ужасы"]}
            ]
        },
        {
            "title": "Сколько раз в день вы едите?", 
            "desc": "Питание",
            "questions": [
                {"q": "Сколько приемов пищи в день?", "opts": ["1-2", "3", "4-5", "Больше 5"]}
            ]
        },
        {
            "title": "Занимаетесь ли вы спортом?", 
            "desc": "Здоровый образ жизни",
            "questions": [
                {"q": "Сколько раз в неделю тренируетесь?", "opts": ["0 раз", "1-2 раза", "3-4 раза", "Каждый день"]}
            ]
        },
        {
            "title": "Любимый мессенджер", 
            "desc": "Средства связи",
            "questions": [
                {"q": "Чем пользуетесь чаще?", "opts": ["Telegram", "WhatsApp", "VK", "Discord"]}
            ]
        },
        {
            "title": "Планируете ли вы поехать за границу?", 
            "desc": "Путешествия",
            "questions": [
                {"q": "Куда бы хотели поехать?", "opts": ["Европа", "Азия", "Америка", "Не планирую"]}
            ]
        },
        {
            "title": "Ваш любимый праздник", 
            "desc": "Традиции",
            "questions": [
                {"q": "Какой праздник ждете больше всего?", "opts": ["Новый год", "День рождения", "Лето", "Хэллоуин"]}
            ]
        }
    ]

    for s in surveys_data:
        # Опрос нэмэх
        cursor.execute("SELECT id FROM surveys WHERE title = ?", (s["title"],))
        row = cursor.fetchone()
        if row:
            survey_id = row[0]
        else:
            cursor.execute("INSERT INTO surveys (title, description, author_id) VALUES (?, ?, 1)", (s["title"], s["desc"]))
            survey_id = cursor.lastrowid

        # Асуултууд нэмэх
        for q in s["questions"]:
            cursor.execute("SELECT id FROM questions WHERE question_text = ? AND survey_id = ?", (q["q"], survey_id))
            q_row = cursor.fetchone()
            if q_row:
                question_id = q_row[0]
            else:
                cursor.execute("INSERT INTO questions (survey_id, question_text) VALUES (?, ?)", (survey_id, q["q"]))
                question_id = cursor.lastrowid

            # Сонголтууд нэмэх
            for opt in q["opts"]:
                cursor.execute("SELECT id FROM options WHERE option_text = ? AND question_id = ?", (opt, question_id))
                if not cursor.fetchone():
                    cursor.execute("INSERT INTO options (question_id, option_text) VALUES (?, ?)", (question_id, opt))

    conn.commit()
    conn.close()
    print("База данных наполнена 15 опросами и вопросами!")

if __name__ == "__main__":
    seed_data()