// Filtro de conteúdo: bloqueia pedidos impróprios e descarta textos externos inadequados para escola.
// Obs.: xingamentos NÃO são bloqueados — uma criança relatando "me chamaram de ..." está pedindo ajuda
// sobre bullying/racismo, e isso deve ser acolhido pela resposta normal.
import { normalize } from "./text.js";

// Conteúdo sexual explícito, compra/fabricação de drogas e armas, métodos de suicídio e apostas.
const BLOCKED_PATTERNS = [
  /\b(porn\w*|xvideos|onlyfans|nudes?|sexo explicito|putaria|hentai|xxx)\b/,
  /\bcomo (fazer|fabricar|montar|comprar|conseguir) (uma |um )?(bomba|arma\w*|explosiv\w*|droga\w*|cocaina|crack|maconha|metanfetamina)\b/,
  /\b(comprar|vender) (droga\w*|arma\w*|cocaina|maconha|crack)\b/,
  /\b(como (me )?(matar|suicidar)|metodos? de suicidio|como se cortar)\b/,
  /\b(caca[- ]?niquel|apostas? online|bets? (online|esportiva))\b/
];

export function checkUserMessage(message) {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(normalize(message))) ? "blocked" : "ok";
}

/** Texto externo (sites, Wikipédia): descarta se tiver conteúdo impróprio. */
export function isSafeExternalText(text) {
  const normalized = normalize(text);
  return !BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Remove de um texto externo apenas as frases com termos impróprios
 * (ex.: um artigo sobre direitos da criança que cita "pornografia infantil" ao falar de proteção).
 */
export function sanitizeExternalText(text) {
  return String(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((sentence) => isSafeExternalText(sentence))
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export const BLOCKED_RESPONSE = {
  crianca:
    "Esse assunto não é para conversarmos aqui. 💛 Se alguém te mostrou algo que te deixou desconfortável ou com medo, conte para um adulto de confiança. Quer conversar sobre amizade, sentimentos ou como resolver brigas?",
  adolescente:
    "Não posso ajudar com esse tipo de conteúdo. Se você está passando por alguma situação difícil ou de risco, procure um adulto de confiança. Posso conversar sobre conflitos, respeito, emoções e cultura de paz.",
  adulto:
    "Não posso ajudar com esse tipo de conteúdo neste ambiente educativo. Posso ajudar com cultura de paz, educação para a paz, conflitos, direitos humanos e o trabalho do NEP/UEPG."
};
