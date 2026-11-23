// Monta a base de conhecimento da web (fontes confiáveis) em ./conhecimento-web.
// Rode de vez em quando para atualizar:  node scripts/build-web-knowledge.mjs
// Prioridade: 1) site oficial do NEP/UEPG  2) leis (Planalto)  3) Wikipédia em português (artigos selecionados).
import fs from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { isSafeExternalText, sanitizeExternalText } from "../server/contentFilter.js";
import { cleanExtractedText } from "../server/text.js";

const OUT = path.resolve("conhecimento-web");
const UA = "OBPAZ-Olive/1.0 (chatbot educativo NEP-UEPG; indexacao de conteudo publico)";
const NEP = "https://www2.uepg.br/nep";
const SKIP_PAGES = /booking|thank-you/i;

// Artigos da Wikipédia em português diretamente ligados ao tema (texto CC BY-SA, citado com link).
const WIKIPEDIA = [
  "Cultura de paz",
  "Paz",
  "Johan Galtung",
  "Violência estrutural",
  "Violência cultural",
  "Comunicação não violenta",
  "Mediação de conflitos",
  "Resolução de conflitos",
  "Justiça restaurativa",
  "Bullying",
  "Cyberbullying",
  "Direitos humanos",
  "Declaração Universal dos Direitos Humanos",
  "Direitos da criança",
  "Estatuto da Criança e do Adolescente",
  "Convenção sobre os Direitos da Criança",
  "Não violência",
  "Mahatma Gandhi",
  "Martin Luther King Jr.",
  "Nelson Mandela",
  "Malala Yousafzai",
  "Paulo Freire",
  "Pedagogia do oprimido",
  "Edgar Morin",
  "Racismo",
  "Discriminação",
  "Empatia",
  "Inteligência emocional",
  "Objetivos de Desenvolvimento Sustentável",
  "Organização das Nações Unidas para a Educação, a Ciência e a Cultura",
  "Dia Internacional da Paz",
  "Prémio Nobel da Paz"
];

