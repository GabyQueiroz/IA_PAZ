import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { answerPracticalQuestion, isPracticalPeaceQuestion } from "./practicalGuidance.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPPORTED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md"]);
const CHUNK_SIZE = 1300;
const CHUNK_OVERLAP = 220;
const FAQ_MATCH_THRESHOLD = 0.35;
const QA_DATABASE_PATH = path.join(__dirname, "data", "qaDatabase.json");

/**
 * Banco de perguntas e respostas (FAQ) carregado de server/data/qaDatabase.json.
 * Cada entrada: { id, tema, pergunta, resposta, fontes }.
 * Para adicionar/editar perguntas, edite apenas o JSON — não é preciso mexer neste arquivo.
 */
function loadQaDatabase() {
  if (!fsSync.existsSync(QA_DATABASE_PATH)) return [];

  try {
    const raw = fsSync.readFileSync(QA_DATABASE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry && entry.pergunta && entry.resposta);
  } catch (error) {
    console.warn("Falha ao carregar qaDatabase.json:", error.message);
    return [];
  }
}

const QA_DATABASE = loadQaDatabase();

const FAQ_ENTRIES = QA_DATABASE.map((entry) => ({
  id: entry.id,
  tema: entry.tema,
  question: entry.pergunta,
  answer: entry.resposta,
  fontes: entry.fontes || []
}));

const STOPWORDS = new Set(
  [
    "a",
    "ao",
    "aos",
    "as",
    "com",
    "como",
    "da",
    "das",
    "de",
    "do",
    "dos",
    "e",
    "em",
    "entre",
    "essa",
    "esse",
    "esta",
    "este",
    "eu",
    "foi",
    "ha",
    "isso",
    "la",
    "lo",
    "los",
    "mas",
    "na",
    "nas",
    "no",
    "nos",
    "o",
    "os",
    "ou",
    "para",
    "por",
    "que",
    "qual",
    "quais",
    "quando",
    "se",
    "sem",
    "ser",
    "sobre",
    "sua",
    "suas",
    "sao",
    "tambem",
    "um",
    "uma",
    "y",
    "el",
    "en",
    "una",
    "un",
    "del",
    "las"
  ].map(normalizeToken)
);

function normalizeToken(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function tokenize(text) {
  return String(text)
    .split(/[^\p{L}\p{N}]+/u)
    .map(normalizeToken)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function normalizeText(text) {
  return String(text)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function findFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findFiles(fullPath)));
    } else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

async function resolveDataDir() {
  const configuredDir = process.env.DATA_DIR
    ? path.resolve(process.cwd(), process.env.DATA_DIR)
    : path.resolve(process.cwd(), "OBPAZ - Banco de Dados-20260417T222334Z-3-001", "OBPAZ - Banco de Dados");

  if (fsSync.existsSync(configuredDir)) {
    return configuredDir;
  }

  const rootEntries = await fs.readdir(process.cwd(), { withFileTypes: true });
  const obpazDir = rootEntries.find((entry) => entry.isDirectory() && entry.name.toLowerCase().includes("obpaz"));
  if (!obpazDir) {
    throw new Error("Pasta OBPAZ não encontrada. Configure DATA_DIR no .env.");
  }

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
      const parsed = await parser.getText();
      return parsed.text || "";
    } finally {
      await parser.destroy();
    }
  }

  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  return buffer.toString("utf8");
}

