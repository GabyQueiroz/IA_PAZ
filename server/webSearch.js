// Busca ao vivo na Wikipédia em português quando a base local não tem a resposta.
// - Envia só termos de busca (gerados pela IA ou palavras-chave), nunca a mensagem inteira do usuário.
// - Os textos passam pelo filtro de conteúdo antes de chegar à IA.
// - Gratuito e sem chave (API pública da Wikimedia).
import { sanitizeExternalText } from "./contentFilter.js";
import { tokenize } from "./text.js";

const API = "https://pt.wikipedia.org/w/api.php";

// O artigo precisa ter ligação com os temas do projeto (evita biografias e assuntos soltos).
const SCOPE_TOKENS = new Set(
  tokenize(
    `paz pacifismo conflito conflitos violência violento guerra direitos humanos bullying intimidação discriminação preconceito
     racismo xenofobia machismo homofobia educação escola escolar convivência respeito emoção emoções sentimento empatia
     cidadania justiça mediação diálogo inclusão exclusão diversidade criança crianças adolescente desigualdade democracia ética
     solidariedade cooperação tolerância não-violência dignidade igualdade liberdade socioemocional`
  )
);
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
export async function searchWikipedia(query, limit = 2, requiredTerms = []) {
  const key = `${query.toLowerCase().trim()}|${requiredTerms.join(",")}`;
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
    .filter((passage) => passage.content.length > 200)
    // Relevância: o artigo precisa conter algum termo da pergunta (evita resultados soltos, como um reality show).
    .filter((passage) => {
      const tokens = new Set(tokenize(`${passage.source.title} ${passage.content.slice(0, 1500)}`));
      const matchesQuestion = !requiredTerms.length || requiredTerms.some((term) => tokens.has(term));
      // Pelo menos 2 termos do tema do projeto no começo do artigo.
      const scopeHits = [...SCOPE_TOKENS].filter((term) => tokens.has(term)).length;
      return matchesQuestion && scopeHits >= 2;
    });

  if (cache.size > 300) cache.delete(cache.keys().next().value);
  cache.set(key, passages);
  return passages;
}
