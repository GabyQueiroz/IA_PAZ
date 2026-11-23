// Orquestra o atendimento: segurança -> público -> (reescrita) -> busca híbrida -> resposta fundamentada.
import { createLLM } from "./llm.js";
import { config } from "./config.js";
import { loadCorpus } from "./ingest.js";
import { createEmbeddingProvider, embedChunks } from "./embeddings.js";
import { createRetriever } from "./retriever.js";
import { detectAudienceHeuristic, resolveAudience } from "./audience.js";
import { detectRisk, riskResponse } from "./safety.js";
import { KID_ENTRIES, SCENES } from "./kidContent.js";
import { REWRITE_SCHEMA, rewriteMessages, answerMessages, answerSchema, SCOPE_TOPICS } from "./prompts.js";
import { normalize, splitSentences, tokenize } from "./text.js";
import { searchWikipedia } from "./webSearch.js";
import { searchTrustedSites, trustedLinksCount } from "./trustedSites.js";
import { checkUserMessage, BLOCKED_RESPONSE } from "./contentFilter.js";

const GREETING = /^(oi+|ola|ol[aá]|oie|eai|e ai|bom dia|boa tarde|boa noite|tudo bem|hello|hi|obrigad[oa]|valeu|tchau)\b/;

const FIXED = {
  greeting: {
    crianca: "Oi! 😊 Eu sou a Olive, uma amiga que adora conversar sobre paz, amizade e como resolver brigas sem machucar ninguém. Sobre o que você quer conversar?",
    adolescente: "Oi! Sou a Olive, do NEP/UEPG. Posso conversar sobre conflitos, respeito, bullying, emoções, direitos humanos e cultura de paz. O que você quer saber?",
    adulto: "Olá! Sou a Olive, assistente do NEP/UEPG sobre cultura de paz, educação para a paz, conflitos e direitos humanos. Como posso ajudar?"
  },
  outOfScope: {
    crianca: "Hmm, sobre isso eu não sei falar. 🙈 Eu sou especialista em paz, amizade, sentimentos e em como resolver brigas. Quer me perguntar algo sobre isso? Por exemplo: \"Como fazer as pazes com um amigo?\"",
    adolescente: `Esse assunto foge do que eu sei. Posso ajudar com: ${SCOPE_TOPICS}.`,
    adulto: `Essa pergunta está fora do meu escopo. Posso ajudar com: ${SCOPE_TOPICS}.`
  },
  related: {
    crianca: "Não sei exatamente isso, mas sei uma coisa parecida:",
    adolescente: "Não encontrei exatamente isso no meu material, mas isto pode ajudar:",
    adulto: "Não encontrei exatamente essa informação no material do OBPAZ. O conteúdo mais próximo é:"
  },
  excerpt: {
    adolescente: "Não tenho uma resposta pronta para isso, mas o material traz este trecho relacionado:",
    adulto: "Não tenho uma resposta pronta para isso; este é o trecho mais relacionado do material:"
  },
  notFound: {
    crianca: "Essa é uma ótima pergunta, mas eu ainda não sei a resposta. 🤔 Que tal perguntar para sua professora? Eu posso te contar sobre paz, amizade, sentimentos e como resolver brigas!",
    adolescente: "Não tenho essa informação no meu material de estudo, então prefiro não arriscar uma resposta. Posso falar sobre cultura de paz, conflitos, bullying, emoções e direitos humanos.",
    adulto: "Não encontrei essa informação no material do NEP/OBPAZ e prefiro não responder sem base. Posso ajudar com cultura de paz, educação para a paz, tipos de violência, Galtung, Herrera Flores, o trabalho do NEP/UEPG e orientações práticas sobre conflitos."
  }
};

function compactHistory(history = []) {
  return history
    .filter((item) => item && ["user", "assistant"].includes(item.role) && item.content)
    .slice(-6)
    .map((item) => ({ role: item.role, content: String(item.content).slice(0, 700) }));
}

// Palavras-chave de uma mensagem (sem palavras comuns), para buscas externas.
function keywordQuery(message) {
  return normalize(message)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 3 && tokenize(word).length)
    .slice(0, 6)
    .join(" ");
}

