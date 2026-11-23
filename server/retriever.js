// Busca híbrida: BM25 (palavras-chave) + embeddings (significado), combinadas por Reciprocal Rank Fusion.
import { tokenize } from "./text.js";
import { cosine } from "./embeddings.js";

const K1 = 1.4;
const B = 0.75;
const RRF_K = 60;

export function createRetriever({ chunks, vectors, provider }) {
  const docs = chunks.map((chunk) => {
    // Na FAQ, a pergunta pesa mais (repetida) porque descreve exatamente o assunto do trecho.
    const text = chunk.kind === "faq" ? `${chunk.question} ${chunk.question} ${chunk.content}` : `${chunk.source.title} ${chunk.content}`;
    const tokens = tokenize(text);
    const counts = new Map();
    tokens.forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));
    return { length: tokens.length, counts };
  });

  const avgLength = docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length;
  const df = new Map();
  docs.forEach((doc) => doc.counts.forEach((_count, token) => df.set(token, (df.get(token) || 0) + 1)));
  const idf = (token) => Math.log(1 + (docs.length - (df.get(token) || 0) + 0.5) / ((df.get(token) || 0) + 0.5));

  function bm25(query) {
    const terms = [...new Set(tokenize(query))];
    const totalIdf = terms.reduce((sum, term) => sum + idf(term), 0) || 1;
    return docs.map((doc, index) => {
      let score = 0;
      let matchedIdf = 0;
      for (const term of terms) {
        const tf = doc.counts.get(term) || 0;
        if (!tf) continue;
        matchedIdf += idf(term);
        score += idf(term) * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.length) / avgLength)));
      }
      return { index, score, coverage: matchedIdf / totalIdf };
    });
  }

  const queryCache = new Map();
  async function embedQuery(text) {
    if (!provider) return null;
    if (queryCache.has(text)) return queryCache.get(text);
    const vector = await provider.embedQuery(text);
    if (queryCache.size > 500) queryCache.delete(queryCache.keys().next().value);
    queryCache.set(text, vector);
    return vector;
  }

  /**
   * @param {string[]} queries  pergunta original + versões reescritas
   */
  async function search(queries, limit = 6) {
    const uniqueQueries = [...new Set(queries.map((q) => String(q || "").trim()).filter(Boolean))];
    const fused = new Map();
    const best = new Map(); // melhor dense/bm25/coverage por trecho

    const touch = (index, field, value) => {
      const current = best.get(index) || { dense: 0, bm25: 0, coverage: 0 };
      current[field] = Math.max(current[field], value);
      best.set(index, current);
    };
    const addRanking = (ranking, weight = 1) => {
      ranking.forEach((item, rank) => {
        fused.set(item.index, (fused.get(item.index) || 0) + weight / (RRF_K + rank + 1));
      });
    };

    for (const query of uniqueQueries) {
      const lexical = bm25(query).filter((item) => item.score > 0);
      lexical.forEach((item) => {
        touch(item.index, "bm25", item.score);
        touch(item.index, "coverage", item.coverage);
      });
      addRanking(lexical.sort((a, b) => b.score - a.score).slice(0, 20));

      if (vectors) {
        let queryVector = null;
        try {
          queryVector = await embedQuery(query);
        } catch (error) {
          console.warn("Falha ao gerar embedding da pergunta; usando só BM25:", error.message);
        }
        if (!queryVector) continue;
        const dense = vectors.map((vector, index) => ({ index, score: cosine(queryVector, vector) }));
        dense.forEach((item) => touch(item.index, "dense", item.score));
        addRanking(dense.sort((a, b) => b.score - a.score).slice(0, 20), 1.2);
      }
    }

    // Peso por fonte: site oficial do NEP (3) > material OBPAZ (2) > Wikipédia (1).
    const weight = (index) => ({ 3: 1.1, 2: 1, 1: 0.85 })[chunks[index].source.priority ?? 2] ?? 1;
    const results = [...fused.entries()]
      .map(([index, score]) => [index, score * weight(index)])
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([index, fusedScore]) => ({ ...chunks[index], fusedScore, ...best.get(index) }));

    return {
      results,
      topDense: Math.max(0, ...results.map((r) => r.dense || 0)),
      topCoverage: Math.max(0, ...results.map((r) => r.coverage || 0)),
      usesEmbeddings: Boolean(vectors)
    };
  }

  return { search };
}
