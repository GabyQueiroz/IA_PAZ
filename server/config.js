import "dotenv/config";

function bool(value, fallback) {
  if (value === undefined || value === "") return fallback;
  return !["0", "false", "no", "nao", "não", "off"].includes(String(value).toLowerCase());
}

function num(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function list(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
// Modelos gratuitos da Groq, em ordem de preferência. Cada modelo tem sua própria cota gratuita,
// então quando um atinge o limite o próximo é usado.
const GROQ_DEFAULT_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];

const groqKey = process.env.GROQ_API_KEY || "";
const llmKey = process.env.LLM_API_KEY || groqKey || process.env.OPENAI_API_KEY || "";
const usesGroq = Boolean(process.env.GROQ_API_KEY) && !process.env.LLM_BASE_URL;
const llmBaseUrl = process.env.LLM_BASE_URL || (usesGroq ? GROQ_BASE_URL : process.env.OPENAI_BASE_URL || undefined);

export const config = {
  port: num(process.env.PORT, 3000),
  dataDir: process.env.DATA_DIR || "./OBPAZ - Banco de Dados-20260417T222334Z-3-001/OBPAZ - Banco de Dados",
  cacheDir: process.env.CACHE_DIR || "./.cache",
  webDataDir: process.env.WEB_DATA_DIR || "./conhecimento-web",
  // Busca ao vivo na Wikipédia (pt) quando a base não tem a resposta. 0 para desligar.
  liveWikipedia: bool(process.env.LIVE_WIKIPEDIA, true),

  // Qualquer API compatível com OpenAI (padrão: Groq, gratuita). Sem chave → modo básico.
  llmApiKey: llmKey,
  llmBaseUrl,
  llmProvider: usesGroq ? "groq" : llmBaseUrl ? "custom" : llmKey ? "openai" : "none",
  // OPENAI_MODEL só vale para a OpenAI; com Groq ele é ignorado (evita pedir "gpt-4.1-mini" à Groq).
  llmModels: list(process.env.LLM_MODELS || (usesGroq ? "" : process.env.OPENAI_MODEL)).length
    ? list(process.env.LLM_MODELS || process.env.OPENAI_MODEL)
    : usesGroq
      ? GROQ_DEFAULT_MODELS
      : ["gpt-4.1-mini"],

  // Modelos leves para reescrever a pergunta e gerar termos de busca (cota gratuita separada).
  rewriteModels: list(process.env.REWRITE_MODELS).length
    ? list(process.env.REWRITE_MODELS)
    : usesGroq
      ? ["openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
      : null,

  // "auto" = modelo local gratuito (@huggingface/transformers); se indisponível, OpenAI (se houver chave); senão só BM25.
  embeddingProvider: (process.env.EMBEDDING_PROVIDER || "auto").toLowerCase(),
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  localEmbeddingModel: process.env.LOCAL_EMBEDDING_MODEL || "Xenova/multilingual-e5-small",

  chunkChars: num(process.env.CHUNK_CHARS, 850),
  topK: num(process.env.RAG_TOP_K, 5),
  temperature: num(process.env.LLM_TEMPERATURE || process.env.OPENAI_TEMPERATURE, 0.2),

  showSources: bool(process.env.SHOW_SOURCES, true),
  rateLimitPerMinute: num(process.env.RATE_LIMIT_PER_MINUTE, 20),
  maxMessageChars: num(process.env.MAX_MESSAGE_CHARS, 1200)
};
