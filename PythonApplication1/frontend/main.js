// Инициализация скрипта после загрузки страницы
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
                // Вывод данных о погоде на страницу
                weatherWidget.innerHTML = `<span style="font-size: 1.5rem; margin-right: 10px;">🌤️</span> Сейчас в Санкт-Петербурге: <strong>${data.current_weather.temperature}°C</strong>`;
            })
            .catch(() => {
                // Вывод ошибки при отсутствии соединения
                weatherWidget.innerHTML = '<span style="color: red;">⚠️ Не удалось загрузить погоду</span>';
            });
    }

    // 2. ВАЛИДАЦИЯ ФОРМЫ (Обратная связь)
    const contactForm = document.querySelector('form[action="contacts.html"]');
    if (contactForm) {
        contactForm.addEventListener('submit', function (event) {
            event.preventDefault();
            const name = document.getElementById('name');
            const email = document.getElementById('email');
            let isValid = true;

            // Очистка старых ошибок
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
            if (isValid) {
                alert('Сообщение отправлено!');
                contactForm.reset();
            }
        });
    }

    // Функция для вывода ошибки под полем
    function showError(input, message) {
        input.classList.add('error-input');
        const span = document.createElement('span');
        span.className = 'error-text';
        span.textContent = message;
        input.parentNode.insertBefore(span, input.nextSibling);
    }

    // 3. ИНТЕРАКТИВ (Динамическое добавление вопросов)
    const createForm = document.querySelector('form[action="create.html"]');
    if (createForm) {
        const fieldset = createForm.querySelector('fieldset');
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn--ghost';
        addBtn.textContent = '+ Добавить вариант ответа';
        addBtn.style.marginTop = '10px';
        addBtn.style.display = 'block';
        fieldset.appendChild(addBtn);

        let count = 4;
        addBtn.addEventListener('click', () => {
            count++;
            const div = document.createElement('div');
            div.className = 'field';
            div.innerHTML = `<label for="opt${count}">Вариант ${count}</label><input type="text" id="opt${count}" name="option${count}" placeholder="Текст варианта...">`;
            fieldset.insertBefore(div, addBtn);
        });
    }

    // 4. ЗАГРУЗКА ДАННЫХ ИЗ БАЗЫ (Python сервер)
    loadSurveysFromBackend();
});

// Функция для получения списка опросов с сервера
async function loadSurveysFromBackend() {
    const grid = document.querySelector('.survey-grid') || document.querySelector('.cards');
    if (!grid) return;

    try {
        // Запрос к API сервера
        const response = await fetch('http://127.0.0.1:8000/api/surveys');
        if (!response.ok) throw new Error('Сервер не отвечает');

        const surveys = await response.json();
        grid.innerHTML = '';

        if (surveys.length === 0) {
            grid.innerHTML = '<p>Пока нет опросов в базе данных.</p>';
            return;
        }

        // Отрисовка карточек с данными из БД
        surveys.forEach(survey => {
            const card = document.createElement('li');
            card.innerHTML = `
                <article class="card card--study" style="height: 100%;">
                    <div class="card__body">
                        <span class="tag tag--study">Опрос</span>
                        <h3 class="card__title"><a href="survey.html?id=${survey.id}">${survey.title}</a></h3>
                        <p>${survey.description}</p>
                    </div>
                    <footer class="card__meta">
                        <span>Автор ID: ${survey.author_id}</span>
                        <a href="survey.html?id=${survey.id}" class="btn" style="padding: 0.4rem 1rem; font-size: 0.9rem;">Пройти</a>
                    </footer>
                </article>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        console.error("Ошибка загрузки опросов:", error);
        grid.innerHTML = '<p style="color:red; font-weight:bold;">⚠️ Ошибка загрузки. Убедитесь, что Python сервер запущен.</p>';
    }
}