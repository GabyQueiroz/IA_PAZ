import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { createKnowledgeBase } from "./knowledgeBase.js";
import { hasPeaceScopeTerm, isPracticalPeaceQuestion, PRACTICAL_SCOPE_DESCRIPTION } from "./practicalGuidance.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const OUT_OF_SCOPE_THRESHOLD = 0.08;

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const knowledgeBasePromise = createKnowledgeBase();

function compactHistory(history = []) {
  return history
    .filter((item) => item && ["user", "assistant"].includes(item.role) && item.content)
    .slice(-6)
    .map((item) => ({
      role: item.role,
      content: String(item.content).slice(0, 900)
    }));
}

function buildContext(results) {
  return results
    .map((item, index) => `[Trecho ${index + 1}]\n${item.content.slice(0, 1400)}`)
    .join("\n\n---\n\n");
}

async function generateAnswer({ message, history, results, isOutOfScope, kb }) {
  if (!openai) {
    return {
      answer: kb.buildLocalAnswer(message, isOutOfScope ? [] : results),
      mode: "local"
    };
  }

  const context = buildContext(results);
  const scopeInstruction = isOutOfScope
    ? `A pergunta está fora do escopo. Responda de forma breve e gentil, dizendo que você pode ajudar com paz, cultura de paz, conflitos, direitos humanos, educação para a paz e ${PRACTICAL_SCOPE_DESCRIPTION}. Não mencione base, documentos, fontes, trechos ou contexto.`
    : "Responda diretamente apenas o que foi perguntado, com fluidez e sem citar que usou contexto. Não mencione base, documentos, fontes, trechos, arquivos ou materiais. Se a informação for insuficiente, responda com uma orientação prática, cuidadosa e honesta.";

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.55,
    messages: [
      {
        role: "system",
        content:
          `Você é um chatbot brasileiro especializado em cultura da paz. Fale em português claro, direto, natural e acolhedor. Responda apenas o que a pessoa perguntou. Não comece com frases como 'na base', 'no documento', 'segundo o texto', 'com base em' ou semelhantes. Não mostre fontes. Seu escopo inclui estudos para a paz, cultura de paz, conflitos, direitos humanos, educação para a paz, violência, transformação social e orientação prática sobre ${PRACTICAL_SCOPE_DESCRIPTION}. Evite julgamentos diretos, promova reflexão, ofereça alternativas e incentive diálogo real. Em bullying, violência, risco ou sofrimento emocional intenso, oriente a buscar apoio humano, adulto responsável, autoridade ou serviço de emergência. Não substitua terapia, atendimento médico, jurídico ou policial.`
      },
      ...compactHistory(history),
      {
        role: "user",
        content: `Pergunta: ${message}\n\n${scopeInstruction}\n\nContexto interno para responder, sem mencionar ao usuário:\n${context || "Nenhum trecho relevante encontrado."}`
      }
    ]
  });

  return {
    answer: completion.choices[0]?.message?.content?.trim() || kb.buildLocalAnswer(message, results),
    mode: "openai"
  };
}

app.get("/api/health", async (_req, res) => {
  try {
    const kb = await knowledgeBasePromise;
    res.json({
      ok: true,
      documents: kb.documents.length,
      chunks: kb.chunksCount,
      dataDir: kb.dataDir,
      ai: openai ? "openai" : "local"
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/sources", async (_req, res) => {
  try {
    const kb = await knowledgeBasePromise;
    res.json({ documents: kb.documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!message) {
      return res.status(400).json({ error: "Envie uma pergunta para o chat." });
    }

    const kb = await knowledgeBasePromise;
    const search = kb.search(message, 5);
    const isOutOfScope =
      !isPracticalPeaceQuestion(message) &&
      !hasPeaceScopeTerm(message) &&
      search.score < 1;
    const { answer, mode } = await generateAnswer({
      message,
      history,
      results: search.results,
      isOutOfScope,
      kb
    });

    res.json({ answer, sources: [], mode, outOfScope: isOutOfScope });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Não consegui responder agora. Verifique a base de dados e as variáveis de ambiente."
    });
  }
});

const publicPath = path.resolve(__dirname, "..", "public");
app.use(express.static(publicPath));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`OBPAZ Chat rodando na porta ${PORT}`);
});
