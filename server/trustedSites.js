// Sites educativos confiáveis (Escola Kids, Brasil Escola, Instituto Ayrton Senna).
// Guardamos só um índice de links; o texto é lido NA HORA da pergunta, filtrado,
// resumido pela IA e sempre citado com link (respeitando os direitos autorais dos sites).
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import { sanitizeExternalText } from "./contentFilter.js";
import { tokenize } from "./text.js";

const UA = "OBPAZ-Olive/1.0 (chatbot educativo NEP-UEPG)";
const ALLOWED_HOSTS = /(^|\.)(escolakids\.uol\.com\.br|brasilescola\.uol\.com\.br|institutoayrtonsenna\.org\.br)$/;
const pageCache = new Map(); // url -> { at, paragraphs }
const DAY = 24 * 3600 * 1000;

function loadIndex() {
  try {
    const file = path.resolve(process.cwd(), config.webDataDir, "indice-links.json");
    const { links } = JSON.parse(fs.readFileSync(file, "utf8"));
    return links
      .filter((link) => ALLOWED_HOSTS.test(new URL(link.url).hostname))
      .map((link) => ({ ...link, titleTokens: new Set(tokenize(link.title)), descTokens: new Set(tokenize(link.description)) }));
  } catch {
    return [];
  }
}

const LINKS = loadIndex();
const df = new Map();
LINKS.forEach((link) => new Set([...link.titleTokens, ...link.descTokens]).forEach((t) => df.set(t, (df.get(t) || 0) + 1)));
const idf = (t) => Math.log(1 + LINKS.length / (1 + (df.get(t) || 0)));

export const trustedLinksCount = LINKS.length;

/** Links mais relacionados à pergunta. Crianças: prioridade para o Escola Kids. */
export function findTrustedLinks(query, audience, limit = 2) {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length || !LINKS.length) return [];
  const total = terms.reduce((sum, t) => sum + idf(t), 0) || 1;

  return LINKS.map((link) => {
    let score = 0;
    let covered = 0;
    for (const t of terms) {
      const inTitle = link.titleTokens.has(t);
      const inDesc = link.descTokens.has(t);
      if (inTitle || inDesc) covered += idf(t);
      score += idf(t) * (inTitle ? 2 : 0) + idf(t) * (inDesc ? 1 : 0);
    }
    const audienceBoost =
      audience === "crianca" ? (link.audience === "crianca" ? 1.6 : 0.8) : link.audience === "crianca" ? 0.7 : link.audience === "educador" && audience === "adulto" ? 1.2 : 1;
    return { link, score: score * audienceBoost, coverage: covered / total };
  })
    .filter((item) => item.coverage >= 0.5 && item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.link);
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", ordm: "º", ordf: "ª" };
const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(Number(c)))
    .replace(/&#x([0-9a-f]+);/gi, (_, c) => String.fromCodePoint(parseInt(c, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

async function readParagraphs(url) {
  const cached = pageCache.get(url);
  if (cached && Date.now() - cached.at < DAY) return cached.paragraphs;

  const response = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`${response.status}`);
  const html = await response.text();
  // Conteúdo principal: <article> quando existir; senão, a página inteira.
  const main = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || html;
  const paragraphs = [...main.replace(/<(script|style|noscript|aside|nav|form)[\s\S]*?<\/\1>/gi, " ").matchAll(/<(p|li|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => decode(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 60 && !/publicidade|leia também|assine|cookies|copyright|todos os direitos|compartilh/i.test(p))
    .map(sanitizeExternalText)
    .filter(Boolean);

  if (pageCache.size > 200) pageCache.delete(pageCache.keys().next().value);
  pageCache.set(url, { at: Date.now(), paragraphs });
  return paragraphs;
}

/** Lê as páginas mais relacionadas e devolve trechos (os parágrafos que mais têm a ver com a pergunta). */
export async function searchTrustedSites(queries, audience, limit = 2) {
  const list = (Array.isArray(queries) ? queries : [queries]).filter(Boolean);
  const terms = new Set(list.flatMap((q) => tokenize(q)));
  // Cada versão da pergunta é buscada separadamente (juntar tudo "dilui" a busca).
  const links = [...new Map(list.flatMap((q) => findTrustedLinks(q, audience, limit)).map((l) => [l.url, l])).values()].slice(0, limit);
  const results = await Promise.allSettled(
    links.map(async (link) => {
      const paragraphs = await readParagraphs(link.url);
      const ranked = paragraphs
        .map((text, order) => ({ text, order, hits: tokenize(text).filter((t) => terms.has(t)).length }))
        .sort((a, b) => b.hits - a.hits || a.order - b.order);
      // Começo do texto (definição) + parágrafos mais relacionados, até ~2000 caracteres, na ordem original.
      const chosen = [];
      let size = 0;
      for (const p of [...ranked.filter((p) => p.order < 2), ...ranked]) {
        if (chosen.includes(p) || size + p.text.length > 2000) continue;
        chosen.push(p);
        size += p.text.length;
      }
      const content = chosen.sort((a, b) => a.order - b.order).map((p) => p.text).join("\n");
      if (content.length < 200) return null;
      return {
        kind: "web",
        content,
        source: { title: `${link.site} - ${link.title}`, url: link.url, origin: link.site, file: link.url, priority: 1 }
      };
    })
  );
  return results.filter((r) => r.status === "fulfilled" && r.value).map((r) => r.value);
}
