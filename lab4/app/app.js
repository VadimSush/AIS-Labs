const OLLAMA_URL = "http://localhost:11434/v1/chat/completions";
const MODEL_NAME = "qwen3:14b"; 

const modeSelect = document.getElementById("mode");
const questionInput = document.getElementById("question");
const dynamicFields = document.getElementById("dynamicFields");
const fieldsContainer = document.getElementById("fieldsContainer");
const addFieldBtn = document.getElementById("addFieldBtn");
const dynamicTitle = document.getElementById("dynamicTitle");
const submitBtn = document.getElementById("submitBtn");
const reasoningCheckbox = document.getElementById("reasoningMode");
const errorBox = document.getElementById("errorBox");
const resultBox = document.getElementById("resultBox");

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
}

function hideError() {
    errorBox.classList.add("hidden");
}

function updateUI() {
    const mode = modeSelect.value;
    fieldsContainer.innerHTML = ""; 
    
    if (mode === "short_answer") {
        dynamicFields.classList.add("hidden");
    } else {
        dynamicFields.classList.remove("hidden");
        
        if (mode === "matching") {
            dynamicTitle.textContent = "Елементи для зіставлення (Група 1 та Група 2):";
            addFieldBtn.textContent = "+ Додати пару";
            addPairInput(); addPairInput(); addPairInput();
        } else {
            dynamicTitle.textContent = "Варіанти відповідей:";
            addFieldBtn.textContent = "+ Додати варіант";
            addSingleInput(); addSingleInput(); addSingleInput(); addSingleInput();
        }
    }
}

function addSingleInput() {
    const row = document.createElement("div");
    row.className = "dynamic-row";
    row.innerHTML = `
        <input type="text" class="opt-val" placeholder="Введіть варіант відповіді...">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
    `;
    fieldsContainer.appendChild(row);
}

function addPairInput() {
    const row = document.createElement("div");
    row.className = "dynamic-row";
    row.innerHTML = `
        <input type="text" class="match-left" placeholder="Лівий стовпчик (напр. Поняття)">
        <input type="text" class="match-right" placeholder="Правий стовпчик (напр. Визначення)">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
    `;
    fieldsContainer.appendChild(row);
}

addFieldBtn.addEventListener("click", () => {
    if (modeSelect.value === "matching") addPairInput();
    else addSingleInput();
});
modeSelect.addEventListener("change", updateUI);
window.addEventListener("DOMContentLoaded", updateUI); 

function validateInputs(mode, question) {
    if (!question) {
        showError("Будь ласка, введіть запитання або умову завдання.");
        return false;
    }

    if (mode === "short_answer") return true;

    let validCount = 0;

    if (mode === "matching") {
        const lefts = document.querySelectorAll(".match-left");
        const rights = document.querySelectorAll(".match-right");
        for (let i = 0; i < lefts.length; i++) {
            if (lefts[i].value.trim() && rights[i].value.trim()) {
                validCount++;
            }
        }
        if (validCount < 2) {
            showError("Для встановлення відповідностей потрібно повністю заповнити мінімум 2 пари (лівий і правий стовпчики).");
            return false;
        }
    } else {
        document.querySelectorAll(".opt-val").forEach(inp => {
            if (inp.value.trim()) validCount++;
        });
        if (validCount < 2) {
            showError("Будь ласка, введіть мінімум 2 варіанти відповіді.");
            return false;
        }
    }

    hideError();
    return true;
}

function buildUserPrompt(question, mode) {
    let prompt = `Питання/Завдання: ${question}\n\n`;

    if (mode === "short_answer") return prompt;

    if (mode === "matching") {
        prompt += "Список елементів (їх потрібно правильно зіставити між собою):\n\nГрупа 1:\n";
        document.querySelectorAll(".match-left").forEach((inp, i) => {
            if (inp.value.trim()) prompt += `${i + 1}. ${inp.value.trim()}\n`;
        });
        prompt += "\nГрупа 2:\n";
        document.querySelectorAll(".match-right").forEach((inp) => {
            if (inp.value.trim()) prompt += `- ${inp.value.trim()}\n`;
        });
    } else {
        prompt += "Надані варіанти:\n";
        document.querySelectorAll(".opt-val").forEach((inp, i) => {
            if (inp.value.trim()) prompt += `${i + 1}. ${inp.value.trim()}\n`;
        });
    }
    return prompt;
}

