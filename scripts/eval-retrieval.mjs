// Avalia a busca: para cada pergunta, verifica se o trecho esperado aparece entre os primeiros resultados.
// Uso: node scripts/eval-retrieval.mjs   (EMBEDDING_PROVIDER=none para comparar só BM25)
import { config } from "../server/config.js";
import { loadCorpus } from "../server/ingest.js";
import { createEmbeddingProvider, embedChunks } from "../server/embeddings.js";
import { createRetriever } from "../server/retriever.js";

// [pergunta, trecho esperado (pedaço do título do documento OU da pergunta da FAQ)]
const CASES = [
  ["O que é paz?", "O que é paz?"],
  ["me explica o que significa cultura de paz", "O que é cultura de paz?"],
  ["qual a diferença entre paz positiva e paz negativa", "paz positiva e paz negativa"],
  ["paz é só não ter guerra?", "Por que paz não é só ausência de guerra?"],
  ["quais os tipos de violência segundo Galtung", "Galtung"],
  ["o que é violência estrutural", "violências direta, estrutural e cultural"],
  ["quem criou o Peace Research Institute Oslo", "Galtung"],
  ["o que é peacebuilding", "Galtung"],
  ["o que é paz suleada", "Resumo Nucleo"],
  ["paz colonizada e paz decolonial", "Resumo Nucleo"],
  ["Herrera Flores e os direitos humanos", "Herrera"],
  ["teoria crítica dos direitos humanos", "Herrera"],
  ["o triângulo ABC do conflito", "Estudios de Paz"],
  ["conflito simétrico e assimétrico", "Estudios de Paz"],
  ["educação para a paz e a teoria da complexidade de Morin", "Cultura de paz se faz"],
  ["como a escola pode trabalhar cultura de paz", "escola"],
  ["os estudos para a paz foram cooptados pelo sistema internacional?", "Margem crítica"],
  ["realismo nas relações internacionais e estudos para a paz", "Margem crítica"],
  ["fico com muita raiva quando discuto, o que faço", "raiva"],
  ["briguei com meu melhor amigo", "Briguei com um colega"],
  ["estão me zoando todo dia na escola", "bullying"],
  ["como ajudar dois colegas que estão brigando", "Como ajudar duas pessoas que brigaram?"],
  ["quero pedir desculpa mas acho que não errei tudo", "pedir desculpa"],
  ["me sinto muito sozinho", "sozinho"],
  ["como falar com alguém sem ser grosso", "sem magoar"],
  ["o que são os Inner Development Goals", "Documento sem nome"],
  ["quais artigos foram usados como referência", "Artigos referenciados"]
];

const corpus = await loadCorpus();
const provider = await createEmbeddingProvider();
const vectors = provider ? await embedChunks(provider, corpus.chunks) : null;
const retriever = createRetriever({ chunks: corpus.chunks, vectors, provider });

const matches = (chunk, expected) => {
  const e = expected.toLowerCase();
  return chunk.source.title.toLowerCase().includes(e) || (chunk.question || "").toLowerCase().includes(e) || chunk.content.toLowerCase().includes(e);
};

let hit1 = 0;
let hit3 = 0;
const misses = [];
for (const [question, expected] of CASES) {
  const { results } = await retriever.search([question], 6);
  const rank = results.findIndex((chunk) => matches(chunk, expected));
  if (rank === 0) hit1 += 1;
  if (rank >= 0 && rank < 3) hit3 += 1;
  if (rank < 0 || rank >= 3) misses.push(`${question}  ->  top: ${results[0]?.source.title} | ${(results[0]?.question || results[0]?.content || "").slice(0, 60)}`);
}

console.log(`Embeddings: ${provider ? provider.name : "nenhum (BM25)"}  |  ${config.embeddingProvider}`);
console.log(`hit@1 = ${hit1}/${CASES.length}   hit@3 = ${hit3}/${CASES.length}`);
misses.forEach((miss) => console.log("  ✗", miss));
