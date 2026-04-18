const TOPIC_RULES = [
  {
    name: "prevencao",
    terms: ["evitar conflitos", "evitar conflito", "equipe", "comunicacao preventiva", "clima", "regras", "convivencia"],
    answer:
      "Para prevenir conflitos, vale combinar expectativas antes que o problema apareça: regras de convivência, formas de dar feedback, divisão de tarefas e canais para falar de incômodos. Ambientes respeitosos não dependem só de boa intenção; eles precisam de comunicação clara, escuta e limites."
  },
  {
    name: "mediacao",
    terms: ["mediar", "mediador", "mediacao", "facilitar", "duas pessoas", "ajudar duas", "conduzir", "conversa dificil", "neutralidade", "ninguem quer ceder"],
    answer:
      "Para mediar, tente manter neutralidade e organizar a conversa. Combine regras simples: uma pessoa fala por vez, sem insultos, e todos tentam explicar o que precisam. Depois, separe posições de interesses: em vez de perguntar só 'quem está certo?', pergunte 'o que cada um precisa para a situação melhorar?'."
  },
  {
    name: "seguranca e apoio",
    terms: ["bullying", "excluido", "excluida", "ameaca", "ameacado", "ameacada", "agressao", "violencia fisica", "denuncia", "autoridade", "adulto", "pedir ajuda"],
    answer:
      "Peça ajuda quando houver ameaça, agressão, humilhação repetida, medo, perseguição, violência física, assédio ou quando você não consegue resolver com segurança. Procure alguém confiável, como família, professor, coordenação, liderança ou autoridade responsável. Pedir ajuda não é exagero; é uma forma responsável de proteção."
  },
  {
    name: "autoconhecimento",
    terms: ["irritado", "irritada", "raiva", "injusticado", "injusticada", "ansiedade", "ansioso", "ansiosa", "impulsivamente", "gatilho", "emocao", "emocional"],
    answer:
      "Antes de responder, tente fazer uma pausa curta: respire fundo, perceba o que você está sentindo e pergunte a si mesmo o que foi ferido ali: respeito, segurança, reconhecimento ou justiça. Nomear a emoção já reduz a impulsividade. Se a conversa estiver muito intensa, diga algo como: 'Eu quero conversar, mas preciso de alguns minutos para me acalmar e não responder mal.'"
  },
  {
    name: "cnv",
    terms: ["sem magoar", "feedback", "agressivo", "rude", "pedir algo", "cnv", "comunicacao nao violenta", "frase", "assertiva", "empatica"],
    answer:
      "Uma forma segura é usar quatro passos: observe o fato sem acusar, diga como você se sente, explique a necessidade por trás disso e faça um pedido concreto. Por exemplo: 'Quando isso aconteceu, eu me senti desconfortável, porque preciso de respeito na conversa. Podemos falar sobre isso com mais calma?'"
  },
  {
    name: "resolucao de conflitos",
    terms: ["briguei", "briga", "conflito no trabalho", "desculpa", "dialogar", "colega", "resolver um conflito", "ceder"],
    answer:
      "Comece tentando baixar a tensão. Procure a pessoa em um momento mais calmo, reconheça sua parte sem se humilhar e explique o que você sentiu. Uma boa abertura é: 'Eu não gostei de como a situação ficou. Posso te ouvir e também explicar meu lado?' Se a pessoa não quiser dialogar, respeite o limite e tente novamente depois, ou busque mediação se o conflito estiver prejudicando o ambiente."
  },
  {
    name: "convivencia",
    terms: ["pessoas dificeis", "opiniao diferente", "opinioes diferentes", "desrespeita", "desrespeito", "ambiente da sala", "ambiente do trabalho", "respeitar opinioes", "limites saudaveis"],
    answer:
      "Conviver bem não significa concordar com tudo. Significa manter respeito, escuta e limites. Se alguém te desrespeita, tente ser firme sem atacar: 'Eu posso conversar sobre isso, mas não aceito ser tratado desse jeito.' Para melhorar um ambiente, comece por pequenas combinações: ouvir sem interromper, evitar humilhações, dividir responsabilidades e resolver incômodos antes que virem briga."
  },
  {
    name: "pratica da paz",
    terms: ["praticar", "atitudes simples", "incentivar a paz", "cooperação", "solidariedade", "cotidiano"],
    answer:
      "Cultura de paz aparece em atitudes pequenas e repetidas: ouvir antes de responder, não humilhar, reconhecer erros, pedir desculpas, incluir quem está isolado, discordar sem atacar e procurar soluções justas. Paz não é passividade; é agir para que as relações sejam mais respeitosas e menos violentas."
  },
  {
    name: "reflexao etica",
    terms: ["por que as pessoas entram em conflito", "por que existem conflitos", "e possivel evitar todas as brigas", "evitar todas as brigas", "justica em um conflito", "o que e justica em um conflito"],
    answer:
      "Conflitos surgem porque pessoas têm necessidades, valores, medos e interesses diferentes. O objetivo não é eliminar todos os conflitos, e sim evitar que eles virem violência. Justiça em um conflito envolve ouvir os lados, reconhecer danos, reparar o que for possível e buscar uma solução que respeite a dignidade das pessoas envolvidas."
  },
  {
    name: "simulacao",
    terms: ["simule", "simular", "responder alguem", "ofendeu", "o que eu poderia dizer", "roleplay", "treinar", "simule uma conversa"],
    answer:
      "Posso te ajudar a montar uma resposta. Um modelo seguro é: 'Eu não gostei do jeito que você falou comigo. Quero resolver isso, mas preciso que a conversa seja com respeito.' Se você me contar a situação e o que a pessoa disse, eu posso sugerir uma resposta mais natural para o seu caso."
  },
  {
    name: "apoio emocional",
    terms: ["sozinho", "sozinha", "ninguem me entende", "frustracao", "triste", "cansado", "cansada", "desanimado", "desanimada"],
    answer:
      "Sinto muito que você esteja passando por isso. Quando a gente se sente sozinho ou frustrado, o primeiro passo é não carregar tudo em silêncio. Tente falar com alguém confiável e fazer algo pequeno para se estabilizar agora: beber água, respirar devagar, sair um pouco do ambiente ou escrever o que está sentindo. Se esse sofrimento estiver intenso ou persistente, buscar apoio profissional ou de alguém responsável é importante."
  },
  {
    name: "educacao formativa",
    terms: ["explique de forma simples", "principios da onu", "agressividade e assertividade", "resumo para estudo"],
    answer:
      "De forma simples, cultura de paz é aprender a conviver com respeito, resolver conflitos pelo diálogo e defender a dignidade das pessoas. Agressividade é impor ou atacar; passividade é engolir tudo; assertividade é falar com firmeza e respeito. A cultura de paz procura fortalecer essa postura assertiva e cooperativa."
  }
];