function splitIntoChunks(text, source) {
  const chunks = [];
  let index = 0;
  let position = 0;

  while (position < text.length) {
    const rawChunk = text.slice(position, position + CHUNK_SIZE);
    const content = rawChunk.trim();

    if (content.length > 120) {
      const tokens = tokenize(content);
      const termCounts = new Map();
      tokens.forEach((token) => termCounts.set(token, (termCounts.get(token) || 0) + 1));

      chunks.push({
        id: `${source.name}-${index}`,
        source,
        content,
        tokens,
        termCounts
      });
      index += 1;
    }

    position += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

function buildQaChunks(qaEntries) {
  return qaEntries.map((entry) => {
    const content = `${entry.pergunta}\n${entry.resposta}`;
    const tokens = tokenize(content);
    const termCounts = new Map();
    tokens.forEach((token) => termCounts.set(token, (termCounts.get(token) || 0) + 1));

    return {
      id: `qa-${entry.id}`,
      source: {
        name: `Banco de Perguntas — ${entry.tema}`,
        relativePath: "server/data/qaDatabase.json",
        characters: content.length
      },
      content: entry.resposta,
      tokens,
      termCounts
    };
  });
}

function sentenceCandidates(chunks, queryTerms) {
  return chunks
    .flatMap((chunk) =>
      chunk.content
        .split(/(?<=[.!?])\s+|\n+/)
        .map((sentence) => ({ sentence: sentence.trim(), source: chunk.source }))
    )
    .filter(({ sentence }) => sentence.length > 50)
    .map((item) => {
      const tokens = new Set(tokenize(item.sentence));
      const matches = [...queryTerms].filter((term) => tokens.has(term)).length;
      return { ...item, matches };
    })
    .filter((item) => item.matches > 0)
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 3);
}

function scoreTerms(question, text) {
  const questionTerms = new Set(tokenize(question));
  const textTerms = new Set(tokenize(text));
  if (!questionTerms.size || !textTerms.size) return 0;

  const intersection = [...questionTerms].filter((term) => textTerms.has(term)).length;
  return intersection / Math.sqrt(questionTerms.size * textTerms.size);
}

function faqAnswer(question) {
  const ranked = FAQ_ENTRIES.map((entry) => ({
    ...entry,
    score: scoreTerms(question, entry.question)
  })).sort((a, b) => b.score - a.score);

  return ranked[0]?.score >= FAQ_MATCH_THRESHOLD ? ranked[0].answer : "";
}

function localTopicAnswer(question) {
  const terms = new Set(tokenize(question));
  const normalizedQuestion = String(question)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalizedQuestion.includes("questoes gerais") && normalizedQuestion.includes("paz")) {
    return "De modo geral, a paz deve ser entendida como um processo amplo: não basta ausência de guerra, é preciso enfrentar desigualdades, violências e injustiças. Por isso, educação para a paz envolve pensamento crítico, diálogo e compromisso com direitos humanos.";
  }

  if (terms.has("bases") && (terms.has("educacao") || terms.has("paz"))) {
    return "As bases da educação para a paz são uma compreensão crítica da paz, o diálogo, os direitos humanos, a justiça social e a transformação não violenta dos conflitos. A ideia é educar para reconhecer as violências presentes na sociedade e agir para superá-las.";
  }

  if (terms.has("questoes") && terms.has("gerais") && terms.has("paz")) {
    return "De modo geral, a paz deve ser entendida como um processo amplo: não basta ausência de guerra, é preciso enfrentar desigualdades, violências e injustiças. Por isso, educação para a paz envolve pensamento crítico, diálogo e compromisso com direitos humanos.";
  }

  if (terms.has("herrera") || terms.has("flores")) {
    return "Joaquín Herrera Flores foi um pensador ligado à teoria crítica dos direitos humanos. Sua contribuição ajuda a entender os direitos humanos como processos de luta por dignidade, justiça e acesso real aos bens necessários para viver bem, não apenas como normas escritas. Dentro da cultura de paz, essa visão reforça que a paz depende de condições concretas de dignidade e participação social.";
  }

  const matchedFaq = faqAnswer(question);
  if (matchedFaq) return matchedFaq;

  if (terms.has("cultura") && terms.has("paz")) {
    return "Cultura de paz é uma forma de pensar e praticar relações sociais baseada no diálogo, no respeito, nos direitos humanos e na transformação não violenta dos conflitos. Ela não significa apenas ausência de guerra, mas também enfrentamento das violências, das desigualdades e das injustiças que impedem uma convivência digna.";
  }

  if (terms.has("positiva") || terms.has("negativa") || terms.has("galtung")) {
    return "Paz negativa é a ausência de violência direta, como guerra, agressão ou confronto armado. Paz positiva é mais ampla: envolve criar condições de justiça, dignidade, igualdade e participação, enfrentando violências estruturais e culturais. Em resumo, paz negativa é parar a violência visível; paz positiva é transformar as causas que produzem violência.";
  }

  if (terms.has("educacao") || terms.has("educativa") || terms.has("pedagogica")) {
    return "A educação para a paz forma pessoas capazes de dialogar, reconhecer conflitos, respeitar direitos humanos e transformar situações de violência. Ela não ensina apenas convivência harmoniosa; também desenvolve pensamento crítico sobre desigualdades, injustiças e formas de violência presentes na sociedade.";
  }

  if (terms.has("direitos") || terms.has("humanos") || terms.has("flores") || terms.has("herrera")) {
    return "Paz e direitos humanos estão ligados porque não existe paz plena onde há exclusão, desigualdade, discriminação ou violação da dignidade. Os direitos humanos ajudam a orientar práticas de justiça, reconhecimento e transformação social, tornando a paz algo concreto no cotidiano.";
  }

  if (terms.has("conflito") || terms.has("conflitos") || terms.has("violencia") || terms.has("violencias")) {
    return "Conflitos fazem parte da vida social e não precisam ser tratados apenas como problemas a eliminar. O ponto central é transformá-los de modo não violento, com diálogo, justiça e reconhecimento das necessidades envolvidas. A violência surge quando o conflito é negado, imposto ou resolvido pela força.";
  }

  return "";
}

