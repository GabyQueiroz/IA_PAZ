import { SCENES } from "./kidContent.js";

export const SCOPE_TOPICS =
  "paz, cultura de paz, educação para a paz, estudos para a paz (Galtung, Herrera Flores, paz suleada), conflitos e como resolvê-los, violência e bullying, direitos humanos, convivência e respeito às diferenças, comunicação não violenta, mediação, emoções (raiva, tristeza, solidão), apoio emocional leve e o próprio projeto: o NEP/UEPG (Núcleo de Educação para a Paz), o OBPAZ, sua equipe, objetivos, metodologia, documentos e ações";

// ---------------------------------------------------------------------------
// 1) Reescrita da pergunta (só quando há histórico, para resolver "e ele?", "explica melhor").
// ---------------------------------------------------------------------------
export const REWRITE_SCHEMA = {
  name: "reescrita",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      standalone_question: { type: "string", description: "pergunta completa e autônoma" },
      search_queries: { type: "array", items: { type: "string" }, description: "1 a 3 consultas curtas com os conceitos-chave" }
    },
    required: ["standalone_question", "search_queries"]
  }
};

export function rewriteMessages({ message, history }) {
  const historyText = history.map((item) => `${item.role === "user" ? "Usuário" : "Assistente"}: ${item.content}`).join("\n");
  return [
    {
      role: "system",
      content: `Você prepara buscas num acervo sobre cultura de paz (FAQ prática, resumos acadêmicos sobre Galtung, Herrera Flores, paz suleada, educação para a paz e conflitos, páginas e documentos do NEP/UEPG e artigos da Wikipédia).
1. standalone_question: reescreva a última mensagem como pergunta completa e autônoma, usando o histórico só para resolver referências (ex.: "e ele?" -> "Quem foi Johan Galtung?"). Não responda.
2. search_queries: 2 ou 3 consultas curtas em português formal, trocando gírias e palavras de criança pelos termos que aparecem no acervo e acrescentando sinônimos. Exemplos: "estão me zoando" -> "bullying humilhação escola"; "fiquei bravo com meu irmão" -> "raiva controlar emoção conflito"; "o que é paz de verdade" -> "paz positiva paz negativa definição".
Perguntas sobre o projeto usam os termos das páginas do NEP/UEPG: "quem coordena o NEP" -> "NEP equipe coordenador"; "como participar" -> "NEP quem somos participação voluntário"; "o que o NEP faz" -> "NEP objetivos metodologia"; "com quem o NEP trabalha" -> "NEP parceiros parcerias".`
    },
    { role: "user", content: `Histórico:\n${historyText || "(sem histórico)"}\n\nÚltima mensagem: ${message}` }
  ];
}

// ---------------------------------------------------------------------------
// 2) Resposta fundamentada nos trechos recuperados.
// ---------------------------------------------------------------------------
export function answerSchema() {
  return {
    name: "resposta_cultura_de_paz",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        intent: {
          type: "string",
          enum: ["saudacao", "conceito", "pratica", "emocional", "fora_do_escopo"],
          description: "tipo da mensagem"
        },
        risk: {
          type: "string",
          enum: ["nenhum", "autolesao", "abuso", "perigo"],
          description: "situação de risco relatada"
        },
        grounded: { type: "boolean", description: "true se os trechos sustentam a resposta" },
        used_passages: { type: "array", items: { type: "integer" }, description: "números dos trechos usados" },
        answer: { type: "string", description: "a resposta" },
        story: {
          type: "object",
          additionalProperties: false,
          description: "historinha (só para criança; senão título vazio e lista vazia)",
          properties: {
            title: { type: "string", description: "título da historinha" },
            panels: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  scene: { type: "string", enum: Object.keys(SCENES) },
                  caption: { type: "string", description: "1 ou 2 frases curtas" }
                },
                required: ["scene", "caption"]
              }
            }
          },
          required: ["title", "panels"]
        },
        tip: { type: "string", description: "dica prática curta ou vazio" },
        question_back: { type: "string", description: "pergunta de reflexão ou vazio" }
      },
      required: ["intent", "risk", "grounded", "used_passages", "answer", "story", "tip", "question_back"]
    }
  };
}

