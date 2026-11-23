import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { createChatService } from "./chat.js";

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
    res.json({ ok: true, documents: info.documents.length, chunks: info.chunks, ai: info.ai, models: info.models, embeddings: info.embeddings, trustedLinks: info.trustedLinks });
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
    res.json(await service.chat({ message, history, profile }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não consegui responder agora. Tente novamente em instantes." });
  }
});

const publicPath = path.resolve(__dirname, "..", "public");
app.use(express.static(publicPath));
app.get(/.*/, (_req, res) => res.sendFile(path.join(publicPath, "index.html")));

app.listen(config.port, () => console.log(`OBPAZ Chat rodando na porta ${config.port}`));
