// Utilidades de texto compartilhadas (normalização, tokenização e stemming leve em português).

const STOPWORDS = new Set(
  `a ao aos as ate com como da das de do dos e ela elas ele eles em entre era essa esse esta este eu foi ha isso
   ja la lhe mais mas me meu minha muito na nas nem no nos o os ou para pela pelas pelo pelos por porque qual quais
   quando que quem se sem ser seu sua suas seus so sobre tambem te tem tu um uma uns umas voce voces vai sao estao esta
   pra pro fazer faz posso pode isso aquilo aqui ali entao tipo coisa coisas estou fiquei fico ficou muito muita
   ainda agora hoje sempre todo toda dia vez vezes quanto quantos quanta
   y el en una un del las los lo con por para es`
    .split(/\s+/)
    .filter(Boolean)
);

export function stripAccents(value) {
  return String(value).normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalize(value) {
  return stripAccents(String(value).toLowerCase());
}

// Stemming leve: reduz plurais e algumas terminações comuns para aproximar variações
// ("conflitos" -> "conflit", "violências" -> "violenc", "educação" -> "educa").
export function stem(token) {
  let t = token;
  if (t.length <= 4) return t;
  const rules = [
    [/coes$/, "c"],
    [/cao$/, "c"],
    [/soes$/, "s"],
    [/sao$/, "s"],
    [/mente$/, ""],
    [/(dor|dora|dores|doras)$/, ""], // coordenador -> coorden(a), educador -> educa
    [/idades?$/, "idad"],
    [/encias?$/, "enc"],
    [/ancias?$/, "anc"],
    [/ivos?$/, "iv"],
    [/ivas?$/, "iv"],
    [/ais$/, "al"],
    [/eis$/, "el"],
    [/oes$/, "a"],
    [/aes$/, "a"],
    [/ns$/, "m"],
    [/s$/, ""]
  ];
  for (const [pattern, replacement] of rules) {
    if (pattern.test(t)) {
      t = t.replace(pattern, replacement);
      break;
    }
  }
  return t.replace(/[aeo]$/, "");
}

// Gírias e expressões do dia a dia -> termos usados no material.
const EXPANSIONS = [
  [/\b(zo[ae]\w*|zuei\w*|zuan\w*|zuar|tira\w* sarro|tirando onda|caçoa\w*|cacoa\w*|me humilh\w*|rindo|riem|riram|me xing\w*|apelid\w*)\b/g, " bullying humilhação "],
  [/\b(grosso|grossa|grosseir\w*|estupid\w*|mal educad\w*)\b/g, " rude desrespeito "],
  [/\b(treta|tretas|barraco|discuti\w*|bati|bateu|empurr\w*|brigou|brigamos)\b/g, " briga conflito "],
  [/\b(nervos\w*|estressad\w*|bolad\w*|bravo|brava|zangad\w*|furios\w*)\b/g, " raiva irritado "],
  [/\b(deprê|depre|tristinho|tristinha|chorando|chorei)\b/g, " triste sozinho "],
  [/\b(excluid\w*|me deixam de fora|ninguem me chama)\b/g, " excluído exclusão "]
];

export function tokenize(text) {
  let prepared = normalize(text);
  for (const [pattern, replacement] of EXPANSIONS) prepared = prepared.replace(pattern, (match) => `${match} ${normalize(replacement)}`);
  return prepared
    // "fazer as pazes" = reconciliar-se (não confundir com o conceito de "paz")
    .replace(/\b(as\s+)?pazes\b/g, " reconciliar ")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
    .map(stem)
    .filter((token) => token.length > 1);
}

export function cleanExtractedText(text) {
  return String(text)
    .replace(/\r/g, "\n")
    .replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gim, "") // marcadores de página do pdf-parse
    .replace(/­/g, "") // hífen invisível
    .replace(/(\p{L})-\n(\p{L})/gu, "$1$2") // palavras quebradas no fim da linha
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitSentences(text) {
  return String(text)
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…:])\s+(?=[\p{Lu}"“(➢•\d])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function includesAny(normalizedText, terms) {
  return terms.some((term) => normalizedText.includes(term));
}
