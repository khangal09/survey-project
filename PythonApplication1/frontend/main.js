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

    // 2. ЗАГРУЗКА ОПРОСОВ НА ГЛАВНОЙ И В КАТАЛОГЕ
    loadSurveysFromBackend();
});

async function loadSurveysFromBackend() {
    const grid = document.querySelector('.survey-grid') || document.querySelector('.cards');
    if (!grid) return;

    try {
        const response = await fetch('/api/surveys');
        if (!response.ok) throw new Error('Сервер не отвечает');

        const surveys = await response.json();

        // Если мы на главной, показываем только 6 опросов, если в каталоге - все
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
                <article class="card">
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