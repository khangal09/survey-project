# Опросник — Вариант №25

**Учебный проект по дисциплине «Интернет-технологии» (ПР1–ПР4)**
Веб-приложение для создания опросов, сбора ответов и просмотра статистики.

🌐 **Демо (работающий сайт):**[https://survey-project-70ef.onrender.com](https://survey-project-70ef.onrender.com)
## 📋 О проекте

Приложение позволяет пользователям:
- Просматривать список доступных опросов (каталог с фильтрацией).
- Проходить опросы и отправлять свои ответы.
- Регистрироваться и входить в систему (пароли защищены с помощью bcrypt).
- Создавать собственные опросы.
- Просматривать сводную статистику ответов.

---

## 🛠️ Используемые технологии

| Слой | Технологии |
|------|------------|
| **Frontend** | HTML5, CSS3 (Grid/Flexbox), Vanilla JavaScript |
| **Backend** | Python 3.11, FastAPI, SQLite |
| **Безопасность** | passlib[bcrypt], Pydantic-валидация, защита от SQL-инъекций |
| **Развёртывание** | Docker, Render.com (HTTPS) |

---

## 📁 Структура проекта

```text
SurveyProject/
├── PythonApplication1/       # Бэкенд (ПР3)
│   ├── frontend/             # Фронтенд (ПР1 и ПР2)
│   │   ├── index.html        # Главная страница
│   │   ├── catalog.html      # Каталог опросов
│   │   ├── survey.html       # Прохождение опроса
│   │   ├── create.html       # Создание опроса
│   │   ├── login.html        # Авторизация
│   │   ├── contacts.html     # Контакты
│   │   ├── style.css         # Единый стиль (адаптив от 360px)
│   │   ├── main.js           # Логика (ПР2)
│   │   └── (файлы .svg)      # Иконки и логотипы
│   │
│   ├── PythonApplication1.py # Главный файл FastAPI (маршруты)
│   ├── database.py           # Подключение к SQLite, миграции
│   ├── seed.py               # Скрипт для заполнения БД (15 демо-опросов)
│   ├── requirements.txt      # Зависимости Python
│   └── Dockerfile            # Инструкция для Docker (ПР4)
│
├── .gitignore                # Исключения для Git
└── README.md                 # Этот файл
 Как запустить локально (без Docker)
1. Клонировать репозиторий
bash
git clone https://github.com/ВАШ-USERNAME/survey-project.git
cd survey-project/PythonApplication1
2. Установить зависимости
bash
pip install -r requirements.txt
3. Запустить сервер
bash
uvicorn PythonApplication1:app --reload
4. Открыть в браузере
text
http://127.0.0.1:8000
