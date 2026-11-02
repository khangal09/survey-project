"use strict";

/* ==========================================================
   СТАТОПРОС — main.js (v12)
   Весь JavaScript сайта. Каждая страница запускает только свою
   часть: init-функции проверяют, есть ли нужные элементы.
   ========================================================== */

const CATEGORIES = {
    study: { label: "Учёба", cls: "tag--study" },
    life: { label: "Быт", cls: "tag--life" },
    leisure: { label: "Досуг", cls: "tag--leisure" },
    tech: { label: "Технологии", cls: "tag--tech" }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------- Утилиты ---------- */
const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(value ?? "").replace(/[&<>"']/g, (ch) => map[ch]);
}

function formatDate(iso) {
    const [y, m, d] = String(iso || "").slice(0, 10).split("-");
    return y && m && d ? `${d}.${m}.${y}` : "";
}

function extractError(data) {
    const detail = data && data.detail;
    if (Array.isArray(detail) && detail.length) return detail[0].msg || "Некорректные данные";
    return typeof detail === "string" ? detail : "Ошибка сервера";
}

async function api(path, options) {
    const res = await fetch(path, options);
    let data = null;
    try { data = await res.json(); } catch { /* пустой ответ */ }
    if (!res.ok) {
        const error = new Error(extractError(data));
        error.status = res.status;
        throw error;
    }
    return data;
}

function jsonPost(body) {
    return {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    };
}

function setStatus(el, text, state) {
    if (!el) return;
    el.textContent = text;
    if (state) el.dataset.state = state; else delete el.dataset.state;
}

function getUser() {
    try {
        const id = Number(localStorage.getItem("user_id"));
        const username = localStorage.getItem("username");
        return id && username ? { id, username } : null;
    } catch {
        return null;
    }
}

function saveUser(data) {
    localStorage.setItem("user_id", data.user_id);
    localStorage.setItem("username", data.username);
}

function clearUser() {
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
}

/* ---------- Карточки опросов ---------- */
function cardHtml(survey) {
    const cat = CATEGORIES[survey.category] || CATEGORIES.tech;
    const date = String(survey.created_at || "").slice(0, 10);
    const link = `survey.html?id=${encodeURIComponent(survey.id)}`;
    return `
        <article class="card">
            <div class="card__body">
                <span class="tag ${cat.cls}">${cat.label}</span>
                <h3 class="card__title"><a href="${link}">${escapeHtml(survey.title)}</a></h3>
                <p>${escapeHtml(survey.description)}</p>
                <a class="btn" href="${link}">Пройти опрос</a>
            </div>
            <footer class="card__meta">
                <span>Ответов: ${Number(survey.votes) || 0}</span>
                <time datetime="${escapeHtml(date)}">${formatDate(date)}</time>
            </footer>
        </article>`;
}

function renderCards(grid, surveys, emptyText) {
    if (!surveys.length) {
        grid.innerHTML = `<li class="state-msg">${escapeHtml(emptyText)}</li>`;
        return;
    }
    grid.innerHTML = surveys.map((s) => `<li>${cardHtml(s)}</li>`).join("");
}

function showGridError(grid) {
    grid.innerHTML = '<li class="state-msg state-msg--error">⚠️ Не удалось загрузить опросы. Проверьте, что сервер запущен.</li>';
}

/* ---------- Шапка: имя пользователя / выход ---------- */
function initAuthLink() {
    const link = $("auth-link");
    const user = getUser();
    if (!link || !user) return;

    link.textContent = `${user.username} (выйти)`;
    link.href = "#";
    link.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm("Выйти из аккаунта?")) {
            clearUser();
            location.href = "index.html";
        }
    });
}

