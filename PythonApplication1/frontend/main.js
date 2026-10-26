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

            // Удаляем старые ошибки и сообщения об успехе
            document.querySelectorAll('.error-text').forEach(el => el.remove());
            document.querySelectorAll('.error-input').forEach(el => el.classList.remove('error-input'));
            const oldSuccess = document.getElementById('success-message');
            if (oldSuccess) oldSuccess.remove();

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
                // Выводим зеленое сообщение об успехе
                const successMsg = document.createElement('p');
                successMsg.id = 'success-message';
                successMsg.className = 'success-text';
                successMsg.textContent = 'Сообщение успешно отправлено!';
                contactForm.appendChild(successMsg);
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

    // 3. ЗАГРУЗКА ОПРОСОВ
    loadSurveysFromBackend();

    // 4. ПОИСК И ФИЛЬТРАЦИЯ (Каталог)
    setupCatalogFilters();
});

// Загрузка опросов с сервера
async function loadSurveysFromBackend() {
    const grid = document.querySelector('.survey-grid') || document.querySelector('.cards');
    if (!grid) return;

    try {
        const response = await fetch('/api/surveys');
        if (!response.ok) throw new Error('Сервер не отвечает');

        const surveys = await response.json();
        const limit = grid.classList.contains('survey-grid') ? 6 : surveys.length;
        const displaySurveys = surveys.slice(0, limit);

        grid.innerHTML = '';

        if (displaySurveys.length === 0) {
            grid.innerHTML = '<li><p>Пока нет опросов в базе данных.</p></li>';
            return;
        }

        displaySurveys.forEach(survey => {
            const card = document.createElement('li');
            card.innerHTML = `
                <article class="card" data-title="${survey.title.toLowerCase()}" data-category="${survey.author_id}">
                    <div class="card__body">
                        <span class="tag tag--tech">Опрос</span>
                        <h3 class="card__title">
                            <a href="survey.html?id=${survey.id}">${survey.title}</a>
                        </h3>
                        <p>${survey.description}</p>
                        <a class="btn" href="survey.html?id=${survey.id}">Пройти опрос</a>
                    </div>
                    <footer class="card__meta">
                        <span>Автор ID: ${survey.author_id}</span>
                        <span>Доступен</span>
                    </footer>
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

// Настройка поиска и фильтрации в каталоге
function setupCatalogFilters() {
    const searchInput = document.getElementById('q');
    const categorySelect = document.getElementById('category');
    const sortSelect = document.getElementById('sort');

    if (!searchInput || !categorySelect || !sortSelect) return;

    // Функция фильтрации
    function filterCards() {
        const query = searchInput.value.toLowerCase().trim();
        const category = categorySelect.value;
        const cards = document.querySelectorAll('.cards li');

        cards.forEach(card => {
            const title = card.querySelector('.card__title a').textContent.toLowerCase();
            const tag = card.querySelector('.tag').textContent.toLowerCase();

            // Проверка поиска
            const matchesSearch = title.includes(query);

            // Проверка рубрики
            let matchesCategory = true;
            if (category) {
                const categoryMap = {
                    'study': 'учеба',
                    'life': 'быт',
                    'leisure': 'досуг',
                    'tech': 'технологии'
                };
                matchesCategory = tag.includes(categoryMap[category] || category);
            }

            // Показ/скрытие
            if (matchesSearch && matchesCategory) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Слушатели событий
    searchInput.addEventListener('input', filterCards);
    categorySelect.addEventListener('change', filterCards);

    // Сортировка по названию
    sortSelect.addEventListener('change', () => {
        const sortValue = sortSelect.value;
        const grid = document.querySelector('.cards');
        if (!grid) return;

        const items = Array.from(grid.children);

        if (sortValue === 'title') {
            items.sort((a, b) => {
                const titleA = a.querySelector('.card__title a').textContent;
                const titleB = b.querySelector('.card__title a').textContent;
                return titleA.localeCompare(titleB, 'ru');
            });
        }

        items.forEach(item => grid.appendChild(item));
    });
}