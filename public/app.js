const messagesEl = document.querySelector("#messages");
const composerEl = document.querySelector("#composer");
const inputEl = document.querySelector("#messageInput");
const statusEl = document.querySelector("#status");
const suggestionsEl = document.querySelector("#suggestions");
const profileButton = document.querySelector("#profileButton");
const sendButton = composerEl.querySelector("button");

const PROFILE_KEY = "obpaz.profile";
const PROFILES = {
  crianca: { label: "Criança", pill: "🧒 Modo criança", placeholder: "Escreva sua pergunta aqui... 😊" },
  adolescente: { label: "Adolescente", pill: "🎒 Adolescente", placeholder: "Pergunte sobre conflitos, respeito, emoções..." },
  adulto: { label: "Adulto ou educador", pill: "🧑‍🏫 Adulto/educador", placeholder: "Pergunte sobre paz, conflitos, direitos humanos..." }
};

const SUGGESTIONS = {
  crianca: [
    "O que é paz?",
    "Como fazer as pazes com meu amigo?",
    "Estou com muita raiva, o que eu faço?",
    "O que é bullying?",
    "Ninguém brinca comigo no recreio",
    "Como pedir desculpas?",
    "Por que as pessoas brigam?",
    "Como respeitar quem é diferente de mim?",
    "Como ajudar dois amigos que brigaram?",
    "O que são direitos humanos?",
    "Como fazer paz na escola?",
    "Estou triste, o que eu faço?"
  ],
  adolescente: [
    "O que é cultura de paz?",
    "Como controlar a raiva em uma discussão?",
    "Estou sofrendo bullying, o que faço?",
    "Como falar algo difícil sem magoar?",
    "Briguei com um colega, o que faço agora?",
    "Como responder alguém que foi rude comigo?",
    "Diferença entre agressividade e assertividade",
    "Como lidar com alguém que não quer dialogar?",
    "O que é violência estrutural?",
    "Qual a relação entre paz e direitos humanos?"
  ],
  adulto: [
    "O que é cultura de paz?",
    "Explique paz positiva e paz negativa",
    "O que são violências direta, estrutural e cultural?",
    "Quem foi Johan Galtung?",
    "Quem foi Herrera Flores?",
    "O que é paz suleada?",
    "Como a escola pode promover cultura de paz?",
    "Quais são as bases da educação para a paz?",
    "O que é o triângulo ABC do conflito?",
    "Como mediar um conflito entre estudantes?",
    "Diferença entre peacekeeping, peacemaking e peacebuilding",
    "Como trabalhar comunicação não violenta em sala?"
  ]
};

const GREETINGS = {
  crianca: "Oi! 😊 Eu sou o OBPAZ. Adoro conversar sobre paz, amizade, sentimentos e como resolver brigas sem machucar ninguém. Pode perguntar o que quiser!",
  adolescente: "Oi! Sou o OBPAZ. Posso conversar sobre conflitos, respeito, bullying, emoções, direitos humanos e cultura de paz.",
  adulto: "Olá! Sou o OBPAZ, assistente sobre cultura de paz, educação para a paz, conflitos e direitos humanos. Minhas respostas se baseiam no material do OBPAZ/InterPaz-UEPG."
};

function readProfile() {
  try {
    return localStorage.getItem(PROFILE_KEY);
  } catch {
    return null;
  }
}
function saveProfile(value) {
  try {
    localStorage.setItem(PROFILE_KEY, value);
  } catch {
    /* sem armazenamento: segue só nesta aba */
  }
}

let profile = readProfile(); // crianca | adolescente | adulto | auto | null
let audience = PROFILES[profile] ? profile : "adulto";
const history = [];
let loading = false;
let loadingEl = null;
let suggestionOffset = 0;

// ---------- Utilidades ----------
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatText(text) {
  const blocks = String(text || "").trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      const inline = (line) => escapeHtml(line).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      if (lines.every((line) => /^\s*([-•*]|\d+[.)])\s+/.test(line))) {
        const ordered = /^\s*\d/.test(lines[0]);
        const items = lines.map((line) => `<li>${inline(line.replace(/^\s*([-•*]|\d+[.)])\s+/, ""))}</li>`).join("");
        return ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
      }
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}

function scrollToEnd() {
  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
}

function addNode(html, className = "") {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html.trim();
  const node = wrapper.firstElementChild;
  if (className) node.classList.add(className);
  messagesEl.insertBefore(node, loadingEl && loadingEl.parentNode === messagesEl ? loadingEl : null);
  scrollToEnd();
  return node;
}