/* ---------- Погода (Open-Meteo) ---------- */
async function initWeather() {
    const widget = $("weather-widget");
    if (!widget) return;

    try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=59.93&longitude=30.31&current_weather=true");
        if (!res.ok) throw new Error("network");
        const data = await res.json();
        const temp = Number(data.current_weather.temperature);
        widget.innerHTML = `
            <span class="weather-widget__icon" aria-hidden="true">🌤️</span>
            <p class="weather-widget__text">Сейчас в Санкт-Петербурге: <strong>${temp}°C</strong></p>`;
    } catch {
        widget.innerHTML = `
            <span class="weather-widget__icon" aria-hidden="true">⚠️</span>
            <p class="weather-widget__text" style="color: var(--danger);">Не удалось загрузить погоду</p>`;
    }
}

/* ---------- Главная: популярные опросы ---------- */
async function initHome() {
    const grid = document.querySelector(".survey-grid");
    if (!grid) return;
    try {
        const surveys = await api("/api/surveys");
        const popular = [...surveys].sort((a, b) => b.votes - a.votes).slice(0, 6);
        renderCards(grid, popular, "Пока нет опросов.");
    } catch {
        showGridError(grid);
    }
}

/* ---------- Каталог: поиск, рубрика, сортировка ---------- */
async function initCatalog() {
    const grid = $("survey-cards");
    if (!grid) return;

    const q = $("q");
    const category = $("category");
    const sort = $("sort");
    const title = $("list-title");
    let surveys = [];

    $("filter-form").addEventListener("submit", (e) => e.preventDefault());

    const sorters = {
        new: (a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id,
        popular: (a, b) => b.votes - a.votes,
        title: (a, b) => a.title.localeCompare(b.title, "ru")
    };

    function update() {
        const query = q.value.trim().toLowerCase();
        const list = surveys
            .filter((s) => s.title.toLowerCase().includes(query))
            .filter((s) => !category.value || s.category === category.value)
            .sort(sorters[sort.value] || sorters.new);

        title.textContent = `Список опросов (${list.length})`;
        renderCards(grid, list, "Ничего не найдено. Измените условия поиска.");
    }

    try {
        surveys = await api("/api/surveys");
        update();
    } catch {
        showGridError(grid);
        return;
    }

    q.addEventListener("input", update);
    category.addEventListener("change", update);
    sort.addEventListener("change", update);
}

/* ---------- Страница опроса ---------- */
function renderResults(container, questions) {
    container.innerHTML = "";
    questions.forEach((question) => {
        const total = question.options.reduce((sum, o) => sum + o.votes, 0);

        const heading = document.createElement("h3");
        heading.className = "results-question";
        heading.textContent = question.text;
        container.appendChild(heading);

        question.options.forEach((opt) => {
            const percent = total ? Math.round((opt.votes / total) * 100) : 0;
            const block = document.createElement("div");
            block.className = "result";

            const head = document.createElement("div");
            head.className = "result__head";
            const name = document.createElement("span");
            name.textContent = opt.text;
            const value = document.createElement("span");
            value.textContent = `${opt.votes} (${percent}%)`;
            head.append(name, value);

            const bar = document.createElement("progress");
            bar.max = 100;
            bar.value = percent;
            bar.setAttribute("aria-label", `${opt.text}: ${percent}%`);

            block.append(head, bar);
            container.appendChild(block);
        });
    });
}

async function initSurvey() {
    const form = $("survey-form");
    if (!form) return;

    const titleEl = $("survey-title");
    const descEl = $("survey-description");
    const authorEl = $("survey-author");
    const container = $("questions-container");
    const message = $("survey-message");
    const submitBtn = $("survey-submit");
    const formTitle = $("survey-form-title");
    const cover = $("survey-cover");

    const surveyId = new URLSearchParams(location.search).get("id");
    if (!surveyId || !/^\d+$/.test(surveyId)) {
        titleEl.textContent = "Опрос не выбран";
        descEl.textContent = "Пожалуйста, выберите опрос из каталога.";
        container.innerHTML = "";
        submitBtn.hidden = true;
        return;
    }

    async function showResults(note) {
        const data = await api(`/api/surveys/${surveyId}/results`);
        formTitle.textContent = "Результаты";
        renderResults(container, data.questions);
        submitBtn.hidden = true;
        if (note) setStatus(message, note, "success");
    }

    let survey;
    try {
        survey = await api(`/api/surveys/${surveyId}`);
    } catch {
        titleEl.textContent = "Ошибка загрузки";
        descEl.textContent = "Опрос не найден в базе данных.";
        container.innerHTML = "";
        submitBtn.hidden = true;
        return;
    }

    document.title = `${survey.title} — Статопрос`;
    titleEl.textContent = survey.title;
    descEl.textContent = survey.description;
    authorEl.textContent = survey.author || `ID ${survey.author_id}`;
    cover.src = `cover-${survey.category}.svg`;
    cover.hidden = false;
    cover.onerror = () => { cover.hidden = true; };

    if (survey.closed) {
        await showResults("Опрос завершён. Ниже — итоговые результаты.");
        return;
    }
    if (!survey.questions.length) {
        container.innerHTML = "<p>В этом опросе пока нет вопросов.</p>";
        submitBtn.hidden = true;
        return;
    }

    container.innerHTML = "";
    survey.questions.forEach((q) => {
        const fieldset = document.createElement("fieldset");
        fieldset.dataset.questionId = q.id;
        const legend = document.createElement("legend");
        legend.textContent = q.text;
        fieldset.appendChild(legend);

        q.options.forEach((opt) => {
            const label = document.createElement("label");
            label.className = "choice";
            const input = document.createElement("input");
            input.type = "radio";
            input.name = `question_${q.id}`;
            input.value = opt.id;
            input.required = true;
            label.append(input, document.createTextNode(opt.text));
            fieldset.appendChild(label);
        });
        container.appendChild(fieldset);
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const answers = [...form.querySelectorAll("fieldset[data-question-id]")].map((fs) => {
            const checked = fs.querySelector("input:checked");
            return checked
                ? { question_id: Number(fs.dataset.questionId), option_id: Number(checked.value) }
                : null;
        });
        if (answers.includes(null)) {
            setStatus(message, "Ответьте на все вопросы.", "error");
            return;
        }

        const user = getUser();
        submitBtn.disabled = true;
        try {
            const data = await api(`/api/surveys/${surveyId}/vote`,
                jsonPost({ user_id: user ? user.id : null, answers }));
            formTitle.textContent = "Результаты";
            renderResults(container, data.questions);
            submitBtn.hidden = true;
            setStatus(message, "Спасибо! Ваш голос учтён.", "success");
        } catch (err) {
            if (err.status === 409) {
                await showResults(err.message);
            } else {
                setStatus(message, err.message, "error");
            }
        } finally {
            submitBtn.disabled = false;
        }
    });
}

/* ---------- Создание опроса ---------- */
async function initCreate() {
    const form = $("create-survey-form");
    if (!form) return;

    const message = $("create-form-message");
    const hint = $("login-hint");
    const dateInput = $("end-date");
    const user = getUser();

    // Нельзя выбрать прошедшую дату (по локальному времени)
    const now = new Date();
    dateInput.min = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");

    if (!user) hint.hidden = false;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!user) {
            setStatus(message, "Сначала войдите в аккаунт.", "error");
            return;
        }

        const title = $("title").value.trim();
        const description = $("description").value.trim();
        const options = ["opt1", "opt2", "opt3", "opt4"].map((id) => $(id).value.trim()).filter(Boolean);

        if (title.length < 3) return setStatus(message, "Название должно содержать не менее 3 символов.", "error");
        if (description.length < 5) return setStatus(message, "Добавьте более подробное описание опроса.", "error");
        if (options.length < 2) return setStatus(message, "Укажите не менее двух вариантов ответа.", "error");

        const submit = form.querySelector('button[type="submit"]');
        submit.disabled = true;
        try {
            const data = await api("/api/surveys", jsonPost({
                title,
                description,
                category: $("category").value,
                options,
                end_date: dateInput.value || null,
                author_id: user.id
            }));
            setStatus(message, "Опрос создан! Переходим к нему...", "success");
            setTimeout(() => { location.href = `survey.html?id=${data.id}`; }, 1200);
        } catch (err) {
            setStatus(message, err.message, "error");
            submit.disabled = false;
        }
    });

    form.addEventListener("reset", () => setStatus(message, ""));

    // Боковая панель: статистика и последние опросы
    try {
        const surveys = await api("/api/surveys");
        const totalVotes = surveys.reduce((sum, s) => sum + s.votes, 0);
        $("stat-surveys").textContent = surveys.length;
        $("stat-votes").textContent = totalVotes;
        $("stat-avg").textContent = surveys.length ? Math.round(totalVotes / surveys.length) : 0;

        $("recent-body").innerHTML = surveys.slice(0, 3).map((s) => {
            const cat = CATEGORIES[s.category] || CATEGORIES.tech;
            return `<tr>
                <td><a href="survey.html?id=${encodeURIComponent(s.id)}">${escapeHtml(s.title)}</a></td>
                <td>${cat.label}</td>
                <td>${formatDate(s.created_at)}</td>
                <td>${Number(s.votes) || 0}</td>
            </tr>`;
        }).join("");
    } catch {
        $("recent-body").innerHTML = '<tr><td colspan="4">Не удалось загрузить данные.</td></tr>';
    }
}

