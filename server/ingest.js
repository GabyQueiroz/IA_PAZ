// Leitura dos documentos da base OBPAZ e divisão em trechos (chunks) prontos para busca.
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { cleanExtractedText, splitSentences } from "./text.js";
import { config } from "./config.js";

const SUPPORTED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md"]);

async function findFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) files.push(...(await findFiles(fullPath)));
    else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(fullPath);
  }
  return files.sort();
}

export async function resolveDataDir() {
  const configured = path.resolve(process.cwd(), config.dataDir);
  if (fsSync.existsSync(configured)) return configured;

  const rootEntries = await fs.readdir(process.cwd(), { withFileTypes: true });
  const obpazDir = rootEntries.find((entry) => entry.isDirectory() && entry.name.toLowerCase().includes("obpaz"));
  if (!obpazDir) throw new Error("Pasta OBPAZ não encontrada. Configure DATA_DIR no .env.");
  const firstLevel = path.join(process.cwd(), obpazDir.name);
  const nested = path.join(firstLevel, "OBPAZ - Banco de Dados");
  return fsSync.existsSync(nested) ? nested : firstLevel;
}

async function extractText(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);

  if (extension === ".pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      return (await parser.getText()).text || "";
    } finally {
      await parser.destroy();
    }
  }
  if (extension === ".docx") return (await mammoth.extractRawText({ buffer })).value || "";
  return buffer.toString("utf8");
}

function titleFromFile(filePath) {
  return path
    .basename(filePath, path.extname(filePath))
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/_/g, " ")
    .trim();
}

function hash(text) {
  return crypto.createHash("sha1").update(text).digest("hex").slice(0, 16);
}

// FAQ em Markdown: cada "## Pergunta" + resposta vira um trecho próprio (melhor precisão).
function chunkMarkdownFaq(text, source) {
  const sections = text.split(/^##\s+/m).slice(1);
  return sections
    .map((section) => {
      const [firstLine, ...rest] = section.split("\n");
      const question = firstLine.trim();
      const answer = rest.join("\n").trim();
      if (!question || !answer) return null;
      return { kind: "faq", question, content: `Pergunta: ${question}\nResposta: ${answer}`, source };
    })
    .filter(Boolean);
}

// Textos corridos: agrupa frases inteiras até ~CHUNK_CHARS, com sobreposição de uma frase.
// Listas sem pontuação (ex.: página de equipe) viram uma "frase" enorme: corta em pedaços menores.
function splitLong(sentence, max) {
  if (sentence.length <= max) return [sentence];
  const words = sentence.split(" ");
  const parts = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).length > max && current) {
      parts.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function chunkProse(text, source) {
  const sentences = splitSentences(text).flatMap((sentence) => splitLong(sentence, Math.round(config.chunkChars * 0.6)));
  const chunks = [];
  let current = [];
  let length = 0;

  const flush = () => {
    const content = current.join(" ").trim();
    if (content.length > 80) chunks.push({ kind: "texto", content, source });
  };

  for (const sentence of sentences) {
    if (length + sentence.length > config.chunkChars && current.length) {
      flush();
      const overlap = current.slice(-1);
      current = overlap[0] && overlap[0].length < 400 ? [...overlap] : [];
      length = current.join(" ").length;
    }
    current.push(sentence);
    length += sentence.length + 1;
  }
  flush();
  return chunks;
}

// Cabeçalho "---\ntitle: ...\nurl: ...\n---" usado nos arquivos de conhecimento-web.
function parseFrontmatter(raw) {
  const match = String(raw).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: raw };
  const meta = Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .map((line) => line.match(/^(\w+):\s*(.*)$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.trim()])
  );
  return { meta, body: raw.slice(match[0].length) };
}

export async function loadCorpus() {
  const dataDir = await resolveDataDir();
  // Base principal (OBPAZ) + base da web (NEP/UEPG, Wikipédia...) gerada por scripts/build-web-knowledge.mjs.
  const webDir = path.resolve(process.cwd(), config.webDataDir);
  const files = [...(await findFiles(dataDir)), ...(fsSync.existsSync(webDir) ? await findFiles(webDir) : [])];
  const documents = [];
  const chunks = [];

  for (const filePath of files) {
    try {
      const { meta, body } = parseFrontmatter(await extractText(filePath));
      const text = cleanExtractedText(body);
      if (!text) continue;

      const source = {
        title: meta.title || titleFromFile(filePath),
        file: path.basename(filePath),
        relativePath: path.relative(process.cwd(), filePath),
        url: meta.url || null,
        origin: meta.source || "Material OBPAZ",
        // Peso na busca: NEP (site oficial) > material OBPAZ > leis > Wikipédia.
        priority: Number(meta.priority) || 2
      };
      const isFaq = path.extname(filePath).toLowerCase() === ".md" && /^##\s+/m.test(text);
      const docChunks = isFaq ? chunkMarkdownFaq(text, source) : chunkProse(text, source);

      docChunks.forEach((chunk, index) => {
        chunks.push({
          ...chunk,
          id: `${hash(source.relativePath)}-${index}`,
          // Texto usado para embeddings: inclui o título do documento para dar contexto ao trecho.
          embedText: `${source.title}\n${chunk.content}`,
          hash: hash(`${source.title}\n${chunk.content}`)
        });
      });
      documents.push({ ...source, characters: text.length, chunks: docChunks.length });
    } catch (error) {
      console.warn(`Falha ao processar ${filePath}:`, error.message);
    }
  }

  if (!chunks.length) throw new Error("Nenhum conteúdo legível foi encontrado na base OBPAZ.");
  return { dataDir, documents, chunks };
}
