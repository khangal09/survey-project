// ==========================================================
// ПРОЕКТ: САЙТ ОПРОСОВ "СТАТОПРОС"
// ФАЙЛ: main.js
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {

    // 1. ВНЕШНИЙ API (Погода)
    const weatherWidget = document.getElementById('weather-widget');
    if (weatherWidget) {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=59.93&longitude=30.31&current_weather=true';
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('Ошибка сети');
                return res.json();
            })
            .then(data => {
                weatherWidget.innerHTML = `
                    <span class="weather-widget__icon" aria-hidden="true">🌤️</span>
                    <p class="weather-widget__text">
                        Сейчас в Санкт-Петербурге: <strong>${data.current_weather.temperature}°C</strong>
                    </p>
                `;
            })
            .catch(() => {
                weatherWidget.innerHTML = `
                    <span class="weather-widget__icon" aria-hidden="true">⚠️</span>
                    <p class="weather-widget__text" style="color: var(--danger);">
                        Не удалось загрузить погоду
                    </p>
                `;
            });
    }

    // 2. ВАЛИДАЦИЯ ФОРМЫ (Обратная связь)
    const contactForm = document.querySelector('form[action="contacts.html"]');
    if (contactForm) {
        contactForm.addEventListener('submit', function (event) {
            event.preventDefault();
            const name = document.getElementById('name');
            const email = document.getElementById('email');
            const message = document.getElementById('message');
            let isValid = true;

            // Удаляем старые ошибки
            document.querySelectorAll('.error-text').forEach(el => el.remove());
            document.querySelectorAll('.error-input').forEach(el => el.classList.remove('error-input'));

            // Проверка имени
            if (name.value.trim().length < 2) {
                showError(name, 'Имя должно содержать минимум 2 символа');
                isValid = false;
            }
            // Проверка email
            if (!email.value.includes('@')) {
                showError(email, 'Email должен содержать @');
                isValid = false;
            }
            // Проверка сообщения
            if (message && message.value.trim().length < 5) {
                showError(message, 'Сообщение слишком короткое (минимум 5 символов)');
                isValid = false;
            }

            if (isValid) {
                alert('Сообщение успешно отправлено!');
                contactForm.reset();
            }
        });
    }

    // Функция для вывода ошибки под полем
    function showError(input, message) {
        input.classList.add('error-input');
        const errorSpan = document.createElement('span');
        errorSpan.className = 'error-text';
        errorSpan.textContent = message;
        input.parentNode.insertBefore(errorSpan, input.nextSibling);
    }

    // 3. ДИНАМИЧЕСКОЕ ДОБАВЛЕНИЕ ВОПРОСОВ (Создание опроса)
    const createForm = document.querySelector('form[action="create.html"]');
    if (createForm) {
        const fieldset = createForm.querySelector('fieldset');
        if (fieldset) {
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'btn btn--secondary';
            addBtn.textContent = '+ Добавить вариант ответа';
            addBtn.style.marginTop = '10px';
            addBtn.style.display = 'block';
            fieldset.appendChild(addBtn);

            let count = 4;
            addBtn.addEventListener('click', () => {
                count++;
                const div = document.createElement('div');
                div.className = 'field';
                div.innerHTML = `
                    <label for="opt${count}">Вариант ${count}</label>
                    <input type="text" id="opt${count}" name="option${count}" placeholder="Текст варианта...">
                `;
                fieldset.insertBefore(div, addBtn);
            });
        }
    }

    // 4. ЗАГРУЗКА ОПРОСОВ ИЗ БАЗЫ ДАННЫХ (Python сервер)
    loadSurveysFromBackend();
});

// Асинхронная функция для загрузки данных с Python-сервера
async function loadSurveysFromBackend() {
    const grid = document.querySelector('.survey-grid') || document.querySelector('.cards');
    if (!grid) return;

    try {
        // Используем относительный путь для работы как локально, так и на Render
        const response = await fetch('/api/surveys');
        if (!response.ok) throw new Error('Сервер не отвечает');

        const surveys = await response.json();
        grid.innerHTML = '';

        if (surveys.length === 0) {
            grid.innerHTML = '<li><p>Пока нет опросов в базе данных.</p></li>';
            return;
        }

        // Отрисовка карточек
        surveys.forEach(survey => {
            const card = document.createElement('li');
            card.innerHTML = `
                <article class="card">
                    <div class="card__body">
                        <span class="tag tag--tech">Опрос</span>
                        <h3 class="card__title">
                            <a href="survey.html?id=${survey.id}">${survey.title}</a>
                        </h3>
                        <p>${survey.description}</p>
                        <a class="btn" href="survey.html?id=${survey.id}">Пройти опрос</a>
                    </div>
                    <div class="card__meta">
                        <span>Автор ID: ${survey.author_id}</span>
                        <span>Доступен</span>
                    </div>
                </article>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        console.error("Ошибка загрузки опросов:", error);
        grid.innerHTML = `
            <li>
                <p style="color: var(--danger); font-weight: bold;">
                    ⚠️ Ошибка загрузки. Убедитесь, что Python сервер запущен.
                </p>
            </li>
        `;
    }
}