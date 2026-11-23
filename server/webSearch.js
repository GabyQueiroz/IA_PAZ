// Busca ao vivo na Wikipédia em português quando a base local não tem a resposta.
// - Envia só termos de busca (gerados pela IA ou palavras-chave), nunca a mensagem inteira do usuário.
// - Os textos passam pelo filtro de conteúdo antes de chegar à IA.
// - Gratuito e sem chave (API pública da Wikimedia).
import { sanitizeExternalText } from "./contentFilter.js";

const API = "https://pt.wikipedia.org/w/api.php";
const UA = "OBPAZ-Olive/1.0 (chatbot educativo NEP-UEPG)";
const cache = new Map();

async function getJson(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const response = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Wikipédia ${response.status}`);
  return response.json();
}

/**
 * @param {string} query termos de busca curtos
 * @returns {Promise<Array<{kind:string, content:string, source:object}>>}
 */
export async function searchWikipedia(query, limit = 2) {
  const key = query.toLowerCase().trim();
  if (!key) return [];
  if (cache.has(key)) return cache.get(key);

  const search = await getJson({ action: "query", list: "search", srsearch: query, srlimit: String(limit + 1), srnamespace: "0" });
  const titles = (search.query?.search || []).map((item) => item.title).slice(0, limit);
  if (!titles.length) return [];

  const data = await getJson({
    action: "query",
    prop: "extracts|info",
    inprop: "url",
    explaintext: "1",
    exchars: "2500",
    redirects: "1",
    titles: titles.join("|")
  });

  const passages = (data.query?.pages || [])
    .filter((page) => page.extract)
    .map((page) => ({
      kind: "web",
      content: sanitizeExternalText(page.extract.replace(/^=+ (.+?) =+$/gm, "$1:")).slice(0, 2200),
      source: {
        title: `Wikipédia - ${page.title}`,
        url: page.fullurl,
        origin: "Wikipédia (busca na internet)",
        file: `wiki-live-${page.pageid}`,
        priority: 1
      }
    }))
    .filter((passage) => passage.content.length > 200);

  if (cache.size > 300) cache.delete(cache.keys().next().value);
  cache.set(key, passages);
  return passages;
}
