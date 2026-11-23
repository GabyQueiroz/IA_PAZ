// Monta um ÍNDICE DE LINKS (título + resumo curto + endereço) de sites educativos confiáveis.
// O texto completo NÃO é guardado (direitos autorais): a Olive lê a página na hora da pergunta,
// resume com as próprias palavras e mostra o link.
// Respeita o robots.txt dos sites (não usa as páginas de busca, que são proibidas).
// Uso: node scripts/build-link-index.mjs
import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { isSafeExternalText } from "../server/contentFilter.js";

const UA = "OBPAZ-Olive/1.0 (chatbot educativo NEP-UEPG; indice de links)";
const OUT = path.resolve("conhecimento-web", "indice-links.json");

const SITES = [
  { name: "Escola Kids", audience: "crianca", sitemap: "https://escolakids.uol.com.br/sitemap.xml" },
  { name: "Brasil Escola", audience: "geral", sitemap: "https://brasilescola.uol.com.br/sitemap.xml" },
  { name: "Instituto Ayrton Senna", audience: "educador", sitemap: "https://institutoayrtonsenna.org.br/sitemap_index.xml" }
];

// Temas do projeto, procurados no endereço (slug) das páginas.
const TOPICS = [
  "paz", "bullying", "cyberbullying", "ciberbullying", "conflito", "violencia", "direitos-humanos", "direitos-da-crianca",
  "estatuto-da-crianca", "racismo", "preconceito", "discriminacao", "diversidade", "respeito", "tolerancia", "empatia",
  "amizade", "emocoes", "emocao", "sentimentos", "raiva", "gentileza", "cidadania", "inclusao", "igualdade", "xenofobia",
  "machismo", "desigualdade", "gandhi", "mandela", "malala", "martin-luther-king", "nao-violencia", "mediacao", "dialogo",
  "convivencia", "solidariedade", "valores", "socioemocion", "autoconhecimento", "autoestima", "cooperacao", "resiliencia",
  "amabilidade", "colaboracao", "saude-mental", "cultura-de-paz", "onu", "unesco", "democracia", "etica", "justica"
];
// Títulos fora do tema (ex.: "raiva" a doença, "Ponte da Amizade", notícias institucionais).
const NOISE = /sintoma|transmiss|vacina|doen[cç]a|v[ií]rus|ponte da amizade|tratados? de|paz de westf|acordos de paz de paris|garimpeiro|nova rep[uú]blica|democracia ateniense|lan[cç]ament|participa de f[oó]rum|e-book|webin[aá]rio|evento|pr[eê]mio|edital|vaga/i;
const EXCLUDE = /\/(videos?|exercicios|imprimir|busca|tag|autor|categoria|category|page)\//i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return url.endsWith(".gz") || buffer[0] === 0x1f ? zlib.gunzipSync(buffer).toString("utf8") : buffer.toString("utf8");
}

async function collectUrls(sitemapUrl, depth = 0) {
  let xml;
  try {
    xml = await fetchText(sitemapUrl);
  } catch (error) {
    // Alguns mapas apontam para "/sitemapN.xml.gz" quando o arquivo está em "/sitemap/sitemapN.xml.gz".
    const fixed = sitemapUrl.replace(/\/(sitemap\d*\.xml\.gz)$/, "/sitemap/$1");
    if (fixed === sitemapUrl) throw error;
    xml = await fetchText(fixed);
  }
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  if (/<sitemapindex/i.test(xml) && depth < 2) {
    const children = locs.filter((loc) => !/image|video|news|pdf/i.test(loc));
    const urls = [];
    for (const child of children) {
      try {
        urls.push(...(await collectUrls(child, depth + 1)));
      } catch (error) {
        console.warn(`  ! ${child}: ${error.message}`);
      }
      await sleep(300);
    }
    return urls;
  }
  return locs;
}

const decode = (s) =>
  String(s)
    .replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(Number(c)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

async function pageInfo(url) {
  const html = await fetchText(url);
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s*[-|–]\s*(Brasil Escola|Escola Kids|Instituto Ayrton Senna).*$/i, "");
  const description = decode(
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)?.[1] ||
      ""
  );
  return { title, description: description.slice(0, 300) };
}

const index = [];
for (const site of SITES) {
  console.log(`${site.name}: lendo o mapa do site...`);
  let urls = [];
  try {
    urls = await collectUrls(site.sitemap);
  } catch (error) {
    console.warn(`  ! ${error.message}`);
    continue;
  }
  const candidates = [...new Set(urls)].filter(
    (url) => !EXCLUDE.test(url) && TOPICS.some((topic) => new RegExp(`(^|[/-])${topic}`).test(url.toLowerCase()))
  );
  console.log(`  ${urls.length} páginas no mapa, ${candidates.length} sobre os temas`);

  for (const url of candidates) {
    try {
      const info = await pageInfo(url);
      if (info.title && !NOISE.test(info.title) && isSafeExternalText(`${info.title} ${info.description}`)) {
        index.push({ site: site.name, audience: site.audience, url, ...info });
      }
    } catch (error) {
      console.warn(`  ! ${url}: ${error.message}`);
    }
    await sleep(400); // educado com o servidor
  }
}

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), links: index }, null, 1));
console.log(`\n${index.length} links salvos em ${OUT}`);
