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
  crianca: "Oi! 😊 Eu sou a Olive, a guia do OBPAZ. Adoro conversar sobre paz, amizade, sentimentos e como resolver brigas sem machucar ninguém. Pode perguntar o que quiser!",
  adolescente: "Oi! Sou a Olive, do OBPAZ. Posso conversar sobre conflitos, respeito, bullying, emoções, direitos humanos e cultura de paz.",
  adulto: "Olá! Sou a Olive, assistente do OBPAZ sobre cultura de paz, educação para a paz, conflitos e direitos humanos. Minhas respostas se baseiam no material do NEP/UEPG e em fontes confiáveis, sempre com os links."
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

// Código aleatório desta visita (não identifica a pessoa); some quando a aba é fechada.
let sessionId = "";
try {
  sessionId = sessionStorage.getItem("obpaz.session") || crypto.randomUUID();
  sessionStorage.setItem("obpaz.session", sessionId);
} catch {
  sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
}
let turnCount = 0;

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

const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const scrollBehavior = reduceMotion ? "auto" : "smooth";

function scrollToEnd() {
  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: scrollBehavior });
}

// Resposta longa: mostra o COMEÇO dela (com um pedacinho da pergunta acima), para ninguém
// precisar subir para ler. Resposta curta: rola até o fim, como antes.
function scrollToMessageStart(node) {
  requestAnimationFrame(() => {
    const visible = messagesEl.clientHeight;
    if (node.offsetHeight <= visible * 0.7) {
      scrollToEnd();
      return;
    }
    const prev = node.previousElementSibling;
    const peek = prev?.classList.contains("user") ? Math.min(prev.offsetHeight + 14, 90) : 16;
    const top = messagesEl.scrollTop + node.getBoundingClientRect().top - messagesEl.getBoundingClientRect().top - peek;
    messagesEl.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior });
  });
}

function addNode(html, { scroll = "end" } = {}) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html.trim();
  const node = wrapper.firstElementChild;
  messagesEl.insertBefore(node, loadingEl && loadingEl.parentNode === messagesEl ? loadingEl : null);
  if (scroll === "start") scrollToMessageStart(node);
  else scrollToEnd();
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
  // Voz da Olive: voz feminina em português, mais aguda, para soar como uma menina.
  utterance.voice = oliveVoice();
  utterance.pitch = 1.7;
  utterance.rate = audience === "crianca" ? 1.0 : 1.05;
  button.classList.add("active");
  button.dataset.playing = "1";
  setOliveTalking(true);
  utterance.onend = utterance.onerror = () => {
    button.classList.remove("active");
    button.dataset.playing = "0";
    setOliveTalking(false);
  };
  speechSynthesis.speak(utterance);
}

// Escolhe a voz feminina em português do Brasil disponível no aparelho (gratuita, do próprio navegador).
const FEMALE_VOICE_HINTS = ["francisca", "maria", "luciana", "vitoria", "vitória", "thalita", "leila", "female", "feminina", "google português do brasil"];
function oliveVoice() {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().replace("_", "-").startsWith("pt-br"));
  return (
    voices.find((v) => FEMALE_VOICE_HINTS.some((hint) => v.name.toLowerCase().includes(hint))) ||
    voices.find((v) => !/daniel|antonio|ant[oô]nio|male|masculin/i.test(v.name)) ||
    voices[0] ||
    null
  );
}
if (canSpeak) speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

