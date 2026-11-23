// Baixa o modelo de embeddings e calcula o índice da base com antecedência
// (usado no build do Docker para o servidor já iniciar pronto).
import { loadCorpus } from "../server/ingest.js";
import { createEmbeddingProvider, embedChunks } from "../server/embeddings.js";
import { KID_ENTRIES } from "../server/kidContent.js";

const corpus = await loadCorpus();
const provider = await createEmbeddingProvider();
if (!provider) {
  console.log("Sem provedor de embeddings; nada a pré-calcular.");
  process.exit(0);
}
await embedChunks(provider, corpus.chunks);
// Mesmo formato usado em server/chat.js para o índice infantil.
await embedChunks(
  provider,
  KID_ENTRIES.map((entry) => ({
    embedText: `${entry.questions.join(" ")}\n${entry.answer}`,
    hash: `kid-${entry.id}-${entry.answer.length}-${entry.questions.length}`
  }))
);
console.log(`Índice pronto: ${corpus.chunks.length} trechos + ${KID_ENTRIES.length} histórias (${provider.name}).`);
