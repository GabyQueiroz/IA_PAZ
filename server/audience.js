// Identificação do público: criança, adolescente ou adulto.
// Combina (1) a escolha feita na tela, (2) sinais explícitos na mensagem (idade, ano escolar)
// e (3) a estimativa do modelo de linguagem, quando disponível.
import { normalize } from "./text.js";

export const AUDIENCES = ["crianca", "adolescente", "adulto"];

const NUMBER_WORDS = {
  cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14,
  quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18
};
const ORDINAL_WORDS = {
  primeiro: 1, segundo: 2, terceiro: 3, quarto: 4, quinto: 5, sexto: 6, setimo: 7, oitavo: 8, nono: 9
};

function audienceFromAge(age) {
  if (!Number.isFinite(age) || age < 3 || age > 110) return null;
  if (age <= 11) return "crianca";
  if (age <= 17) return "adolescente";
  return "adulto";
}

function extractAge(text) {
  const digits = text.match(/\b(?:tenho|eu tenho|faco|vou fazer|fiz)\s+(\d{1,2})\s*anos?\b/) || text.match(/\b(\d{1,2})\s*anos?\s+de\s+idade\b/);
  if (digits) return Number(digits[1]);
  const words = text.match(/\b(?:tenho|eu tenho|faco|fiz)\s+([a-z]+)\s+anos?\b/);
  if (words && NUMBER_WORDS[words[1]]) return NUMBER_WORDS[words[1]];
  return null;
}

function extractGrade(text) {
  // "estou no 3º ano", "sou do quarto ano", "5 ano"
  const match =
    text.match(/\b(?:no|do|na|da)\s+(\d)\s*(?:º|o|°)?\s*ano\b/) ||
    text.match(/\b(?:no|do)\s+(primeiro|segundo|terceiro|quarto|quinto|sexto|setimo|oitavo|nono)\s+ano\b/);
  if (!match) return null;
  const grade = Number(match[1]) || ORDINAL_WORDS[match[1]];
  if (!grade) return null;
  if (/ensino medio|\bem\b/.test(text)) return "adolescente";
  return grade <= 5 ? "crianca" : "adolescente";
}

const ADULT_SIGNALS = [
  "meus alunos", "minhas alunas", "minha turma", "sou professor", "sou professora", "sou educador", "sou educadora",
  "sou pedagog", "sou coordenador", "sou coordenadora", "sou diretor", "sou diretora", "meu filho", "minha filha",
  "plano de aula", "planejamento", "bncc", "dissertacao", "tese", "artigo cientifico", "pesquisa academica",
  "graduacao", "faculdade", "universidade", "mestrado", "doutorado", "no meu trabalho", "meu chefe"
];
const CHILD_SIGNALS = [
  "minha mae", "mamae", "papai", "meu pai", "minha professora", "a tia", "minha tia da escola", "recreio", "parquinho",
  "brinquedo", "brincar", "brincadeira", "coleguinha", "amiguinho", "amiguinha", "boneca", "lanche", "figurinha",
  "desenho animado", "pega-pega", "esconde-esconde", "dever de casa", "minha vo", "meu vo", "historinha"
];
const TEEN_SIGNALS = ["ensino medio", "crush", "meus pais nao", "vestibular", "enem", "grupo do zap", "rede social", "instagram", "tiktok"];

/** Sinais encontrados apenas no texto do usuário. */
export function detectAudienceHeuristic(message) {
  const text = normalize(message);

  const age = extractAge(text);
  const byAge = audienceFromAge(age);
  if (byAge) return { audience: byAge, strength: "explicit", reason: `idade informada (${age} anos)` };

  if (ADULT_SIGNALS.some((signal) => text.includes(signal))) {
    return { audience: "adulto", strength: "strong", reason: "fala de educador/adulto" };
  }

  const byGrade = extractGrade(text);
  if (byGrade) return { audience: byGrade, strength: "strong", reason: "ano escolar informado" };

  const childHits = CHILD_SIGNALS.filter((signal) => text.includes(signal)).length;
  const teenHits = TEEN_SIGNALS.filter((signal) => text.includes(signal)).length;
  if (childHits >= 2) return { audience: "crianca", strength: "strong", reason: "vocabulário infantil" };
  if (childHits === 1) return { audience: "crianca", strength: "weak", reason: "vocabulário infantil" };
  if (teenHits >= 1) return { audience: "adolescente", strength: "weak", reason: "vocabulário adolescente" };
  return { audience: null, strength: "none", reason: "" };
}

/**
 * Decide o público final.
 * - Idade/ano explícitos na mensagem sempre vencem.
 * - Depois vale a escolha feita na interface (perfil salvo).
 * - Sem escolha: sinais fortes, depois o palpite do modelo, depois sinais fracos.
 */
export function resolveAudience({ selected, heuristic, llmGuess }) {
  const chosen = AUDIENCES.includes(selected) ? selected : null;

  if (heuristic.strength === "explicit") {
    return { audience: heuristic.audience, detected: heuristic.audience !== chosen, reason: heuristic.reason };
  }
  if (chosen) return { audience: chosen, detected: false, reason: "perfil escolhido" };
  if (heuristic.strength === "strong") return { audience: heuristic.audience, detected: true, reason: heuristic.reason };
  if (llmGuess && AUDIENCES.includes(llmGuess.audience) && llmGuess.confidence >= 0.7) {
    return { audience: llmGuess.audience, detected: true, reason: "jeito de escrever" };
  }
  if (heuristic.strength === "weak") return { audience: heuristic.audience, detected: true, reason: heuristic.reason };
  return { audience: "adulto", detected: false, reason: "padrão" };
}