// ---------- Leitura em voz alta ----------
const canSpeak = "speechSynthesis" in window;
function speak(text, button) {
  if (!canSpeak) return;
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    document.querySelectorAll(".speak.active").forEach((el) => el.classList.remove("active"));
    if (button.dataset.playing === "1") {
      button.dataset.playing = "0";
      return;
    }
  }
  const utterance = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ""));
  utterance.lang = "pt-BR";
  utterance.rate = audience === "crianca" ? 0.92 : 1;
  const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("pt-br"));
  if (voice) utterance.voice = voice;
  button.classList.add("active");
  button.dataset.playing = "1";
  utterance.onend = () => {
    button.classList.remove("active");
    button.dataset.playing = "0";
  };
  speechSynthesis.speak(utterance);
}

// ---------- Mensagens ----------
function addUserMessage(text) {
  addNode(`<article class="message user"><div class="bubble">${formatText(text)}</div></article>`);
}

function addAssistantMessage(data) {
  const story = data.story?.panels?.length
    ? `<section class="story" aria-label="Historinha">
         <h3><span aria-hidden="true">📖</span> ${escapeHtml(data.story.title || "Uma historinha")}</h3>
         <div class="panels">
           ${data.story.panels
             .map(
               (panel, index) => `<figure class="panel">
                  ${window.renderIllustration(panel.scene, panel.caption)}
                  <figcaption><span class="panel-number">${index + 1}</span>${escapeHtml(panel.caption)}</figcaption>
                </figure>`
             )
             .join("")}
         </div>
       </section>`
    : "";
  const tip = data.tip ? `<div class="callout tip"><span aria-hidden="true">💡</span><div><strong>Dica:</strong> ${escapeHtml(data.tip)}</div></div>` : "";
  const ask = data.question ? `<div class="callout ask"><span aria-hidden="true">🤔</span><div>${escapeHtml(data.question)}</div></div>` : "";
  const sources = data.sources?.length
    ? `<details class="sources"><summary>Base desta resposta (${data.sources.length})</summary><ul>${data.sources
        .map((source) => `<li>${escapeHtml(source.title)}</li>`)
        .join("")}</ul></details>`
    : "";
  const speakText = [data.answer, data.story?.title, ...(data.story?.panels || []).map((p) => p.caption), data.tip ? `Dica: ${data.tip}` : "", data.question]
    .filter(Boolean)
    .join(". ");
  const speakButton = canSpeak
    ? `<button type="button" class="speak" title="Ouvir a resposta" aria-label="Ouvir a resposta">🔊 Ouvir</button>`
    : "";

  const node = addNode(`
    <article class="message assistant ${data.kind === "risk" ? "risk" : ""} ${story ? "has-story" : ""}">
      <div class="bubble">
        ${formatText(data.answer)}
        ${story}${tip}${ask}
        <div class="message-tools">${speakButton}${sources}</div>
      </div>
    </article>`);
  node.querySelector(".speak")?.addEventListener("click", (event) => speak(speakText, event.currentTarget));
}

function addNotice(text, actionLabel, onAction) {
  const node = addNode(
    `<div class="notice"><span>${escapeHtml(text)}</span>${actionLabel ? `<button type="button">${escapeHtml(actionLabel)}</button>` : ""}</div>`
  );
  node.querySelector("button")?.addEventListener("click", () => {
    onAction();
    node.remove();
  });
}

function showProfilePicker() {
  document.querySelectorAll(".picker").forEach((el) => el.remove());
  const node = addNode(`
    <section class="picker" aria-label="Quem está conversando?">
      <h2>Quem está conversando?</h2>
      <p>Assim eu consigo explicar do jeito certo para você.</p>
      <div class="picker-options">
        <button type="button" data-profile="crianca"><span class="emoji">🧒</span><strong>Sou criança</strong><small>Respostas simples, com historinhas e desenhos</small></button>
        <button type="button" data-profile="adolescente"><span class="emoji">🎒</span><strong>Sou adolescente</strong><small>Direto ao ponto, com exemplos do dia a dia</small></button>
        <button type="button" data-profile="adulto"><span class="emoji">🧑‍🏫</span><strong>Sou adulto ou educador</strong><small>Conceitos, autores e ideias para a sala de aula</small></button>
      </div>
      <button type="button" class="picker-skip" data-profile="auto">Prefiro não dizer (o OBPAZ tenta perceber sozinho)</button>
    </section>`);
  node.querySelectorAll("[data-profile]").forEach((button) =>
    button.addEventListener("click", () => {
      const chosen = button.dataset.profile;
      profile = chosen;
      saveProfile(chosen);
      node.remove();
      setAudience(chosen === "auto" ? audience : chosen);
      addAssistantMessage({
        answer: chosen === "auto" ? "Combinado! Pode perguntar à vontade: eu vou adaptar o jeito de explicar para você. 😊" : GREETINGS[audience]
      });
      inputEl.focus();
    })
  );
}