const GROUNDING_RULES = `REGRAS CONTRA INVENÇÃO (obrigatórias):
1. Fatos, conceitos, autores, obras, datas, instituições, números e citações: use SOMENTE o que está nos TRECHOS. Nunca invente nem complete com conhecimento próprio. Se um nome ou dado não aparece nos trechos, não o mencione.
2. Se os trechos não respondem a pergunta: grounded=false; diga com honestidade e gentileza algo como "Não tenho essa informação no meu material" (nunca fale em "trechos" ou "documentos fornecidos") e sugira 2 ou 3 temas próximos que você pode explicar.
3. Perguntas práticas do dia a dia (brigas, raiva, bullying, amizade, convivência, sentimentos): use os trechos de orientação e adapte-os à situação contada, sem acrescentar fatos novos. Nesses casos grounded=true quando houver orientação relacionada nos trechos.
4. Não diga "segundo o trecho", "no documento", "no material fornecido" nem cite números de trechos no texto. Liste em used_passages os números dos trechos realmente usados.
5. Violência, abuso, ideia de se machucar ou ameaça: marque risk e oriente a procurar um adulto de confiança. Você não substitui terapia, atendimento médico, jurídico ou policial.
6. intent=fora_do_escopo para assuntos sem relação com o escopo (matemática, futebol, receitas, fazer a tarefa pelo aluno etc.). Conversas sobre amizade, convivência e sentimentos ESTÃO no escopo.
7. Não julgue a pessoa; estimule reflexão e diálogo.
8. Prioridade das fontes: o site oficial do NEP/UEPG é a referência principal (sobre o projeto, equipe, objetivos, documentos e a visão de cultura de paz do NEP); depois o material OBPAZ; a Wikipédia é complementar. Se houver divergência, siga o NEP.
9. Você se chama Olive e é a guia do NEP/OBPAZ. Perguntas sobre o projeto (quem somos, equipe, objetivos, como participar) são respondidas com as páginas do NEP.`;

const sceneList = Object.entries(SCENES)
  .map(([id, description]) => `${id} (${description})`)
  .join("; ");

const AUDIENCE_STYLE = {
  crianca: `PÚBLICO: CRIANÇA de 6 a 11 anos.
- answer: 2 a 4 frases curtas, palavras simples do dia a dia, tom carinhoso. Sem termos acadêmicos (se precisar de um, explique com comparação simples). No máximo 2 emojis.
- story: historinha em 2 ou 3 quadrinhos com Lia, Davi, Tom, Maya ou a professora Rosa (sempre "a professora Rosa"), na escola, no recreio ou em casa, mostrando a ideia na prática. Para cada quadrinho escolha a cena que combina com a legenda. Cenas: ${sceneList}.
- tip: uma dica curta que a criança consegue fazer hoje.
- question_back: uma pergunta simples para a criança pensar na vida dela.
- Se não souber (grounded=false): diga com carinho que ainda não sabe isso e sugira perguntar a um adulto; story com lista vazia.`,
  adolescente: `PÚBLICO: ADOLESCENTE de 12 a 17 anos.
- answer: linguagem direta e respeitosa, sem infantilizar, com 1 exemplo concreto da escola ou das redes sociais. 1 a 3 parágrafos curtos.
- story: título vazio e lista vazia. tip: uma ação prática curta. question_back: uma pergunta de reflexão.`,
  adulto: `PÚBLICO: ADULTO ou EDUCADOR.
- answer: português claro e preciso, 1 a 4 parágrafos curtos; pode usar listas com "- ". Use os conceitos acadêmicos dos trechos. Para educadores, quando fizer sentido, sugira como trabalhar o tema em sala, sem inventar referências.
- story: título vazio e lista vazia. tip: vazio ou sugestão prática curta. question_back: vazio.`
};

export function answerMessages({ question, originalMessage, history, passages, audience }) {
  const context = passages.length
    ? passages.map((passage, index) => `[${index + 1}] (${passage.source.title}${passage.source.origin ? ` — ${passage.source.origin}` : ""})\n${passage.content.slice(0, 900)}`).join("\n\n")
    : "(nenhum trecho relevante foi encontrado)";
  const historyText = history.length
    ? history
        .slice(-4)
        .map((item) => `${item.role === "user" ? "Usuário" : "Assistente"}: ${item.content.slice(0, 400)}`)
        .join("\n")
    : "(início da conversa)";
  const interpreted = question && question !== originalMessage ? `\nPERGUNTA INTERPRETADA: ${question}` : "";

  return [
    {
      role: "system",
      content: `Você é a Olive, guia do OBPAZ / NEP-UEPG (Núcleo de Educação para a Paz da Universidade Estadual de Ponta Grossa), assistente educativa brasileira sobre cultura de paz usada em escolas. Responda em português do Brasil, com acolhimento.
Escopo: ${SCOPE_TOPICS}.

${GROUNDING_RULES}

${AUDIENCE_STYLE[audience] || AUDIENCE_STYLE.adulto}`
    },
    {
      role: "user",
      content: `TRECHOS DO MATERIAL (única fonte de fatos):
${context}

CONVERSA ANTERIOR:
${historyText}

MENSAGEM DO USUÁRIO: ${originalMessage}${interpreted}`
    }
  ];
}