// Troca espaços/hífens "especiais" que alguns modelos usam por caracteres comuns.
function cleanText(value) {
  return String(value || "")
    .replace(/[   ]/g, " ")
    .replace(/[‐‑]/g, "-")
    .trim();
}

function faqAnswerText(chunk) {
  return chunk.content.replace(/^Pergunta:.*\nResposta:\s*/s, "").trim();
}

function uniqueSources(passages) {
  const seen = new Map();
  passages.forEach((passage) => {
    const key = passage.source.url || passage.source.file;
    if (!seen.has(key)) seen.set(key, { title: passage.source.title, url: passage.source.url || null, origin: passage.source.origin || null });
  });
  return [...seen.values()];
}

// Sobreposição de termos entre a mensagem do usuário e uma pergunta cadastrada.
function questionOverlap(message, question) {
  const query = new Set(tokenize(message));
  const target = new Set(tokenize(question));
  if (!query.size || !target.size) return { score: 0, questionRecall: 0 };
  const intersection = [...query].filter((token) => target.has(token)).length;
  const queryRecall = intersection / query.size; // quanto da mensagem a pergunta cobre
  const questionRecall = intersection / target.size; // quanto da pergunta aparece na mensagem
  const jaccard = intersection / (query.size + target.size - intersection);
  // Casamento direto só quando quase todos os termos do usuário estão na pergunta cadastrada
  // (evita que "paz suleada" case com "O que é paz?").
  return { score: queryRecall >= 0.75 ? jaccard : 0, questionRecall };
}

function bestByQuestion(message, items, getQuestions) {
  let best = null;
  for (const item of items) {
    for (const question of getQuestions(item)) {
      const { score } = questionOverlap(message, question);
      if (!best || score > best.score) best = { item, score };
    }
  }
  return best;
}

function kidEntryPayload(entry) {
  return { answer: entry.answer, story: entry.story, tip: entry.tip, question: entry.question };
}

