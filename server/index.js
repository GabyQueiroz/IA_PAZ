import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { createChatService } from "./chat.js";
import { logExchange, logsEnabled, saveFeedback } from "./logStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "200kb" }));

const servicePromise = createChatService();
servicePromise.catch((error) => console.error("Falha ao iniciar a base:", error));

// Limite simples de requisições por IP para proteger o custo da API.
const hits = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || "anon";
  const recent = (hits.get(key) || []).filter((time) => now - time < 60_000);
  if (recent.length >= config.rateLimitPerMinute) {
    return res.status(429).json({ error: "Muitas mensagens seguidas. Espere um minutinho e tente de novo." });
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  next();
}

app.get("/api/health", async (_req, res) => {
  try {
    const info = (await servicePromise).info();
    res.json({ ok: true, documents: info.documents.length, chunks: info.chunks, ai: info.ai, models: info.models, embeddings: info.embeddings, trustedLinks: info.trustedLinks, logs: logsEnabled() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/sources", async (_req, res) => {
  try {
    res.json({ documents: (await servicePromise).info().documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/chat", rateLimit, async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim().slice(0, config.maxMessageChars);
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const profile = typeof req.body?.profile === "string" ? req.body.profile : null;
    if (!message) return res.status(400).json({ error: "Envie uma pergunta para o chat." });

    const service = await servicePromise;
    const started = Date.now();
    const result = await service.chat({ message, history, profile });

    // Registro anônimo (sem nome, sem IP); não atrasa a resposta se o banco estiver lento.
    const session = typeof req.body?.session === "string" ? req.body.session.slice(0, 64) : null;
    const logId = logsEnabled()
      ? await Promise.race([
          logExchange({
            ...result,
            // Resposta ao pedido de nome: o nome nunca vai para o registro.
            message: result.kind === "name_reply" ? "[nome informado]" : message,
            session,
            turn: Number(req.body?.turn) || null,
            profile: typeof req.body?.selectedProfile === "string" ? req.body.selectedProfile : profile,
            latencyMs: Date.now() - started
          }),
          new Promise((resolve) => setTimeout(() => resolve(null), 1500))
        ])
      : null;

    res.json({ ...result, logId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não consegui responder agora. Tente novamente em instantes." });
  }
});

app.post("/api/feedback", rateLimit, async (req, res) => {
  const id = Number(req.body?.id);
  const session = typeof req.body?.session === "string" ? req.body.session : "";
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(id) || !session || ![1, -1, 0].includes(rating)) return res.status(400).json({ ok: false });
  res.json({ ok: await saveFeedback(id, session, rating) });
});

const publicPath = path.resolve(__dirname, "..", "public");
app.use(express.static(publicPath));
app.get(/.*/, (_req, res) => res.sendFile(path.join(publicPath, "index.html")));

app.listen(config.port, () => console.log(`OBPAZ Chat rodando na porta ${config.port}`));