// ---------- Olive, a guia ----------
const oliveGuide = document.querySelector("#oliveGuide");
const oliveBubble = document.querySelector("#oliveBubble");
let oliveBubbleTimer = null;
function oliveSays(text, ms = 6000) {
  if (!oliveBubble) return;
  oliveBubble.textContent = text;
  oliveBubble.classList.add("show");
  clearTimeout(oliveBubbleTimer);
  oliveBubbleTimer = setTimeout(() => oliveBubble.classList.remove("show"), ms);
}
// No celular a Olive de corpo inteiro fica escondida: o ícone do topo é que "fala" e "pula".
function setOliveTalking(value) {
  oliveGuide?.classList.toggle("talking", value);
  document.body.classList.toggle("olive-talking", value);
}
function oliveCheer() {
  for (const el of [oliveGuide, document.body]) {
    if (!el) continue;
    el.classList.remove(el === document.body ? "olive-cheer" : "cheer");
    void el.offsetWidth;
    el.classList.add(el === document.body ? "olive-cheer" : "cheer");
  }
  setTimeout(() => document.body.classList.remove("olive-cheer"), 2000);
}
setTimeout(() => oliveSays("Oi! Eu sou a Olive. Vamos conversar sobre paz? 🕊️", 7000), 600);

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
        .map((source) => {
          const title = escapeHtml(source.title);
          const origin = source.origin ? ` <small>· ${escapeHtml(source.origin)}</small>` : "";
          // Só links http(s) viram âncora (evita "javascript:" vindo de fora).
          const safeUrl = /^https?:\/\//i.test(source.url || "") ? escapeHtml(source.url) : "";
          return `<li>${safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${title}</a>` : title}${origin}</li>`;
        })
        .join("")}</ul></details>`
    : "";
  const speakText = [data.answer, data.story?.title, ...(data.story?.panels || []).map((p) => p.caption), data.tip ? `Dica: ${data.tip}` : "", data.question]
    .filter(Boolean)
    .join(". ");
  const feedbackButtons = `<span class="feedback" role="group" aria-label="Esta resposta ajudou?"><button type="button" class="thumb" data-rating="1" title="Resposta boa" aria-label="Resposta boa">👍</button><button type="button" class="thumb" data-rating="-1" title="Resposta ruim" aria-label="Resposta ruim">👎</button></span>`;
  const speakButton = canSpeak
    ? `<button type="button" class="speak" title="Ouvir a resposta" aria-label="Ouvir a resposta">🔊 Ouvir</button>`
    : "";

  // Desenho único (usado na recepção) e botões de resposta rápida.
  const picture = data.illustration
    ? `<figure class="intro-picture">${window.renderIllustration(data.illustration, data.illustrationLabel || "")}</figure>`
    : "";
  const chips = data.chips?.length
    ? `<div class="chips">${data.chips
        .map((chip, index) => `<button type="button" class="chip ${chip.secondary ? "secondary" : ""}" data-chip="${index}">${escapeHtml(chip.label)}</button>`)
        .join("")}</div>`
    : "";

  const node = addNode(`
    <article class="message assistant ${data.kind === "risk" ? "risk" : ""} ${story || picture ? "has-story" : ""}">
      <div class="bubble">
        ${formatText(data.answer)}
        ${picture}${story}${tip}${ask}${chips}
        <div class="message-tools">${speakButton}${data.logId ? feedbackButtons : ""}${sources}</div>
      </div>
    </article>`, { scroll: "start" });
  node.querySelector(".speak")?.addEventListener("click", (event) => speak(speakText, event.currentTarget));
  node.querySelectorAll("[data-rating]").forEach((button) =>
    button.addEventListener("click", () => {
      const rating = Number(button.dataset.rating);
      node.querySelectorAll("[data-rating]").forEach((b) => b.classList.toggle("chosen", b === button));
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.logId, session: sessionId, rating })
      }).catch(() => {});
      if (rating > 0) oliveSays(userName ? `Oba, obrigada ${userName}! 💛` : "Oba, obrigada! 💛", 3500);
      else oliveSays("Obrigada por avisar! Vou aprender com isso. 🌱", 4000);
    })
  );
  node.querySelectorAll("[data-chip]").forEach((button) =>
    button.addEventListener("click", () => {
      const chip = data.chips[Number(button.dataset.chip)];
      node.querySelectorAll("[data-chip]").forEach((b) => (b.disabled = true));
      if (chip.action) chip.action();
      else sendMessage(chip.label);
    })
  );
  return node;
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
      if (chosen === "auto") {
        addAssistantMessage({ answer: "Combinado! Pode perguntar à vontade: eu vou adaptar o jeito de explicar para você. 😊" });
      } else {
        startConversation();
      }
      inputEl.focus();
    })
  );
}

// ---------- Recepção: nome + introdução à paz (criança e adolescente) ----------
// O nome fica SÓ neste aparelho (localStorage): não vai para o servidor nem para a IA.
const NAME_KEY = "obpaz.name";
let userName = "";
try {
  userName = localStorage.getItem(NAME_KEY) || "";
} catch {
  userName = "";
}
let awaitingName = false;

function saveName(value) {
  userName = value || "";
  try {
    if (userName) localStorage.setItem(NAME_KEY, userName);
    else localStorage.removeItem(NAME_KEY);
  } catch {
    /* sem armazenamento */
  }
}

// "Ana", "meu nome é Ana", "me chamo João Pedro", "sou a Bia" -> nome. Perguntas e frases longas -> null.
// Palavras comuns que nunca são nome ("estou triste", "e aí", "tudo bem"...).
const NOT_NAME_WORDS = new Set(
  `oi oie olá ola opa e aí ai eai salve não nao sim ok beleza legal valeu tchau pular nada ninguém ninguem alguém alguem
   tudo bem mal estou to tô sou é quero queria sei sabe preciso ajuda obrigado obrigada triste feliz bravo brava raiva medo
   sozinho sozinha chateado chateada paz bullying briga brigas escola amigo amiga amigos professor professora mãe mae pai
   irmão irmao irmã irma bom boa dia tarde noite meu minha que qual quem como onde porque por o a os as um uma de do da`
    .split(/\s+/)
    .filter(Boolean)
);