export async function createChatService() {
  const llm = createLLM();
  const corpus = await loadCorpus();

  let provider = null;
  let vectors = null;
  try {
    provider = await createEmbeddingProvider();
    if (provider) vectors = await embedChunks(provider, corpus.chunks);
  } catch (error) {
    console.warn("Embeddings indisponíveis, usando apenas BM25:", error.message);
    provider = null;
    vectors = null;
  }

  const retriever = createRetriever({ chunks: corpus.chunks, vectors, provider });

  // Índice separado para o conteúdo infantil curado.
  const kidChunks = KID_ENTRIES.map((entry) => ({
    id: `kid-${entry.id}`,
    kind: "faq",
    entry,
    question: entry.questions.join(" | "),
    content: `${entry.questions.join(" ")} ${entry.answer}`,
    embedText: `${entry.questions.join(" ")}\n${entry.answer}`,
    hash: `kid-${entry.id}-${entry.answer.length}-${entry.questions.length}`,
    source: { title: "Conteúdo infantil OBPAZ", file: "kid" }
  }));
  let kidVectors = null;
  if (provider) {
    try {
      kidVectors = await embedChunks(provider, kidChunks);
    } catch {
      kidVectors = null;
    }
  }
  const kidRetriever = createRetriever({ chunks: kidChunks, vectors: kidVectors, provider: kidVectors ? provider : null });

  console.log(
    `Base carregada: ${corpus.documents.length} documentos, ${corpus.chunks.length} trechos. ` +
      `Embeddings: ${provider ? provider.name : "desativados (somente BM25)"}. ` +
      `LLM: ${llm ? `${llm.provider} (${llm.models.join(", ")})` : "desativado (modo básico)"}.`
  );

  // Reescreve a pergunta (resolve referências ao histórico e gera termos de busca com sinônimos).
  // Sem embeddings, roda sempre: é o que dá "noção de significado" à busca por palavras.
  async function rewrite(message, history) {
    if (!llm || (!history.length && vectors)) return null;
    try {
      const { data } = await llm.json({
        messages: rewriteMessages({ message, history }),
        schema: REWRITE_SCHEMA,
        temperature: 0,
        models: config.rewriteModels || config.llmModels
      });
      return data;
    } catch (error) {
      console.warn("Falha ao reescrever a pergunta:", error.message);
      return null;
    }
  }

  const faqChunks = corpus.chunks.filter((chunk) => chunk.kind === "faq");

  async function findKidEntry(queries) {
    const direct = bestByQuestion(queries[0], KID_ENTRIES, (entry) => entry.questions);
    if (direct && direct.score >= 0.5) return direct.item;

    // Frases longas de criança ("fiquei com raiva porque meu irmão..."): a pergunta cadastrada
    // inteira aparece dentro da mensagem. Fica com a que tem mais termos em comum.
    let contained = null;
    for (const entry of KID_ENTRIES) {
      for (const question of entry.questions) {
        const size = new Set(tokenize(question)).size;
        const { questionRecall } = questionOverlap(queries[0], question);
        if (size && questionRecall === 1 && (!contained || size > contained.size)) contained = { entry, size };
      }
    }
    if (contained) return contained.entry;
    const { results } = await kidRetriever.search(queries, 1);
    const top = results[0];
    if (!top) return null;
    const strong = top.coverage >= 0.35 || (kidVectors && top.dense >= 0.87);
    return strong ? top.entry : null;
  }

  // Resposta sem LLM: só devolve texto que existe na base (FAQ, conteúdo infantil ou frases extraídas).
  async function localAnswer({ message, audience, search }) {
    if (audience === "crianca") {
      const entry = await findKidEntry([message]);
      if (entry) return { kind: "answer", grounded: true, ...kidEntryPayload(entry) };
      // sem história curada: segue para a FAQ (resposta continua fundamentada)
    }

    // 1) Pergunta muito parecida com uma pergunta da FAQ: devolve a resposta cadastrada.
    const faq = bestByQuestion(message, faqChunks, (chunk) => [chunk.question]);
    if (faq && faq.score >= 0.5) {
      return { kind: "answer", grounded: true, answer: faqAnswerText(faq.item), sources: uniqueSources([faq.item]) };
    }

    // 1b) Pergunta longa/coloquial: FAQ bem ranqueada pela busca e parecida com a pergunta cadastrada.
    //     Como pode não ser exatamente o que foi perguntado, a resposta é apresentada como "relacionada".
    const topFaqs = search.results.slice(0, 3).filter((chunk) => chunk.kind === "faq");
    const related = topFaqs.find((chunk, index) => {
      const { questionRecall } = questionOverlap(message, chunk.question);
      return questionRecall >= 0.6 || (index === 0 && chunk === search.results[0] && chunk.coverage >= 0.5 && questionRecall >= 0.3);
    });
    if (related) {
      return {
        kind: "related",
        grounded: true,
        answer: `${FIXED.related[audience]}\n\n${faqAnswerText(related)}`,
        sources: uniqueSources([related])
      };
    }

    // 2) Trechos dos textos acadêmicos (só para adolescentes/adultos e com cobertura alta dos termos).
    if (audience === "crianca") return { kind: "not_found", grounded: false, answer: FIXED.notFound[audience] };
    const terms = new Set(tokenize(message));
    const minHits = terms.size >= 2 ? 2 : 1;
    const prose = search.results.filter(
      (chunk) => chunk.kind !== "faq" && chunk.coverage >= 0.75 && !/referenciados|sem nome/i.test(chunk.source.title)
    );
    const picked = prose
      .slice(0, 2)
      .flatMap((chunk) => splitSentences(chunk.content).map((sentence) => ({ sentence, chunk })))
      .map((item, order) => ({ ...item, order, hits: new Set(tokenize(item.sentence).filter((t) => terms.has(t))).size }))
      .filter((item) => item.hits >= minHits && item.sentence.length > 40)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 3)
      .sort((a, b) => a.order - b.order);

    if (!picked.length) return { kind: "not_found", grounded: false, answer: FIXED.notFound[audience] };
    return {
      kind: "related",
      grounded: true,
      answer: `${FIXED.excerpt[audience]}\n\n${picked.map((item) => item.sentence).join(" ")}`,
      sources: uniqueSources(picked.map((item) => item.chunk))
    };
  }

  async function llmAnswer({ message, question, history, passages, audience, kidEntry }) {
    const { data, model } = await llm.json({
      messages: answerMessages({ question, originalMessage: message, history, passages, audience }),
      schema: answerSchema()
    });

    const used = (Array.isArray(data.used_passages) ? data.used_passages : [])
      .map((number) => passages[Number(number) - 1])
      .filter(Boolean);
    const grounded = data.grounded === true || data.grounded === "true";

    let story = null;
    if (audience === "crianca") {
      const panels = (data.story?.panels || []).filter((panel) => SCENES[panel?.scene] && panel.caption).slice(0, 3);
      if (panels.length >= 2) story = { title: String(data.story.title || "Uma historinha"), panels };
      else if (grounded && kidEntry) story = kidEntry.story; // historinha curada do mesmo tema
    }

    return {
      model,
      intent: data.intent,
      risk: data.risk && data.risk !== "nenhum" ? data.risk : null,
      kind: grounded ? "answer" : "not_found",
      grounded,
      answer: cleanText(data.answer),
      story,
      tip: audience === "adulto" ? null : String(data.tip || "").trim() || null,
      question: audience === "adulto" ? null : String(data.question_back || "").trim() || null,
      sources: grounded ? uniqueSources(used) : []
    };
  }

  async function chat({ message, history: rawHistory, profile }) {
    const history = compactHistory(rawHistory);
    const normalized = normalize(message).trim();
    const audienceInfo = resolveAudience({ selected: profile, heuristic: detectAudienceHeuristic(message), llmGuess: null });
    const audience = audienceInfo.audience;
    const meta = {
      audience,
      audienceDetected: audienceInfo.detected,
      audienceReason: audienceInfo.reason,
      mode: llm ? "ia" : "local",
      retrieval: provider ? "hibrida" : "bm25"
    };

    // 1) Risco detectado por regras: resposta fixa imediata, sem passar pelo LLM.
    const ruleRisk = detectRisk(message);
    if (ruleRisk) return { ...meta, kind: "risk", grounded: true, answer: riskResponse(ruleRisk, audience), sources: [] };

    // 1b) Filtro de conteúdo: pedidos impróprios (pornografia, drogas, armas...) recebem resposta fixa.
    if (checkUserMessage(message) === "blocked") {
      return { ...meta, kind: "blocked", grounded: true, answer: BLOCKED_RESPONSE[audience], sources: [] };
    }

    // 2) Saudações curtas.
    if (GREETING.test(normalized) && normalized.length < 30) {
      return { ...meta, kind: "greeting", grounded: true, answer: FIXED.greeting[audience], sources: [] };
    }

    // 3) Busca híbrida com a pergunta original + reescritas (quando há histórico).
    const rewritten = await rewrite(message, history);
    const queries = [message, rewritten?.standalone_question, ...(rewritten?.search_queries || [])];
    const search = await retriever.search(queries, config.topK);

    const finish = (result) => ({
      ...meta,
      ...result,
      sources: config.showSources && audience !== "crianca" ? (result.sources || []).filter((s) => s.title !== "Conteúdo infantil OBPAZ") : []
    });

    if (!llm) return finish(await localAnswer({ message, audience, search }));

    const passages = [...search.results];

    // Base fraca para esta pergunta: complementa com sites educativos confiáveis (Escola Kids,
    // Brasil Escola, Instituto Ayrton Senna) e com a Wikipédia em português — tudo filtrado e com link.
    // Só termos de busca saem do servidor, nunca a mensagem inteira.
    let usedExternal = false;
    async function addExternalSources() {
      usedExternal = true;
      // As palavras da própria pergunta vêm primeiro (mais precisas); os termos da IA complementam.
      const keywords = keywordQuery(message);
      const rewrittenTerms = rewritten?.search_queries || [];
      const [sites, wiki] = await Promise.allSettled([
        searchTrustedSites([keywords, ...rewrittenTerms], audience, 2),
        // Crianças: sem Wikipédia ao vivo (pode trazer temas pesados); ficam com a base curada + Escola Kids.
        audience === "crianca" ? Promise.resolve([]) : searchWikipedia(keywords || rewrittenTerms[0] || "", 2, tokenize(message))
      ]);
      const fromSites = sites.status === "fulfilled" ? sites.value : [];
      const fromWiki = wiki.status === "fulfilled" ? wiki.value.slice(0, fromSites.length ? 1 : 2) : [];
      if (sites.status === "rejected") console.warn("Sites educativos indisponíveis:", sites.reason?.message);
      if (wiki.status === "rejected") console.warn("Busca na Wikipédia indisponível:", wiki.reason?.message);
      const external = [...fromSites, ...fromWiki];
      if (external.length) passages.splice(Math.min(passages.length, 3), passages.length, ...external);
      return external.length > 0;
    }
    if (config.liveWikipedia && search.topCoverage < 0.6) await addExternalSources();

    // Crianças: se o Escola Kids tem uma página sobre o assunto, ela entra (texto feito para essa idade).
    if (audience === "crianca" && !usedExternal) {
      try {
        const kids = (await searchTrustedSites([keywordQuery(message)], "crianca", 1)).filter((p) => p.source.origin === "Escola Kids");
        if (kids.length) passages.splice(Math.min(passages.length, 4), 0, ...kids);
      } catch (error) {
        console.warn("Escola Kids indisponível:", error.message);
      }
    }

    // Para crianças, o conteúdo infantil curado entra como trecho extra (fatos + exemplo de linguagem).
    let kidEntry = null;
    if (audience === "crianca") {
      kidEntry = await findKidEntry(queries);
      if (kidEntry) {
        passages.push({
          kind: "faq",
          source: { title: "Conteúdo infantil OBPAZ", file: "kid" },
          content: `Explicação para crianças: ${kidEntry.answer}\nDica: ${kidEntry.tip}`
        });
      }
    }

    let result;
    if (process.env.DEBUG_RAG) console.log("[rag] cobertura", search.topCoverage.toFixed(2), "externo", usedExternal, passages.map((p) => p.source.title));
    const answerNow = () =>
      llmAnswer({ message, question: rewritten?.standalone_question || message, history, passages, audience, kidEntry });
    try {
      result = await answerNow();
      // A base parecia ter o assunto, mas a IA não achou a resposta nela: consulta os sites
      // educativos e a Wikipédia e tenta mais uma vez (só nesses casos, para poupar a cota).
      if (!result.grounded && !result.risk && result.intent !== "fora_do_escopo" && !usedExternal && config.liveWikipedia) {
        if (await addExternalSources()) result = await answerNow();
      }
    } catch (error) {
      console.error("Falha na geração com LLM; usando modo básico:", error.message);
      return finish({ ...(await localAnswer({ message, audience, search })), mode: "local" });
    }

    if (result.risk) return finish({ kind: "risk", grounded: true, answer: riskResponse(result.risk, audience), sources: [], model: result.model });
    // Pergunta sobre o tema, mas com um fato que não está na base (ex.: "Galtung ganhou o Nobel?"):
    // é "não sei", não "fora do escopo".
    const mentionsScope =
      /\b(paz|galtung|herrera|conflit\w*|violen\w*|bullying|direitos humanos|media[cç]\w*|briga\w*|raiva|respeito|inclus\w*|exclus\w*|suleada|interpaz|obpaz|nep|preconceit\w*|racism\w*|xenofob\w*|discrimina\w*|diversidade|empatia|socioemocion\w*|emoc\w*|cidadania|gandhi|mandela|malala|luther king)\b/.test(normalized);
    // Tema do projeto que o modelo classificou mal, mas respondeu com base nas fontes: mantém a resposta.
    if (result.intent === "fora_do_escopo" && mentionsScope && result.grounded && result.answer) return finish(result);
    if (result.intent === "fora_do_escopo" && (mentionsScope || search.topCoverage >= 0.5)) {
      return finish({ kind: "not_found", grounded: false, answer: FIXED.notFound[audience], sources: [], model: result.model });
    }
    if (result.intent === "fora_do_escopo") {
      return finish({ kind: "out_of_scope", grounded: true, answer: FIXED.outOfScope[audience], sources: [], model: result.model });
    }
    if (result.intent === "saudacao" && !result.grounded && normalized.length < 25) {
      return finish({ kind: "greeting", grounded: true, answer: FIXED.greeting[audience], sources: [], model: result.model });
    }
    if (!result.answer) return finish({ ...(await localAnswer({ message, audience, search })), mode: "local" });
    return finish(result);
  }

  return {
    chat,
    info: () => ({
      documents: corpus.documents,
      chunks: corpus.chunks.length,
      dataDir: corpus.dataDir,
      ai: llm ? llm.provider : "local",
      models: llm ? llm.models : [],
      embeddings: provider ? provider.name : "bm25",
      trustedLinks: trustedLinksCount
    })
  };
}
