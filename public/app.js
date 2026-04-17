const messagesEl = document.querySelector("#messages");
const composerEl = document.querySelector("#composer");
const inputEl = document.querySelector("#messageInput");
const statusEl = document.querySelector("#status");
const suggestionsEl = document.querySelector("#suggestions");

const SUGGESTION_POOL = [
  "O que é cultura de paz?",
  "O que é educação para a paz?",
  "Explique paz positiva e paz negativa",
  "Por que paz não é só ausência de guerra?",
  "Como transformar conflitos sem violência?",
  "Qual a relação entre paz e direitos humanos?",
  "O que é violência estrutural?",
  "Como a escola pode promover cultura de paz?",
  "Quem foi Johan Galtung?",
  "Cultura de paz significa evitar conflitos?",
  "Como praticar cultura de paz no cotidiano?",
  "Qual o papel da justiça social na paz?",
  "Como controlar a raiva em uma discussão?",
  "Como falar algo difícil sem magoar?",
  "Como responder alguém que foi rude comigo?",
  "Briguei com um colega, o que faço agora?",
  "Como lidar com alguém que não quer dialogar?",
  "Estou sofrendo bullying, o que faço?",
  "Como ajudar duas pessoas que brigaram?",
  "Me ajude a responder alguém que me ofendeu",
  "Diferença entre agressividade e assertividade",
  "Como evitar conflitos no grupo?",
  "Como melhorar a comunicação em equipe?"
];

const messages = [
  {
    role: "assistant",
    content:
      "Olá. Sou seu chatbot sobre paz, cultura de paz, conflitos, direitos humanos e educação para a paz. Pode perguntar."
  }
];

let loading = false;
let currentSuggestions = [];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderMessages() {
  messagesEl.innerHTML = messages
    .map(
      (message) => `
        <article class="message ${message.role}">
          <div class="bubble">
            <p>${escapeHtml(message.content)}</p>
          </div>
        </article>
      `
    )
    .join("");

  if (loading) {
    messagesEl.insertAdjacentHTML(
      "beforeend",
      `
        <article class="message assistant">
          <div class="bubble loading-bubble">
            <span></span><span></span><span></span>
          </div>
        </article>
      `
    );
  }

  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
}

function setLoading(value) {
  loading = value;
  inputEl.disabled = value;
  composerEl.querySelector("button").disabled = value || !inputEl.value.trim();
  document.querySelectorAll("[data-suggestion]").forEach((button) => {
    button.disabled = value;
  });
  renderMessages();
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function renderSuggestions() {
  currentSuggestions = shuffle(SUGGESTION_POOL).slice(0, 4);
  suggestionsEl.innerHTML = currentSuggestions
    .map((suggestion) => `<button type="button" data-suggestion="${escapeHtml(suggestion)}">${escapeHtml(suggestion)}</button>`)
    .join("");

  suggestionsEl.querySelectorAll("[data-suggestion]").forEach((button) => {
    button.disabled = loading;
    button.addEventListener("click", () => sendMessage(button.dataset.suggestion || ""));
  });
}

function compactHistory() {
  return messages
    .filter((message) => ["user", "assistant"].includes(message.role))
    .slice(-8)
    .map(({ role, content }) => ({ role, content }));
}

async function sendMessage(rawText) {
  const text = rawText.trim();
  if (!text || loading) return;

  inputEl.value = "";
  messages.push({ role: "user", content: text });
  setLoading(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: compactHistory() })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erro ao conversar com o servidor.");

    messages.push({
      role: "assistant",
      content: data.answer
    });
  } catch (error) {
    messages.push({
      role: "assistant",
      content: error.message || "Não consegui responder agora. Tente novamente em instantes."
    });
  } finally {
    setLoading(false);
  }
}

composerEl.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(inputEl.value);
});

inputEl.addEventListener("input", () => {
  composerEl.querySelector("button").disabled = loading || !inputEl.value.trim();
});

inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage(inputEl.value);
  }
});

fetch("/api/health")
  .then((response) => response.json())
  .then((health) => {
    statusEl.textContent = health.ok
      ? `Pronto para conversar · modo ${health.ai === "openai" ? "IA" : "local"}`
      : "Serviço indisponível";
  })
  .catch(() => {
    statusEl.textContent = "Serviço indisponível";
  });

renderSuggestions();
setInterval(renderSuggestions, 5 * 60 * 1000);
renderMessages();
