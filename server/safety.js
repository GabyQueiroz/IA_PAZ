// Camada de segurança determinística: situações de risco recebem respostas fixas e revisadas,
// sem depender do modelo de linguagem. Os contatos são serviços públicos do Brasil.
import { normalize } from "./text.js";

const RULES = [
  {
    type: "autolesao",
    terms: [
      "suicid", "me matar", "quero morrer", "vontade de morrer", "tirar minha vida", "tirar a minha vida",
      "me cortar", "me corto", "automutila", "nao quero mais viver", "acabar com a minha vida", "sumir para sempre",
      "quero sumir", "queria sumir", "queria morrer", "queria nao existir", "nao aguento mais viver", "melhor sem mim"
    ],
    exclude: ["de rir", "de vergonha", "de fome", "de sono", "de saudade", "vai me matar", "vao me matar"]
  },
  {
    type: "abuso",
    terms: [
      "me bate", "me bateu", "apanho", "apanhei", "me machuca", "me machucou", "abuso", "abusou", "tocou nas minhas partes",
      "mexeu nas minhas partes", "tocou no meu corpo", "segredo com um adulto", "me ameaca em casa", "me espanca"
    ],
    exclude: []
  },
  {
    type: "perigo",
    terms: ["arma na escola", "levar uma arma", "vai atirar", "ataque na escola", "ataque a escola", "massacre", "ameacou matar", "ameacando matar", "faca na escola"],
    exclude: []
  }
];

export function detectRisk(message) {
  const text = normalize(message);
  for (const rule of RULES) {
    if (rule.terms.some((term) => text.includes(term)) && !rule.exclude.some((term) => text.includes(term))) {
      return rule.type;
    }
  }
  return null;
}

const RESPONSES = {
  autolesao: {
    crianca:
      "Obrigado por me contar isso. O que você está sentindo é muito importante e você não precisa passar por isso sozinho. 💛\n\nAgora mesmo, procure um adulto de confiança — sua mãe, seu pai, alguém da família, sua professora ou a coordenação da escola — e conte para essa pessoa o que você me contou.\n\nVocê também pode ligar de graça para o 188 (CVV). Lá tem gente boa para conversar com você a qualquer hora.\n\nSe alguém estiver em perigo agora, peça para um adulto ligar para o 192 (SAMU).",
    adolescente:
      "Sinto muito que você esteja passando por isso. O que você sente é importante e você não precisa enfrentar sozinho.\n\nPor favor, fale agora com alguém de confiança: família, um professor, a coordenação ou um amigo que possa ficar com você.\n\nVocê pode ligar ou conversar com o CVV pelo 188 (gratuito, 24 horas) ou pelo chat em cvv.org.br. Se houver risco imediato, ligue 192 (SAMU) ou vá a um pronto-socorro.",
    adulto:
      "Sinto muito que você esteja passando por isso. Você não precisa lidar com isso sozinho.\n\nProcure agora uma pessoa de confiança e, se houver risco imediato, ligue 192 (SAMU) ou vá ao pronto-socorro mais próximo. O CVV atende gratuitamente pelo 188, 24 horas, e também por chat em cvv.org.br.\n\nSe preferir, posso ficar aqui e te ajudar a pensar no próximo passo seguro."
  },
  abuso: {
    crianca:
      "Obrigado por confiar em mim e me contar. 💛 Nada disso é culpa sua. Ninguém pode machucar você nem tocar no seu corpo de um jeito que te deixe com medo ou desconfortável.\n\nConte agora para um adulto em quem você confia: sua professora, a diretora, a coordenação da escola, um tio, uma avó...\n\nVocê ou esse adulto podem ligar de graça para o Disque 100. Se for perigo agora, o número é 190.",
    adolescente:
      "Obrigado por contar. Nada disso é culpa sua e você merece estar em segurança.\n\nProcure um adulto de confiança (alguém da família, professor, coordenação, orientação escolar) e conte o que está acontecendo. Você pode denunciar pelo Disque 100 (gratuito, pode ser anônimo) ou procurar o Conselho Tutelar da sua cidade. Em perigo imediato, ligue 190.",
    adulto:
      "Situações de violência ou abuso precisam de proteção imediata. Em perigo agora, ligue 190. Violações contra crianças e adolescentes podem ser denunciadas pelo Disque 100 (gratuito, pode ser anônimo) e ao Conselho Tutelar. Na escola, comunique a direção e siga o protocolo de proteção. Violência contra a mulher: Ligue 180."
  },
  perigo: {
    crianca:
      "Isso é sério e precisa de um adulto agora. Vá até sua professora, a diretora ou outro adulto da escola e conte exatamente o que você ouviu ou viu. Se for perigo agora, um adulto deve ligar 190. Você fez certo em falar. 💛",
    adolescente:
      "Isso é sério. Avise agora a direção ou a coordenação da escola, ou um adulto de confiança, contando o que você viu ou ouviu. Se houver perigo imediato, ligue 190. Contar não é \"dedurar\": é proteger pessoas.",
    adulto:
      "Ameaças de violência devem ser levadas a sério. Se houver perigo imediato, ligue 190. Informe a direção da escola, preserve registros (mensagens, prints) e acione os órgãos de segurança e o Conselho Tutelar quando envolver estudantes."
  }
};

export function riskResponse(type, audience) {
  const byAudience = RESPONSES[type];
  return byAudience?.[audience] || byAudience?.adulto || "";
}