// ---------- Público / tema ----------
function setAudience(value) {
  audience = PROFILES[value] ? value : "adulto";
  document.body.dataset.audience = audience;
  profileButton.textContent = !profile
    ? "Escolher perfil"
    : profile === "auto" && audience === "adulto"
      ? "✨ Automático"
      : PROFILES[audience].pill;
  inputEl.placeholder = PROFILES[audience].placeholder;
  suggestionOffset = 0;
  renderSuggestions();
}

function handleAudienceChange(data) {
  if (!data.audience || data.audience === audience) return;
  const previous = audience;
  setAudience(data.audience);
  if (profile !== "auto") {
    profile = data.audience;
    saveProfile(profile);
  }
  if (data.audience === "crianca") {
    addNotice("Percebi que você é criança, então vou explicar de um jeito mais simples, com historinhas e desenhos! 🎨", "Não sou criança", () => {
      profile = previous === "crianca" ? "adulto" : previous;
      saveProfile(profile);
      setAudience(profile);
    });
  } else {
    addNotice(`Vou conversar no modo ${PROFILES[data.audience].label.toLowerCase()}.`, "Trocar", showProfilePicker);
  }
}

// ---------- Sugestões ----------
function renderSuggestions() {
  const pool = SUGGESTIONS[audience];
  const items = Array.from({ length: 4 }, (_, index) => pool[(suggestionOffset + index) % pool.length]);
  suggestionsEl.innerHTML =
    items.map((text) => `<button type="button" data-suggestion="${escapeHtml(text)}">${escapeHtml(text)}</button>`).join("") +
    `<button type="button" class="more" title="Outras sugestões" aria-label="Outras sugestões">↻</button>`;
  suggestionsEl.querySelectorAll("[data-suggestion]").forEach((button) => {
    button.disabled = loading;
    button.addEventListener("click", () => sendMessage(button.dataset.suggestion));
  });
  suggestionsEl.querySelector(".more").addEventListener("click", () => {
    suggestionOffset = (suggestionOffset + 4) % pool.length;
    renderSuggestions();
  });
}

// ---------- Envio ----------
function setLoading(value) {
  loading = value;
  inputEl.disabled = value;
  sendButton.disabled = value || !inputEl.value.trim();
  suggestionsEl.querySelectorAll("[data-suggestion]").forEach((button) => (button.disabled = value));
  if (value) {
    loadingEl = document.createElement("article");
    loadingEl.className = "message assistant";
    loadingEl.innerHTML = `<div class="bubble loading-bubble" aria-label="Pensando"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(loadingEl);
    scrollToEnd();
  } else {
    loadingEl?.remove();
    loadingEl = null;
  }
}

async function sendMessage(rawText) {
  const text = String(rawText || "").trim();
  if (!text || loading) return;
  document.querySelectorAll(".picker").forEach((el) => el.remove());
  if (!profile) {
    profile = "auto";
    saveProfile(profile);
  }

  inputEl.value = "";
  addUserMessage(text);
  setLoading(true);

  try {
    // No modo automático, depois que o público é percebido, ele é mantido na conversa.
    const sentProfile = profile === "auto" ? (document.body.dataset.detected ? audience : null) : profile;
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: history.slice(-8), profile: sentProfile })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erro ao conversar com o servidor.");

    if (data.audienceDetected) document.body.dataset.detected = "1";
    setLoading(false);
    handleAudienceChange(data);
    addAssistantMessage(data);
    history.push({ role: "user", content: text }, { role: "assistant", content: data.answer });
  } catch (error) {
    setLoading(false);
    addAssistantMessage({ answer: error.message || "Não consegui responder agora. Tente novamente em instantes." });
  } finally {
    inputEl.focus();
  }
}

composerEl.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(inputEl.value);
});
inputEl.addEventListener("input", () => {
  sendButton.disabled = loading || !inputEl.value.trim();
});
inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage(inputEl.value);
  }
});
profileButton.addEventListener("click", showProfilePicker);

fetch("/api/health")
  .then((response) => response.json())
  .then((health) => {
    statusEl.textContent = health.ok ? (health.ai !== "local" ? "Pronto para conversar" : "Pronto · modo básico (sem IA)") : "Serviço indisponível";
  })
  .catch(() => {
    statusEl.textContent = "Serviço indisponível";
  });

// ---------- Início ----------
setAudience(audience);
sendButton.disabled = true;
if (!profile) {
  addAssistantMessage({ answer: "Olá! Eu sou o OBPAZ, um assistente sobre paz, convivência e direitos humanos. 🕊️" });
  showProfilePicker();
} else {
  addAssistantMessage({ answer: GREETINGS[audience] });
}
