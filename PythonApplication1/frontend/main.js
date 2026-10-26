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

            document.querySelectorAll('.error-text').forEach(el => el.remove());
            document.querySelectorAll('.error-input').forEach(el => el.classList.remove('error-input'));
            const oldSuccess = document.getElementById('success-message');
            if (oldSuccess) oldSuccess.remove();

            if (name.value.trim().length < 2) {
                showError(name, 'Имя должно содержать минимум 2 символа');
                isValid = false;
            }
            if (!email.value.includes('@')) {
                showError(email, 'Email должен содержать @');
                isValid = false;
            }
            if (message && message.value.trim().length < 5) {
                showError(message, 'Сообщение слишком короткое (минимум 5 символов)');
                isValid = false;
            }

            if (isValid) {
                const successMsg = document.createElement('p');
                successMsg.id = 'success-message';
                successMsg.className = 'success-text';
                successMsg.textContent = 'Сообщение успешно отправлено!';
                contactForm.appendChild(successMsg);
                contactForm.reset();
            }
        });
    }

    function showError(input, message) {
        input.classList.add('error-input');
        const errorSpan = document.createElement('span');
        errorSpan.className = 'error-text';
        errorSpan.textContent = message;
        input.parentNode.insertBefore(errorSpan, input.nextSibling);
    }

    // 3. ЗАГРУЗКА ОПРОСОВ
    loadSurveysFromBackend();
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
            card.setAttribute('data-title', survey.title.toLowerCase());
            card.setAttribute('data-category', getCategoryFromTitle(survey.title));

            card.innerHTML = `
                <article class="card">
                    <div class="card__body">
                        <span class="tag tag--tech">${getTagText(survey.title)}</span>
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

        if (document.getElementById('filter-form')) {
            setupCatalogFilters();
        }

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

function getCategoryFromTitle(title) {
    const t = title.toLowerCase();
    if (t.includes('язык') || t.includes('формат') || t.includes('лекции') || t.includes('расписание')) return 'study';
    if (t.includes('столовой') || t.includes('добираетесь') || t.includes('сна') || t.includes('спорт')) return 'life';
    if (t.includes('музыка') || t.includes('вечер') || t.includes('время года') || t.includes('книги')) return 'leisure';
    return 'tech';
}

function getTagText(title) {
    const category = getCategoryFromTitle(title);
    if (category === 'study') return 'Учёба';
    if (category === 'life') return 'Быт';
    if (category === 'leisure') return 'Досуг';
    return 'Технологии';
}

function setupCatalogFilters() {
    const searchInput = document.getElementById('q');
    const categorySelect = document.getElementById('category');
    const sortSelect = document.getElementById('sort');
    const cards = document.querySelectorAll('#survey-cards li');

    if (!searchInput || !categorySelect || !sortSelect) return;

    function filterCards() {
        const query = searchInput.value.toLowerCase().trim();
        const category = categorySelect.value;

        cards.forEach(card => {
            const title = card.getAttribute('data-title') || '';
            const cardCategory = card.getAttribute('data-category') || '';

            const matchesSearch = title.includes(query);
            const matchesCategory = !category || cardCategory === category;

            if (matchesSearch && matchesCategory) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    searchInput.addEventListener('input', filterCards);
    categorySelect.addEventListener('change', filterCards);

    sortSelect.addEventListener('change', () => {
        if (sortSelect.value === 'title') {
            const grid = document.getElementById('survey-cards');
            const items = Array.from(grid.children);
            items.sort((a, b) => {
                const titleA = a.getAttribute('data-title') || '';
                const titleB = b.getAttribute('data-title') || '';
                return titleA.localeCompare(titleB, 'ru');
            });
            items.forEach(item => grid.appendChild(item));
        }
    });
}