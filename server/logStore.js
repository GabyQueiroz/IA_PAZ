// Registro ANÔNIMO das conversas em PostgreSQL (ex.: Neon, gratuito).
// - Sem nome, sem IP. Telefones, e-mails, CPF, CEP e endereços digitados são apagados antes de salvar.
// - Desligado enquanto DATABASE_URL não estiver configurada (o chat funciona normalmente).
// - Apaga registros mais antigos que LOG_RETENTION_DAYS (padrão: 730 dias).
import pg from "pg";
import { config } from "./config.js";

let pool = null;
let ready = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS conversas (
  id              BIGSERIAL PRIMARY KEY,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  sessao          TEXT,            -- id aleatório da visita (não identifica a pessoa)
  turno           INTEGER,         -- posição da mensagem na conversa
  publico         TEXT,            -- crianca | adolescente | adulto (usado na resposta)
  perfil_escolhido TEXT,           -- o que foi escolhido na tela (crianca, adolescente, adulto, auto)
  publico_detectado BOOLEAN,       -- true se o sistema percebeu sozinho (ex.: "tenho 8 anos")
  motivo_publico  TEXT,            -- por que esse público (ex.: "idade informada (8 anos)")
  pergunta        TEXT,            -- mensagem do usuário, com dados pessoais removidos
  resposta        TEXT,
  tipo            TEXT,            -- answer | related | not_found | out_of_scope | risk | blocked | greeting
  fundamentada    BOOLEAN,         -- a resposta veio das fontes?
  modelo          TEXT,            -- modelo de IA usado (ou "local")
  fontes          JSONB,           -- títulos e links das fontes
  historinha      JSONB,           -- título e cenas da historinha (modo criança)
  tempo_ms        INTEGER,
  avaliacao       SMALLINT         -- 1 = 👍, -1 = 👎, null = sem avaliação
);
CREATE INDEX IF NOT EXISTS conversas_criado_em_idx ON conversas (criado_em);
CREATE INDEX IF NOT EXISTS conversas_publico_idx ON conversas (publico);
`;

export function logsEnabled() {
  return Boolean(config.databaseUrl);
}

async function init() {
  if (!config.databaseUrl) return false;
  if (!ready) {
    pool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: /localhost|127\.0\.0\.1/.test(config.databaseUrl) ? false : { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30_000
    });
    pool.on("error", (error) => console.warn("Banco de registros:", error.message));
    ready = pool
      .query(SCHEMA)
      .then(() => pool.query("DELETE FROM conversas WHERE criado_em < now() - ($1 || ' days')::interval", [String(config.logRetentionDays)]))
      .then(() => {
        console.log("Registro de conversas: ligado (anônimo).");
        return true;
      })
      .catch((error) => {
        console.warn("Registro de conversas desligado (erro no banco):", error.message);
        ready = null;
        return false;
      });
  }
  return ready;
}

// Remove dados pessoais que a pessoa possa ter digitado.
export function redact(text) {
  return String(text || "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[e-mail]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[cpf]")
    .replace(/\b\d{5}-?\d{3}\b/g, "[cep]")
    .replace(/(\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, "[telefone]")
    .replace(/\b(rua|avenida|av\.|travessa|alameda)\s+[^,.\n]{2,40}(,?\s*(n[ºo°.]?\s*)?\d+)?/gi, "[endereço]")
    // Nome digitado (crianças costumam escrever em minúsculas): "meu nome é ana clara" -> "meu nome é [nome]".
    .replace(/(meu nome (é|e|�)|me chamo|eu me chamo|pode me chamar de|eu sou (o|a))\s+[\p{L}]+(\s+(?!e\b|tenho\b|sou\b|estou\b|moro\b)[\p{L}]+)?/giu, "$1 [nome]")
    .slice(0, 4000);
}

/** Salva uma troca pergunta/resposta. Não bloqueia o chat: erros só aparecem no log do servidor. */
export async function logExchange(entry) {
  if (!(await init())) return null;
  try {
    const { rows } = await pool.query(
      `INSERT INTO conversas (sessao, turno, publico, perfil_escolhido, publico_detectado, motivo_publico,
         pergunta, resposta, tipo, fundamentada, modelo, fontes, historinha, tempo_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [
        String(entry.session || "").slice(0, 64) || null,
        Number.isInteger(entry.turn) ? entry.turn : null,
        entry.audience || null,
        entry.profile || null,
        Boolean(entry.audienceDetected),
        entry.audienceReason || null,
        redact(entry.message),
        redact(entry.answer),
        entry.kind || null,
        typeof entry.grounded === "boolean" ? entry.grounded : null,
        entry.model || entry.mode || null,
        JSON.stringify(entry.sources || []),
        entry.story ? JSON.stringify({ titulo: entry.story.title, cenas: entry.story.panels?.map((p) => p.scene) }) : null,
        Number.isFinite(entry.latencyMs) ? Math.round(entry.latencyMs) : null
      ]
    );
    return rows[0]?.id ?? null;
  } catch (error) {
    console.warn("Falha ao salvar conversa:", error.message);
    return null;
  }
}

/** 👍 / 👎 de uma resposta. Só altera registros da mesma sessão (evita que alguém avalie respostas de outros). */
export async function saveFeedback(id, session, rating) {
  if (!(await init())) return false;
  const value = rating > 0 ? 1 : rating < 0 ? -1 : null;
  try {
    const result = await pool.query("UPDATE conversas SET avaliacao = $1 WHERE id = $2 AND sessao = $3", [value, id, session]);
    return result.rowCount > 0;
  } catch (error) {
    console.warn("Falha ao salvar avaliação:", error.message);
    return false;
  }
}
