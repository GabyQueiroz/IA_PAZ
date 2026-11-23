// Geração de embeddings com cache em disco.
// Provedores: OpenAI (padrão quando há chave) ou modelo local via @huggingface/transformers (opcional).
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

function l2normalize(vector) {
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return Float32Array.from(vector, (value) => value / norm);
}

export function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) dot += a[i] * b[i];
  return dot; // vetores já normalizados
}

async function createOpenAIProvider(openai) {
  const model = config.openaiEmbeddingModel;
  return {
    name: `openai:${model}`,
    async embed(texts) {
      const output = [];
      for (let i = 0; i < texts.length; i += 96) {
        const batch = texts.slice(i, i + 96);
        const response = await openai.embeddings.create({ model, input: batch });
        response.data
          .sort((a, b) => a.index - b.index)
          .forEach((item) => output.push(l2normalize(item.embedding)));
      }
      return output;
    },
    embedQuery(text) {
      return this.embed([text]).then(([vector]) => vector);
    },
    embedPassages(texts) {
      return this.embed(texts);
    }
  };
}

async function createLocalProvider() {
  let transformers;
  try {
    transformers = await import("@huggingface/transformers");
  } catch {
    return null; // pacote opcional não instalado
  }
  const model = config.localEmbeddingModel;
  const extractor = await transformers.pipeline("feature-extraction", model, { dtype: "q8" });
  const isE5 = /e5/i.test(model);
  const run = async (texts) => {
    const output = [];
    for (let i = 0; i < texts.length; i += 16) {
      const tensor = await extractor(texts.slice(i, i + 16), { pooling: "mean", normalize: true });
      output.push(...tensor.tolist().map((vector) => Float32Array.from(vector)));
    }
    return output;
  };
  return {
    name: `local:${model}`,
    embedQuery: async (text) => (await run([isE5 ? `query: ${text}` : text]))[0],
    embedPassages: (texts) => run(texts.map((text) => (isE5 ? `passage: ${text}` : text)))
  };
}

export async function createEmbeddingProvider() {
  const choice = config.embeddingProvider;
  if (choice === "none") return null;

  // Padrão: modelo local e gratuito, rodando no próprio servidor.
  // No Render grátis (512 MB) o modelo não cabe na memória, então "auto" pula o modelo local lá.
  const lowMemoryHost = Boolean(process.env.RENDER);
  if (choice === "local" || (choice === "auto" && !lowMemoryHost)) {
    const local = await createLocalProvider();
    if (local) return local;
  }
  // Alternativa paga (só se configurada): embeddings da OpenAI.
  if ((choice === "auto" || choice === "openai") && config.openaiApiKey) {
    const { default: OpenAI } = await import("openai");
    return createOpenAIProvider(new OpenAI({ apiKey: config.openaiApiKey }));
  }
  return null;
}

// Calcula (ou lê do cache) os embeddings dos trechos da base.
export async function embedChunks(provider, chunks) {
  const cacheFile = path.resolve(config.cacheDir, `embeddings-${provider.name.replace(/[^\w.-]+/g, "_")}.json`);
  let cache = {};
  try {
    cache = JSON.parse(await fs.readFile(cacheFile, "utf8"));
  } catch {
    cache = {};
  }

  const missing = chunks.filter((chunk) => !cache[chunk.hash]);
  if (missing.length) {
    console.log(`Gerando embeddings para ${missing.length} trechos (${provider.name})...`);
    const vectors = await provider.embedPassages(missing.map((chunk) => chunk.embedText));
    missing.forEach((chunk, index) => {
      cache[chunk.hash] = Array.from(vectors[index], (value) => Number(value.toFixed(6)));
    });
    try {
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      const live = new Set(chunks.map((chunk) => chunk.hash));
      const pruned = Object.fromEntries(Object.entries(cache).filter(([key]) => live.has(key)));
      await fs.writeFile(cacheFile, JSON.stringify(pruned));
    } catch (error) {
      console.warn("Não foi possível salvar o cache de embeddings:", error.message);
    }
  }

  return chunks.map((chunk) => Float32Array.from(cache[chunk.hash]));
}