const CRISIS_TERMS = ["suicidio", "suicidar", "me matar", "tirar minha vida", "automutilacao", "me cortar"];

export function normalizeForGuidance(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isPracticalPeaceQuestion(question) {
  const normalized = normalizeForGuidance(question);
  return TOPIC_RULES.some((rule) => rule.terms.some((term) => normalized.includes(normalizeForGuidance(term))));
}

export function hasPeaceScopeTerm(question) {
  const normalized = normalizeForGuidance(question);
  const terms = [
    "paz",
    "cultura de paz",
    "cultura da paz",
    "educacao para a paz",
    "direitos humanos",
    "conflito",
    "conflitos",
    "violencia",
    "violencias",
    "justica",
    "bullying",
    "mediacao",
    "dialogo",
    "respeito",
    "convivencia",
    "cnv",
    "comunicacao nao violenta",
    "galtung",
    "herrera",
    "flores",
    "jares",
    "rayo",
    "onu"
  ];

  return terms.some((term) => normalized.includes(normalizeForGuidance(term)));
}

export function answerPracticalQuestion(question) {
  const normalized = normalizeForGuidance(question);

  if (CRISIS_TERMS.some((term) => normalized.includes(term))) {
    return "Sinto muito que você esteja sentindo isso. Você não precisa lidar com isso sozinho. Procure agora uma pessoa de confiança e, se houver risco imediato, ligue para o serviço de emergência da sua região. No Brasil, o CVV atende pelo 188, 24 horas. Eu posso ficar aqui para te ajudar a pensar no próximo passo seguro, mas apoio humano imediato é o mais importante.";
  }

  const matchedRule = TOPIC_RULES.find((rule) =>
    rule.terms.some((term) => normalized.includes(normalizeForGuidance(term)))
  );

  return matchedRule?.answer || "";
}

export const PRACTICAL_SCOPE_DESCRIPTION =
  "autoconhecimento, regulacao emocional, comunicacao nao violenta, resolucao de conflitos, convivencia, bullying, violencia, cultura da paz na pratica, mediacao, reflexoes eticas, simulacoes de conversa, apoio emocional leve, educacao formativa e prevencao de conflitos";