// Leis brasileiras sobre o tema (texto oficial).
const LAWS = [
  { title: "Lei 13.185/2015 - Programa de Combate à Intimidação Sistemática (Bullying)", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13185.htm" },
  { title: "Lei 13.663/2018 - Medidas de combate à violência e promoção da cultura de paz nas escolas", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13663.htm" },
  { title: "Lei 14.811/2024 - Proteção da criança e do adolescente contra a violência nas escolas", url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14811.htm" }
];

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", ordm: "º", ordf: "ª", deg: "°" };
function htmlToText(html) {
  return cleanExtractedText(
    String(html)
      .replace(/<(script|style|noscript|iframe|svg)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li|tr|section|article|blockquote)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match)
      .replace(/[ \t]+\n/g, "\n")
  );
}

function slug(value) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url, as = "text", attempt = 1) {
  const response = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60_000) });
  if (response.status === 429 && attempt <= 4) {
    await sleep(5000 * attempt); // respeita o limite de acesso do site
    return get(url, as, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return as === "json" ? response.json() : as === "buffer" ? Buffer.from(await response.arrayBuffer()) : response.text();
}

const saved = [];
async function save(folder, { title, url, source, priority, text }) {
  // Filtro: tira frases impróprias e, por garantia, confere o resultado.
  const body = cleanExtractedText(text).split(/\n{2,}/).map(sanitizeExternalText).filter(Boolean).join("\n\n");
  if (body.length < 200) return;
  if (!isSafeExternalText(body)) {
    console.warn(`  ✗ descartado pelo filtro: ${title}`);
    return;
  }
  const file = path.join(OUT, folder, `${slug(title)}.md`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  // Sem títulos "##" no corpo: o ingest trataria o arquivo como FAQ.
  const safeBody = body.replace(/^#+\s*/gm, "");
  await fs.writeFile(file, `---\ntitle: ${title}\nurl: ${url}\nsource: ${source}\npriority: ${priority}\n---\n\n${safeBody}\n`);
  saved.push(`${source}: ${title} (${body.length} caracteres)`);
}

async function wpList(type) {
  const items = [];
  for (let page = 1; page < 20; page += 1) {
    let batch;
    try {
      batch = await get(`${NEP}/wp-json/wp/v2/${type}?per_page=100&page=${page}`, "json");
    } catch {
      break;
    }
    if (!Array.isArray(batch) || !batch.length) break;
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

async function pdfText(url) {
  const parser = new PDFParse({ data: await get(url, "buffer") });
  try {
    return (await parser.getText()).text || "";
  } finally {
    await parser.destroy();
  }
}

async function buildNep() {
  console.log("NEP/UEPG (site oficial)...");
  const pages = (await wpList("pages")).filter((p) => !SKIP_PAGES.test(p.link));
  const posts = await wpList("posts");
  const pdfLinks = new Set();
  const linkLists = [];

  for (const item of [...pages, ...posts]) {
    const html = item.content?.rendered || "";
    const title = htmlToText(item.title?.rendered || "Sem título");
    const date = item.date ? ` (publicado em ${item.date.slice(0, 10)})` : "";
    const isPost = posts.includes(item);

    // Links citados na página (documentos, publicações, links úteis): guardados como texto também.
    const anchors = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map(([, href, label]) => ({
      href,
      label: htmlToText(label)
    }));
    anchors.filter((a) => /\.pdf(\?|$)/i.test(a.href) && /uepg\.br/i.test(a.href)).forEach((a) => pdfLinks.add(a.href));
    if (anchors.length) linkLists.push(`${title}:\n${anchors.map((a) => `• ${a.label || a.href} — ${a.href}`).join("\n")}`);

    await save("nep", {
      title: `NEP/UEPG - ${title}`,
      url: item.link,
      source: "NEP/UEPG (site oficial)",
      priority: 3,
      text: `${isPost ? "Notícia do NEP" : "Página do NEP"}: ${title}${date}\n\n${htmlToText(html)}`
    });
  }

  await save("nep", {
    title: "NEP/UEPG - Links e documentos citados no site",
    url: `${NEP}/links-uteis/`,
    source: "NEP/UEPG (site oficial)",
    priority: 3,
    text: `Links e documentos citados nas páginas do Núcleo de Educação para a Paz (NEP) da UEPG:\n\n${linkLists.join("\n\n")}`
  });

  for (const url of pdfLinks) {
    try {
      const name = decodeURIComponent(url.split("/").pop().replace(/\.pdf.*$/i, "")).replace(/[-_]+/g, " ");
      await save("nep", { title: `NEP/UEPG documento - ${name}`, url, source: "NEP/UEPG (documento)", priority: 2, text: await pdfText(url) });
    } catch (error) {
      console.warn(`  ! PDF não lido: ${url} (${error.message})`);
    }
  }
  console.log(`  ${pages.length} páginas, ${posts.length} notícias, ${pdfLinks.size} PDFs`);
}

async function buildLaws() {
  console.log("Leis (Planalto)...");
  for (const law of LAWS) {
    try {
      const html = await get(law.url);
      await save("leis", { ...law, source: "Planalto (legislação oficial)", priority: 2, text: `${law.title}\n\n${htmlToText(html)}` });
    } catch (error) {
      console.warn(`  ! ${law.title}: ${error.message}`);
    }
  }
}

async function buildWikipedia() {
  console.log("Wikipédia (pt)...");
  for (const name of WIKIPEDIA) {
    await sleep(1500);
    try {
      const api = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts|info&inprop=url&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(name)}`;
      const data = await get(api, "json");
      const page = Object.values(data.query.pages)[0];
      if (!page?.extract) throw new Error("sem conteúdo");
      // Remove seções de referências/ligações externas e limita o tamanho.
      const text = page.extract
        .split(/\n=+ (Referências|Ver também|Ligações externas|Bibliografia|Notas)/)[0]
        .replace(/^=+ (.+?) =+$/gm, "$1:")
        .slice(0, 12_000);
      await save("wikipedia", {
        title: `Wikipédia - ${page.title}`,
        url: page.fullurl,
        source: "Wikipédia (pt)",
        priority: 1,
        text: `${page.title}\n\n${text}`
      });
    } catch (error) {
      console.warn(`  ! ${name}: ${error.message}`);
    }
  }
}

await fs.rm(OUT, { recursive: true, force: true });
await buildNep();
await buildLaws();
await buildWikipedia();
await fs.writeFile(
  path.join(OUT, "LEIA-ME.txt"),
  `Base gerada automaticamente por scripts/build-web-knowledge.mjs em ${new Date().toISOString().slice(0, 10)}.\nNão edite à mão: rode o script de novo para atualizar.\n\n${saved.join("\n")}\n`
);
console.log(`\n${saved.length} documentos salvos em ${OUT}`);