const getSystemPrompt = (mode) => {
    const base = "Ти асистент-викладач. Надай правильну відповідь та коротке пояснення. ВАЖЛИВО: Якщо серед наданих варіантів немає жодного правильного, завдання містить помилку або на нього неможливо дати відповідь, чітко вкажи 'Правильна відповідь відсутня' у відповідному полі і поясни чому в explanation, але тільки для питань з варіантами відповідей. Ти ПОВИНЕН повернути відповідь виключно у форматі JSON. Не пиши жодного тексту поза JSON.";
    
    switch (mode) {
        case "single_choice": return `${base} Формат JSON: {$"answer": "Текст правильного варіанту", "explanation": "Чому це правильно"}`;
        case "multiple_choice": return `${base} Формат JSON: {$"answers": ["Варіант 1", "Варіант 2"], "explanation": "Чому ці варіанти правильні"}`;
        case "short_answer": return `${base} Формат JSON: {$"answer": "Точна коротка відповідь", "explanation": "Пояснення"}`;
        case "matching": return `${base} Формат JSON: {$"matches": {"Елемент Групи 1": "Відповідний елемент Групи 2"}, "explanation": "Логіка зіставлення"}`;
        case "ordering": return `${base} Формат JSON: {$"sequence": ["Перший", "Другий", "Третій"], "explanation": "Чому порядок такий"}`;
        default: return base;
    }
};

const renderResult = (mode, data) => {
    let html = "";
    
    if (data.reasoning) {
        html += `
            <details class="reasoning-block">
                <summary>Показати/Приховати міркування моделі</summary>
                <div class="reasoning-content">${data.reasoning.replace(/\n/g, '<br>')}</div>
            </details>
        `;
    }

    if (mode === "single_choice" || mode === "short_answer") {
        html += `<div><strong>Правильна відповідь:</strong> ${data.answer}</div>`;
    } else if (mode === "multiple_choice") {
        html += `<div><strong>Правильні варіанти:</strong> <ul>${data.answers.map(a => `<li>${a}</li>`).join('')}</ul></div>`;
    } else if (mode === "matching") {
        html += `<div><strong>Відповідності:</strong><ul>`;
        for (const [key, value] of Object.entries(data.matches)) {
            html += `<li><b>${key}</b> ➔ ${value}</li>`;
        }
        html += `</ul></div>`;
    } else if (mode === "ordering") {
        html += `<div><strong>Правильна послідовність:</strong> <ol>${data.sequence.map(s => `<li>${s}</li>`).join('')}</ol></div>`;
    }
    
    if (data.explanation) {
        html += `<div class="explanation"><strong>Пояснення:</strong> ${data.explanation}</div>`;
    }
    return html;
};

submitBtn.addEventListener("click", async () => {
    const question = questionInput.value.trim();
    const mode = modeSelect.value;
    const useReasoning = reasoningCheckbox.checked;

    if (!validateInputs(mode, question)) {
        return;
    }

    const userPrompt = buildUserPrompt(question, mode);

    submitBtn.disabled = true;
    hideError();
    resultBox.classList.add("hidden");
    document.getElementById("loader").classList.remove("hidden");

    try {
        const response = await fetch(OLLAMA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    { role: "system", content: getSystemPrompt(mode) },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.1,    
                max_tokens: useReasoning ? 4000 : 1000,
                response_format: { type: "json_object" },
                think: useReasoning,
            })
        });

        if (!response.ok) throw new Error(`Помилка сервера: ${response.status}. Перевірте, чи працює Ollama.`);

        const data = await response.json();
        const message = data.choices[0].message;
        const parsedResult = JSON.parse(message.content);

        if (useReasoning && message.reasoning) {
            parsedResult.reasoning = message.reasoning;
        }

        document.getElementById("answerContent").innerHTML = renderResult(mode, parsedResult);
        document.getElementById("resultBox").classList.remove("hidden");

    } catch (error) {
        let msg = error.message;
        if (msg === "Failed to fetch") msg = "Не вдалося з'єднатися з сервером. Переконайтеся, що Ollama запущена з параметром OLLAMA_ORIGINS=\"*\".";
        if (error instanceof SyntaxError) msg = "Модель повернула пошкоджений JSON (можливо, не вистачило max_tokens). Спробуйте ще раз з режимом міркування або переформулюйте питання.";
        
        showError(msg);
    } finally {
        submitBtn.disabled = false;
        document.getElementById("loader").classList.add("hidden");
    }
});