function extractName(text) {
  let clean = String(text).trim().replace(/[.!…\s\p{Extended_Pictographic}]+$/u, "");
  if (!clean || clean.includes("?")) return null;
  // Saudação no começo ("oi, é a Gaby") sai antes de cortar a frase na vírgula.
  clean = clean.replace(/^(oi+e?|olá|ola|opa|e a[ií]|eai|salve|bom dia|boa tarde|boa noite)[,!.\s]+/i, "").trim() || clean;
  // Só o começo da frase: "Gaby, tenho 13 anos" / "Lucas e tenho 10 anos" -> "Gaby" / "Lucas".
  clean = clean.split(/,|;|\s+e\s+(?=tenho|sou|estou|moro|estudo)|\s+(?=tenho\s+\d)/i)[0].trim();
  // Tira saudações e jeitos de se apresentar, quantas vezes aparecerem:
  // "oi, é a Gaby", "pode me chamar de Gaby", "aqui é o João", "meu nome é Ana", "sou a Bia".
  const prefixes = [
    /^(oi+e?|olá|ola|opa|e a[ií]|eai|salve|bom dia|boa tarde|boa noite)[,!.\s]+/i,
    /^(o\s+)?meu nome (é|e)\s+/i,
    /^(eu\s+)?me cham(o|a)\s+(de\s+)?/i,
    /^(pode|podes)?\s*(me\s+)?cham(a|ar|e)\s+(me\s+)?de\s+/i,
    /^(aqui\s+)?(é|e)\s+(o\s+|a\s+)?/i,
    /^(eu\s+)?sou\s+(o\s+|a\s+)?/i,
    /^quem fala (é|e)\s+(o\s+|a\s+)?/i,
    /^nome\s*[:=-]?\s*/i
  ];
  for (let changed = true; changed; ) {
    changed = false;
    for (const prefix of prefixes) {
      const next = clean.replace(prefix, "").trim();
      if (next !== clean && next) {
        clean = next;
        changed = true;
      }
    }
  }
  const candidate = clean.replace(/\s+(mesmo|rs+|kk+|haha+)$/i, "").trim();
  const words = candidate.split(/\s+/);
  if (words.length > 3 || !/^[\p{L}' -]{2,30}$/u.test(candidate)) return null;
  if (words.some((word) => NOT_NAME_WORDS.has(word.toLowerCase()))) return null;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}

const WELCOME = {
  crianca: {
    ask: "Oi! 😊 Eu sou a Olive, a guia do NEP. Antes da gente conversar... qual é o seu nome?",
    hello: (name) => (name ? `Que nome lindo, ${name}! 💛 Que bom te conhecer.` : "Tudo bem! 💛 Que bom te conhecer."),
    intro:
      "Vou te contar um segredo: **paz** é quando a gente convive com respeito, cuida uns dos outros e resolve as brigas conversando, sem machucar ninguém. Dá pra fazer paz na escola, em casa e com os amigos — todo dia! 🕊️",
    invite:
      "Você pode me perguntar sobre amizade, sentimentos (como raiva ou tristeza), brigas, bullying e respeito às diferenças. Eu explico com historinhas e desenhos! Por onde a gente começa?",
    chips: ["O que é paz?", "Como fazer as pazes com meu amigo?", "Estou com raiva, o que eu faço?", "O que é bullying?"],
    back: (name) => `Oi de novo, ${name}! 😊 Que bom que você voltou. Sobre o que vamos conversar hoje?`,
    placeholder: "Escreva seu nome aqui... 😊"
  },
  adolescente: {
    ask: "E aí! Eu sou a Olive, do NEP/UEPG. Como você quer que eu te chame? (se preferir, é só pular)",
    hello: (name) => (name ? `Prazer, ${name}!` : "Tranquilo, sem problema!"),
    intro:
      "Rapidinho: **paz** não é só não ter briga. É conviver com respeito, justiça e diálogo — na escola, em casa e nas redes sociais. Conflitos sempre vão existir; o que faz diferença é como a gente lida com eles.",
    invite:
      "Pode me perguntar sobre conflitos com amigos, bullying e cyberbullying, emoções, preconceito, direitos humanos ou sobre o próprio NEP. Algumas ideias:",
    chips: ["Estou sofrendo bullying, o que faço?", "Como controlar a raiva numa discussão?", "O que é preconceito?", "O que é o NEP da UEPG?"],
    back: (name) => `E aí, ${name}! Bom te ver de novo. O que você quer saber hoje?`,
    placeholder: "Escreva como quer ser chamado(a)..."
  }
};

function askName() {
  const texts = WELCOME[audience];
  if (!texts) return;
  awaitingName = true;
  inputEl.placeholder = texts.placeholder;
  // Entra no histórico para a IA saber que a Olive acabou de perguntar o nome.
  history.push({ role: "assistant", content: texts.ask });
  addAssistantMessage({
    answer: texts.ask,
    chips: [{ label: "Pular", secondary: true, action: () => finishWelcome("") }]
  });
  oliveSays(audience === "crianca" ? "Oi! Qual é o seu nome? 😊" : "E aí! Como posso te chamar?", 8000);
  inputEl.focus();
}

function finishWelcome(name) {
  const texts = WELCOME[audience];
  awaitingName = false;
  inputEl.placeholder = PROFILES[audience].placeholder;
  saveName(name);
  if (!texts) return;
  // Contexto para a IA, SEM o nome (o nome nunca sai do aparelho).
  history.push(
    { role: "user", content: name ? "(a pessoa disse como quer ser chamada)" : "(a pessoa preferiu não dizer o nome)" },
    { role: "assistant", content: `${texts.intro}\n\n${texts.invite}` }
  );
  addAssistantMessage({
    answer: `${texts.hello(name)}\n\n${texts.intro}\n\n${texts.invite}`,
    illustration: audience === "crianca" ? "pomba_paz" : null,
    illustrationLabel: "Pomba da paz voando sobre um arco-íris",
    chips: texts.chips.map((label) => ({ label }))
  });
  oliveCheer();
  if (name) oliveSays(audience === "crianca" ? `Oba, ${name}! Vamos conversar! 🎉` : `Bora, ${name}!`, 6000);
  inputEl.focus();
}

function welcomeBack() {
  const texts = WELCOME[audience];
  addAssistantMessage({
    answer: texts.back(userName),
    chips: [
      ...texts.chips.slice(0, 3).map((label) => ({ label })),
      // Computador compartilhado na escola: outra pessoa pode estar usando.
      { label: "Sou outra pessoa", secondary: true, action: () => { saveName(""); askName(); } }
    ]
  });
  oliveSays(`Oi, ${userName}! 💛`, 6000);
}

/** Começo da conversa conforme o público. */
function startConversation() {
  if (WELCOME[audience] && (profile === "crianca" || profile === "adolescente")) {
    if (userName) welcomeBack();
    else askName();
  } else {
    addAssistantMessage({ answer: GREETINGS[audience] });
  }
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
  // Só troca o modo quando o servidor PERCEBEU o público (ex.: "tenho 8 anos"); nunca por padrão.
  if (!data.audience || data.audience === audience || !data.audienceDetected) return;
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

  // Esperando o nome: se parecer um nome, a Olive se apresenta; se for uma pergunta, segue a conversa normal.
  if (awaitingName) {
    const name = extractName(text);
    awaitingName = false;
    inputEl.placeholder = PROFILES[audience].placeholder;
    if (name) {
      addUserMessage(text);
      finishWelcome(name);
      return;
    }
  }

  addUserMessage(text);
  setLoading(true);

  try {
    // No modo automático, depois que o público é percebido, ele é mantido na conversa.
    const sentProfile = profile === "auto" ? (document.body.dataset.detected ? audience : null) : profile;
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: history.slice(-8), profile: sentProfile, selectedProfile: profile, session: sessionId, turn: ++turnCount })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erro ao conversar com o servidor.");

    if (data.audienceDetected) document.body.dataset.detected = "1";
    setLoading(false);
    handleAudienceChange(data);
    addAssistantMessage(data);
    oliveCheer();
    if (data.story) oliveSays(userName ? `Olha a historinha que eu preparei, ${userName}! 📖` : "Olha a historinha que eu preparei! 📖");
    else if (data.kind === "risk") oliveSays("Estou aqui com você. Procure um adulto de confiança. 💛", 9000);
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
    if (health.logs) document.querySelector("#privacyNote")?.removeAttribute("hidden");
  })
  .catch(() => {
    statusEl.textContent = "Serviço indisponível";
  });

// ---------- Início ----------
setAudience(audience);
sendButton.disabled = true;
if (!profile) {
  addAssistantMessage({ answer: "Olá! 🕊️ Antes de começar, me conta: quem está conversando comigo?" });
  showProfilePicker();
} else {
  startConversation();
}
