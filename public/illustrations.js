// Ilustrações das historinhas infantis, desenhadas em SVG (sem imagens externas).
// Cada cena é composta por fundo + personagens (Lia, Davi, Tom, Maya e a professora Rosa) + objetos.
(function () {
  let uid = 0;

  const CHARACTERS = {
    lia: { skin: "#8d5524", hair: "#2b1a10", hairStyle: "puffs", shirt: "#f4b400", pants: "#3f51b5" },
    davi: { skin: "#f6d2b5", hair: "#7a4a24", hairStyle: "short", shirt: "#2f80ed", pants: "#37474f" },
    tom: { skin: "#c68642", hair: "#1b1b1b", hairStyle: "curly", shirt: "#ef6c00", pants: "#455a64" },
    maya: { skin: "#e8b48a", hair: "#3b2416", hairStyle: "long", shirt: "#43a047", pants: "#6d4c41" },
    rosa: { skin: "#d9a066", hair: "#9e9e9e", hairStyle: "bun", shirt: "#8e44ad", pants: "#5e35b1", dress: true, glasses: true, scale: 1.32 }
  };

  // ---------- Personagem ----------
  function face(mood) {
    const eye = (x) => `<circle cx="${x}" cy="-81" r="2.4" fill="#222"/>`;
    let eyes = eye(-6) + eye(6);
    let extra = "";
    let mouth = "";
    switch (mood) {
      case "calm":
        eyes = `<path d="M-10 -81 q3 3 6 0 M4 -81 q3 3 6 0" stroke="#222" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
        mouth = `<path d="M-4 -73 q4 3 8 0" stroke="#5a2a2a" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        break;
      case "sad":
        extra = `<path d="M-10 -87 l6 -2 M10 -87 l-6 -2" stroke="#222" stroke-width="1.6" stroke-linecap="round"/><path d="M-8 -77 q-2 4 0 5 q2 -1 0 -5z" fill="#64b5f6"/>`;
        mouth = `<path d="M-6 -70 q6 -5 12 0" stroke="#5a2a2a" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        break;
      case "angry":
        extra = `<path d="M-11 -89 l8 3 M11 -89 l-8 3" stroke="#222" stroke-width="2.2" stroke-linecap="round"/>`;
        mouth = `<path d="M-6 -70 q6 -4 12 0" stroke="#5a2a2a" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
        break;
      case "talk":
        mouth = `<ellipse cx="0" cy="-72" rx="4" ry="3.2" fill="#7a2e2e"/>`;
        break;
      case "surprised":
        mouth = `<circle cx="0" cy="-72" r="3" fill="#7a2e2e"/>`;
        break;
      default:
        mouth = `<path d="M-6 -74 q6 6 12 0" stroke="#5a2a2a" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    }
    const blush = mood === "angry" ? "" : `<circle cx="-11" cy="-75" r="3" fill="#ff8a80" opacity=".45"/><circle cx="11" cy="-75" r="3" fill="#ff8a80" opacity=".45"/>`;
    return eyes + extra + mouth + blush;
  }

  function hairBack(c) {
    if (c.hairStyle === "long") {
      return `<rect x="-21" y="-96" width="42" height="28" rx="14" fill="${c.hair}"/><rect x="-23" y="-86" width="11" height="34" rx="5" fill="${c.hair}"/><rect x="12" y="-86" width="11" height="34" rx="5" fill="${c.hair}"/>`;
    }
    if (c.hairStyle === "puffs") return `<circle cx="-20" cy="-95" r="10" fill="${c.hair}"/><circle cx="20" cy="-95" r="10" fill="${c.hair}"/>`;
    if (c.hairStyle === "bun") return `<circle cx="0" cy="-104" r="9" fill="${c.hair}"/>`;
    return "";
  }

  function hairFront(c) {
    if (c.hairStyle === "curly") {
      return [[-14, -92], [-6, -98], [4, -98], [13, -92], [-17, -84], [17, -84]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${c.hair}"/>`)
        .join("");
    }
    return `<path d="M-18 -84 a18 18 0 0 1 36 0 q-8 -7 -18 -6 q-10 -1 -18 6z" fill="${c.hair}"/>`;
  }

  const ARMS = {
    down: [[-20, -32], [20, -32]],
    up: [[-24, -84], [24, -84]],
    wave: [[-20, -32], [26, -84]],
    out: [[-31, -46], [31, -46]],
    reach: [[-20, -32], [32, -56]],
    hips: [[-24, -40], [24, -40]]
  };

  function person(name, x, base, opts = {}) {
    const c = { ...CHARACTERS[name], ...opts };
    const s = c.scale || 1;
    const flip = opts.flip ? -1 : 1;
    const [left, right] = ARMS[opts.arms || "down"];
    const arm = (x1, end) =>
      `<path d="M${x1} -56 L${end[0]} ${end[1]}" stroke="${c.skin}" stroke-width="7" stroke-linecap="round"/><circle cx="${end[0]}" cy="${end[1]}" r="4.2" fill="${c.skin}"/>`;
    const body = c.dress
      ? `<path d="M-15 -62 h30 l9 40 h-48z" fill="${c.shirt}"/>`
      : `<rect x="-16" y="-62" width="32" height="36" rx="10" fill="${c.shirt}"/>`;
    const glasses = c.glasses
      ? `<g stroke="#333" stroke-width="1.4" fill="none"><circle cx="-6" cy="-81" r="4.6"/><circle cx="6" cy="-81" r="4.6"/><path d="M-1.4 -81 h2.8"/></g>`
      : "";
    return `<g transform="translate(${x} ${base}) scale(${s * flip} ${s})">
      <ellipse cx="0" cy="1" rx="22" ry="4" fill="#000" opacity=".08"/>
      <rect x="-12" y="-30" width="10" height="30" rx="4" fill="${c.pants}"/>
      <rect x="2" y="-30" width="10" height="30" rx="4" fill="${c.pants}"/>
      <ellipse cx="-7" cy="-1" rx="8" ry="4" fill="#333"/><ellipse cx="7" cy="-1" rx="8" ry="4" fill="#333"/>
      ${arm(-13, left)}${arm(13, right)}
      ${body}
      ${hairBack(c)}
      <circle cx="0" cy="-80" r="18" fill="${c.skin}"/>
      ${hairFront(c)}
      ${face(opts.mood || "happy")}
      ${glasses}
    </g>`;
  }

  // ---------- Objetos ----------
  const heart = (x, y, s = 1, color = "#e8505b") =>
    `<path transform="translate(${x} ${y}) scale(${s})" d="M0 5 C0 -1 -10 -3 -10 4 C-10 10 0 13 0 17 C0 13 10 10 10 4 C10 -3 0 -1 0 5Z" fill="${color}"/>`;
  const cloud = (x, y, s = 1, color = "#fff") =>
    `<g transform="translate(${x} ${y}) scale(${s})" fill="${color}"><circle cx="-14" cy="2" r="10"/><circle cx="0" cy="-4" r="13"/><circle cx="15" cy="2" r="10"/><rect x="-24" y="2" width="48" height="10" rx="5"/></g>`;
  const angryCloud = (x, y, s = 1) =>
    cloud(x, y, s, "#d84343") +
    `<path transform="translate(${x} ${y}) scale(${s})" d="M-3 10 l-5 12 h6 l-4 12 l12 -16 h-6 l4 -8z" fill="#ffd54f"/>`;
  const sun = (x, y, r = 16) =>
    `<g transform="translate(${x} ${y})"><g stroke="#ffca28" stroke-width="3" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return `<path d="M${Math.cos(a) * (r + 5)} ${Math.sin(a) * (r + 5)} L${Math.cos(a) * (r + 11)} ${Math.sin(a) * (r + 11)}"/>`;
    }).join("")}</g><circle r="${r}" fill="#ffd54f"/></g>`;
  const tree = (x, y, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="-40" width="12" height="40" rx="3" fill="#8d6e63"/><circle cx="0" cy="-58" r="24" fill="#66bb6a"/><circle cx="-16" cy="-46" r="14" fill="#5aab5e"/><circle cx="16" cy="-46" r="14" fill="#5aab5e"/></g>`;
  const flower = (x, y, color = "#f06292") =>
    `<g transform="translate(${x} ${y})"><path d="M0 0 v-14" stroke="#43a047" stroke-width="2"/>${[0, 72, 144, 216, 288]
      .map((a) => `<circle cx="${Math.cos((a * Math.PI) / 180) * 4}" cy="${-16 + Math.sin((a * Math.PI) / 180) * 4}" r="3.4" fill="${color}"/>`)
      .join("")}<circle cx="0" cy="-16" r="2.4" fill="#ffd54f"/></g>`;
  const ball = (x, y, r = 9) =>
    `<g transform="translate(${x} ${y})"><circle r="${r}" fill="#fff" stroke="#333" stroke-width="1.5"/><path d="M0 -${r * 0.45} l${r * 0.43} ${r * 0.31} l-${r * 0.16} ${r * 0.5} h-${r * 0.54} l-${r * 0.16} -${r * 0.5}z" fill="#333"/></g>`;
  const bench = (x, y) =>
    `<g transform="translate(${x} ${y})" fill="#a1887f"><rect x="-38" y="-26" width="76" height="7" rx="2"/><rect x="-38" y="-40" width="76" height="6" rx="2"/><rect x="-32" y="-19" width="5" height="19"/><rect x="27" y="-19" width="5" height="19"/></g>`;
  const blocks = (x, y) => {
    const colors = ["#ef5350", "#42a5f5", "#ffca28", "#66bb6a", "#ab47bc", "#ff7043"];
    const layout = [[-24, 0], [0, 0], [24, 0], [-12, -22], [12, -22], [0, -44]];
    return `<g transform="translate(${x} ${y})">${layout
      .map(([bx, by], i) => `<rect x="${bx - 11}" y="${by - 22}" width="22" height="22" rx="3" fill="${colors[i]}" stroke="#fff" stroke-width="1.5"/>`)
      .join("")}</g>`;
  };
  const bulb = (x, y) =>
    `<g transform="translate(${x} ${y})"><g stroke="#ffca28" stroke-width="2.5" stroke-linecap="round"><path d="M-22 -6 h-7 M22 -6 h7 M-16 -22 l-5 -5 M16 -22 l5 -5 M0 -30 v-7"/></g><circle cx="0" cy="-8" r="14" fill="#fff59d" stroke="#fbc02d" stroke-width="2"/><rect x="-6" y="5" width="12" height="8" rx="2" fill="#90a4ae"/></g>`;
  const dove = (x, y, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-30 4 q30 18 52 -2 q-8 14 -30 14 q-16 0 -22 -12z" fill="#eceff1"/>
      <ellipse cx="0" cy="0" rx="26" ry="13" fill="#fff"/>
      <path d="M-6 -4 q-10 -34 22 -38 q-6 20 -22 38z" fill="#f5f7f8" stroke="#cfd8dc" stroke-width="1.2"/>
      <circle cx="24" cy="-8" r="9" fill="#fff"/>
      <circle cx="26" cy="-10" r="1.7" fill="#263238"/>
      <path d="M32 -9 l8 2 l-8 3z" fill="#ffa726"/>
      <path d="M38 -4 q14 4 20 14" stroke="#558b2f" stroke-width="2" fill="none"/>
      <ellipse cx="46" cy="0" rx="5" ry="2.4" fill="#7cb342" transform="rotate(30 46 0)"/>
      <ellipse cx="53" cy="6" rx="5" ry="2.4" fill="#7cb342" transform="rotate(50 53 6)"/>
    </g>`;
  const speech = (x, y, w, h, inner, tail = "left") => {
    const tx = tail === "left" ? x + 14 : x + w - 14;
    const dir = tail === "left" ? -1 : 1;
    return `<g><path d="M${tx - 6} ${y + h - 1} l${dir * 6} 12 l6 -12z" fill="#fff" stroke="#cfd8dc" stroke-width="1.4"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#fff" stroke="#cfd8dc" stroke-width="1.4"/><path d="M${tx - 5} ${y + h - 1.5} h10" stroke="#fff" stroke-width="3"/>${inner}</g>`;
  };
  const dots = (x, y) => `<g fill="#90a4ae"><circle cx="${x - 9}" cy="${y}" r="2.6"/><circle cx="${x}" cy="${y}" r="2.6"/><circle cx="${x + 9}" cy="${y}" r="2.6"/></g>`;
  const sparkle = (x, y, color = "#ffca28") => `<path transform="translate(${x} ${y})" d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2z" fill="${color}"/>`;
  const house = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-16 -2 v-20 l16 -14 l16 14 v20z" fill="#ffb74d"/><path d="M-20 -20 l20 -18 l20 18" stroke="#e53935" stroke-width="4" fill="none" stroke-linejoin="round"/><rect x="-5" y="-14" width="10" height="12" fill="#6d4c41"/></g>`;
  const apple = (x, y) => `<g transform="translate(${x} ${y})"><circle r="11" fill="#e53935"/><path d="M0 -10 q2 -7 6 -8" stroke="#6d4c41" stroke-width="2" fill="none"/><ellipse cx="6" cy="-14" rx="5" ry="2.5" fill="#66bb6a"/></g>`;
  const book = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-16 -10 q8 -5 16 0 v20 q-8 -5 -16 0z" fill="#42a5f5"/><path d="M16 -10 q-8 -5 -16 0 v20 q8 -5 16 0z" fill="#1e88e5"/></g>`;
  const cross = (x, y) => `<g transform="translate(${x} ${y})"><circle r="13" fill="#fff" stroke="#ef5350" stroke-width="2"/><path d="M-3 -8 h6 v5 h5 v6 h-5 v5 h-6 v-5 h-5 v-6 h5z" fill="#ef5350"/></g>`;
  const scribble = (x, y) =>
    `<path transform="translate(${x} ${y})" d="M-22 0 q6 -14 12 0 t12 0 t12 0 t12 0 M-18 8 l36 -16 M-18 -8 l36 16" stroke="#c62828" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  const breath = (x, y) =>
    `<g transform="translate(${x} ${y})" fill="none" stroke="#81d4fa" stroke-width="2.4" stroke-linecap="round"><path d="M0 0 q14 -8 26 0 t26 0"/><path d="M6 12 q12 -7 22 0 t22 0" opacity=".7"/></g>`;

  // ---------- Fundos ----------
  function outdoor(id, { sky = ["#bde3ff", "#eaf6ff"], ground = "#9ccc65" } = {}) {
    return `<defs><linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
      <rect width="320" height="200" fill="url(#sky${id})"/>${cloud(70, 34, 0.8)}${cloud(250, 26, 0.6)}
      <path d="M0 150 q80 -14 160 0 t160 0 v50 h-320z" fill="${ground}"/>`;
  }
  function classroom() {
    return `<rect width="320" height="200" fill="#fff4e0"/><rect y="160" width="320" height="40" fill="#e0c097"/>
      <rect x="92" y="20" width="136" height="70" rx="4" fill="#2e7d5b" stroke="#8d6e63" stroke-width="5"/>
      <path d="M108 42 h40 M108 56 h66 M108 70 h28" stroke="#e8f5e9" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
      <rect x="18" y="26" width="52" height="46" rx="3" fill="#bde3ff" stroke="#fff" stroke-width="4"/><path d="M44 26 v46 M18 49 h52" stroke="#fff" stroke-width="3"/>
      <rect x="252" y="26" width="52" height="46" rx="3" fill="#bde3ff" stroke="#fff" stroke-width="4"/><path d="M278 26 v46 M252 49 h52" stroke="#fff" stroke-width="3"/>`;
  }

  // ---------- Cenas ----------
  const SCENES = {
    pomba_paz: (id) =>
      `<rect width="320" height="200" fill="#d6efff"/>
       <g fill="none" stroke-width="7" opacity=".75"><path d="M40 200 a120 120 0 0 1 240 0" stroke="#ef9a9a"/><path d="M50 200 a110 110 0 0 1 220 0" stroke="#ffe082"/><path d="M60 200 a100 100 0 0 1 200 0" stroke="#a5d6a7"/><path d="M70 200 a90 90 0 0 1 180 0" stroke="#90caf9"/></g>
       ${sun(272, 38)}${cloud(60, 40, 0.8)}${dove(150, 100, 1.35)}${heart(70, 130, 0.9)}${heart(250, 122, 0.7, "#f48fb1")}${sparkle(110, 50)}${sparkle(214, 64)}`,
    amigos_conversando: (id) =>
      `${outdoor(id)}${tree(286, 160, 0.9)}${flower(30, 172)}${flower(46, 176, "#ba68c8")}
       ${person("lia", 110, 175, { mood: "talk", arms: "reach" })}${person("davi", 200, 175, { mood: "happy", flip: true })}
       ${speech(70, 22, 60, 36, heart(100, 28, 0.9))}${speech(190, 30, 60, 30, dots(220, 45), "right")}`,
    briga: (id) =>
      `${classroom()}${person("lia", 105, 182, { mood: "angry", arms: "hips" })}${person("davi", 215, 182, { mood: "angry", arms: "hips", flip: true })}
       ${scribble(160, 104)}<g transform="translate(150 150) rotate(-20)"><rect width="40" height="7" rx="2" fill="#1e88e5"/><path d="M40 0 l8 3.5 l-8 3.5z" fill="#ffcc80"/></g>`,
    raiva: (id) =>
      `${outdoor(id, { sky: ["#ffd8cc", "#fff1ea"] })}${angryCloud(160, 34, 1.1)}
       <g stroke="#e57373" stroke-width="2.4" stroke-linecap="round"><path d="M128 74 l-8 -8 M192 74 l8 -8 M124 92 h-10 M196 92 h10"/></g>
       ${person("tom", 160, 180, { mood: "angry", arms: "down" })}`,
    respirar_calma: (id) =>
      `${outdoor(id, { sky: ["#d9f2ff", "#f2fbff"], ground: "#aed581" })}${flower(108, 176)}${flower(220, 178, "#9575cd")}${flower(240, 172, "#ffb74d")}
       ${breath(180, 92)}${person("tom", 150, 180, { mood: "calm", arms: "out" })}${sparkle(90, 60, "#81d4fa")}${sparkle(240, 50, "#81d4fa")}`,
    pedir_ajuda: (id) =>
      `${classroom()}${person("davi", 112, 184, { mood: "talk", arms: "reach" })}${person("rosa", 214, 184, { mood: "happy", flip: true, arms: "reach" })}
       ${speech(52, 92, 60, 30, dots(82, 107))}${heart(170, 108, 0.8)}`,
    sozinho: (id) =>
      `${outdoor(id, { sky: ["#cfd8dc", "#eceff1"], ground: "#a5c27f" })}${cloud(96, 52, 0.9, "#90a4ae")}
       <g stroke="#64b5f6" stroke-width="2" stroke-linecap="round"><path d="M84 72 l-3 7 M96 74 l-3 7 M108 72 l-3 7"/></g>
       ${bench(100, 182)}${person("lia", 100, 180, { mood: "sad", arms: "down" })}
       <g opacity=".7">${person("davi", 236, 150, { scale: 0.48, arms: "up" })}${person("tom", 276, 152, { scale: 0.48, arms: "wave", flip: true })}${ball(256, 146, 5)}</g>`,
    inclusao: (id) =>
      `${outdoor(id)}${tree(40, 158, 0.85)}${person("lia", 120, 178, { mood: "talk", arms: "reach" })}${person("davi", 76, 182, { mood: "happy", arms: "wave", scale: 0.92 })}
       ${person("tom", 228, 178, { mood: "surprised", flip: true })}${ball(170, 172, 9)}${heart(176, 70, 0.9)}${sparkle(200, 56)}${sparkle(150, 46)}`,
    mediacao: (id) =>
      `${outdoor(id)}${person("lia", 72, 180, { mood: "calm", arms: "down" })}${person("tom", 160, 180, { mood: "happy", arms: "out" })}${person("davi", 248, 180, { mood: "calm", flip: true })}
       ${heart(160, 44, 1)}${speech(28, 30, 50, 28, dots(53, 44))}${speech(242, 30, 50, 28, dots(267, 44), "right")}`,
    desculpas: (id) =>
      `${outdoor(id, { sky: ["#ffe4ec", "#fff5f8"] })}${person("tom", 108, 180, { mood: "calm", arms: "reach" })}${person("davi", 214, 180, { mood: "happy", flip: true, arms: "reach" })}
       ${heart(160, 74, 1.7)}${sparkle(126, 60, "#f48fb1")}${sparkle(196, 54, "#f48fb1")}`,
    roda_diversidade: (id) =>
      `${outdoor(id)}${sun(40, 40, 13)}${person("lia", 60, 180, { arms: "out", scale: 0.9 })}${person("davi", 126, 180, { arms: "out", scale: 0.9 })}
       ${person("maya", 192, 180, { arms: "out", scale: 0.9 })}${person("tom", 258, 180, { arms: "out", scale: 0.9 })}
       ${heart(94, 40, 0.8)}${heart(160, 30, 0.9, "#f48fb1")}${heart(226, 40, 0.8)}`,
    cooperacao: (id) =>
      `${classroom()}${blocks(160, 182)}${person("lia", 96, 184, { mood: "happy", arms: "up" })}${person("tom", 226, 184, { mood: "happy", arms: "reach", flip: true })}
       ${sparkle(160, 108)}${sparkle(130, 120, "#ff8a65")}${sparkle(192, 116, "#4fc3f7")}`,
    direitos: (id) =>
      `${outdoor(id, { sky: ["#e3f2fd", "#fffde7"] })}${person("maya", 160, 182, { mood: "happy", arms: "up" })}
       ${house(66, 92)}${apple(62, 140)}${book(258, 88)}${cross(258, 138)}${heart(160, 34, 1)}`,
    ideia: (id) =>
      `${classroom()}${bulb(160, 64)}${person("lia", 160, 184, { mood: "surprised", arms: "wave" })}
       <text x="226" y="118" font-size="28" font-family="Trebuchet MS, sans-serif" font-weight="700" fill="#7e57c2">?</text>`,
    escola: (id) =>
      `${outdoor(id)}${sun(286, 36, 14)}
       <g><rect x="90" y="56" width="140" height="94" fill="#ffccbc"/><path d="M80 60 l80 -36 l80 36z" fill="#e57373"/>
       <rect x="146" y="106" width="28" height="44" rx="3" fill="#8d6e63"/>${[104, 196].map((wx) => `<rect x="${wx}" y="74" width="22" height="20" rx="2" fill="#bde3ff" stroke="#fff" stroke-width="2"/>`).join("")}
       <circle cx="160" cy="44" r="7" fill="#fff59d" stroke="#fbc02d"/></g>
       ${tree(40, 160, 0.8)}${person("lia", 108, 188, { scale: 0.62, arms: "wave" })}${person("davi", 216, 188, { scale: 0.62, arms: "up", flip: true })}${person("tom", 254, 190, { scale: 0.58 })}${ball(140, 182, 6)}`
  };

  window.renderIllustration = function renderIllustration(scene, label = "") {
    const draw = SCENES[scene] || SCENES.pomba_paz;
    uid += 1;
    return `<svg class="scene" viewBox="0 0 320 200" role="img" aria-label="${String(label).replace(/"/g, "&quot;")}" xmlns="http://www.w3.org/2000/svg">${draw(uid)}</svg>`;
  };
  window.ILLUSTRATION_SCENES = Object.keys(SCENES);
})();
