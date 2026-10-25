import sqlite3

DB_PATH = "survey.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Хэрэглэгчид
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')

    # Опросууд
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS surveys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            author_id INTEGER,
            FOREIGN KEY (author_id) REFERENCES users (id)
        )
    ''')

    # Асуултууд (Опрос бүрт харьяалагдана)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            survey_id INTEGER,
            question_text TEXT NOT NULL,
            FOREIGN KEY (survey_id) REFERENCES surveys (id)
        )
    ''')

    # Хариултын сонголтууд (Асуулт бүрт харьяалагдана)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER,
            option_text TEXT NOT NULL,
            FOREIGN KEY (question_id) REFERENCES questions (id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("База данных успешно создана!")

if __name__ == "__main__":
    init_db()