function readableSynthesis(question, results) {
  const terms = new Set(tokenize(question));

  if (terms.has("bases") && (terms.has("educacao") || terms.has("paz"))) {
    return "As bases da educação para a paz são uma compreensão crítica da paz, o diálogo, os direitos humanos, a justiça social e a transformação não violenta dos conflitos. A ideia é educar para reconhecer as violências presentes na sociedade e agir para superá-las.";
  }

  if (terms.has("questoes") && terms.has("gerais") && terms.has("paz")) {
    return "De modo geral, a paz deve ser entendida como um processo amplo: não basta ausência de guerra, é preciso enfrentar desigualdades, violências e injustiças. Por isso, educação para a paz envolve pensamento crítico, diálogo e compromisso com direitos humanos.";
  }

  const hasPeaceTheme =
    isPracticalPeaceQuestion(question) ||
    [...terms].some((term) =>
      ["paz", "cultura", "educacao", "conflito", "conflitos", "violencia", "violencias", "direitos", "humanos", "justica", "galtung"].includes(term)
    );

  if (!hasPeaceTheme || !results.length) {
    return "Posso ajudar com temas ligados à paz, cultura de paz, educação para a paz, conflitos, comunicação não violenta, convivência, mediação, bullying, regulação emocional e direitos humanos. Essa pergunta foge um pouco desse foco.";
  }

  return "A ideia central é compreender a paz como uma construção social, não como simples ausência de conflito. Isso envolve diálogo, justiça, direitos humanos, reconhecimento das diferenças e transformação das condições que produzem violência.";
}

export async function createKnowledgeBase() {
  const dataDir = await resolveDataDir();
  const files = await findFiles(dataDir);
  const documents = [];
  const chunks = [];

  for (const filePath of files) {
    try {
      const text = normalizeText(await extractText(filePath));
      if (!text) continue;

      const source = {
        name: path.basename(filePath),
        relativePath: path.relative(process.cwd(), filePath),
        characters: text.length
      };

      documents.push({ ...source, chunks: Math.ceil(text.length / (CHUNK_SIZE - CHUNK_OVERLAP)) });
      chunks.push(...splitIntoChunks(text, source));
    } catch (error) {
      console.warn(`Falha ao processar ${filePath}:`, error.message);
    }
  }

  if (QA_DATABASE.length) {
    documents.push({
      name: `Banco de Perguntas e Respostas (${QA_DATABASE.length} itens)`,
      relativePath: "server/data/qaDatabase.json",
      characters: QA_DATABASE.reduce((sum, e) => sum + e.pergunta.length + e.resposta.length, 0),
      chunks: QA_DATABASE.length
    });
    chunks.push(...buildQaChunks(QA_DATABASE));
  }

  if (!chunks.length) {
    throw new Error("Nenhum conteúdo legível foi encontrado na base OBPAZ.");
  }

  const documentFrequency = new Map();
  chunks.forEach((chunk) => {
    new Set(chunk.tokens).forEach((token) => {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    });
  });

  function search(question, limit = 5) {
    const queryTerms = new Set(tokenize(question));
    if (!queryTerms.size) return { results: [], score: 0, queryTerms };

    const scored = chunks
      .map((chunk) => {
        let score = 0;
        queryTerms.forEach((term) => {
          const count = chunk.termCounts.get(term) || 0;
          if (!count) return;
          const idf = Math.log((chunks.length + 1) / ((documentFrequency.get(term) || 0) + 1)) + 1;
          score += count * idf;
        });

        const normalizedScore = score / Math.sqrt(chunk.tokens.length || 1);
        return { ...chunk, score: normalizedScore };
      })
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      results: scored,
      score: scored[0]?.score || 0,
      queryTerms
    };
  }

  function buildLocalAnswer(question, results) {
    const queryTerms = new Set(tokenize(question));
    const practicalAnswer = answerPracticalQuestion(question);
    if (practicalAnswer) return practicalAnswer;

    if (!results.length) {
      return "Posso ajudar com temas ligados à paz, cultura de paz, educação para a paz, conflitos, comunicação não violenta, convivência, mediação, bullying, regulação emocional e direitos humanos. Essa pergunta foge um pouco desse foco.";
    }

    const themedAnswer = localTopicAnswer(question);
    if (themedAnswer) return themedAnswer;

    const sentences = sentenceCandidates(results, queryTerms);
    if (!sentences.length) return readableSynthesis(question, results);

    const rawText = sentences.map(({ sentence }) => sentence).join(" ");
    const looksFragmented =
      rawText.includes("*") ||
      rawText.includes("_") ||
      rawText.length < 90 ||
      /Questões|Bases|destacam|concordam/.test(rawText);

    return looksFragmented ? readableSynthesis(question, results) : readableSynthesis(question, results);
  }

  return {
    dataDir,
    documents,
    chunksCount: chunks.length,
    faqCount: FAQ_ENTRIES.length,
    search,
    buildLocalAnswer
  };
}