/* ---------- Контакты: валидация формы ---------- */
function showFieldError(input, text) {
    input.classList.add("error-input");
    input.setAttribute("aria-invalid", "true");
    const span = document.createElement("span");
    span.className = "error-text";
    span.textContent = text;
    input.insertAdjacentElement("afterend", span);
}

function initContacts() {
    const form = $("contact-form");
    if (!form) return;

    const status = $("contact-form-message");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        form.querySelectorAll(".error-text").forEach((el) => el.remove());
        form.querySelectorAll(".error-input").forEach((el) => {
            el.classList.remove("error-input");
            el.removeAttribute("aria-invalid");
        });
        setStatus(status, "");

        const name = $("name");
        const email = $("email");
        const text = $("message");
        let valid = true;

        if (name.value.trim().length < 2) {
            showFieldError(name, "Имя должно содержать минимум 2 символа");
            valid = false;
        }
        if (!EMAIL_RE.test(email.value.trim())) {
            showFieldError(email, "Введите корректный email, например ivan@mail.ru");
            valid = false;
        }
        if (text.value.trim().length < 5) {
            showFieldError(text, "Сообщение слишком короткое (минимум 5 символов)");
            valid = false;
        }

        if (valid) {
            setStatus(status, "Сообщение успешно отправлено!", "success");
            form.reset();
        }
    });
}

/* ---------- Вход и регистрация ---------- */
function initLogin() {
    const loginForm = $("login-form");
    const registerForm = $("register-form");
    if (!loginForm || !registerForm) return;

    const message = $("auth-message");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
            const data = await api("/api/login", jsonPost({
                username: $("login-username").value.trim(),
                password: $("login-password").value
            }));
            saveUser(data);
            setStatus(message, `Добро пожаловать, ${data.username}!`, "success");
            setTimeout(() => { location.href = "index.html"; }, 800);
        } catch (err) {
            setStatus(message, err.message, "error");
        }
    });

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
            await api("/api/register", jsonPost({
                username: $("reg-username").value.trim(),
                password: $("reg-password").value
            }));
            setStatus(message, "Успешная регистрация! Теперь войдите.", "success");
            registerForm.reset();
        } catch (err) {
            setStatus(message, err.message, "error");
        }
    });
}

/* ---------- Запуск ---------- */
document.addEventListener("DOMContentLoaded", () => {
    initAuthLink();
    initWeather();
    initHome();
    initCatalog();
    initSurvey();
    initCreate();
    initContacts();
    initLogin();
});