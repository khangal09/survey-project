# Используем официальный образ Python
FROM python:3.11-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файл с зависимостями и устанавливаем их
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем все остальные файлы проекта
COPY . .

# Запускаем сервер (Render автоматически передаст нужный порт через переменную $PORT)
CMD ["sh", "-c", "uvicorn PythonApplication1:app --host 0.0.0.0 --port ${PORT:-8000}"]