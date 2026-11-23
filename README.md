# OBPAZ Chat

Chatbot educativo sobre paz, cultura de paz, conflitos, direitos humanos e educação para a paz, pensado para escolas.
As respostas são **fundamentadas na base de dados da OBPAZ** (RAG) e adaptadas a quem está conversando:
**criança**, **adolescente** ou **adulto/educador**.

## Como funciona

```text
pergunta
  │
  ├─ 1. Segurança: palavras de risco (autolesão, abuso, ameaça) → resposta fixa com CVV 188, Disque 100, 190
  ├─ 2. Reescrita (LLM, só se houver histórico): resolve "e ele?", "explica melhor"
  ├─ 3. Público: idade ou ano escolar citados > perfil escolhido na tela > sinais do texto
  ├─ 4. Busca: BM25 (palavras + gírias) + embeddings locais gratuitos (multilingual-e5-small) quando há memória, fundidos por RRF
  └─ 5. Resposta (LLM gratuito da Groq, temperatura 0.2, saída JSON estrita):
         - usa SOMENTE os trechos recuperados para fatos, autores, datas e conceitos
         - se a base não tem a resposta → diz que não sabe (grounded=false), sem inventar
         - também classifica fora do escopo e risco (resposta fixa e segura nesses casos)
         - criança: texto curto + historinha em quadrinhos ilustrados + dica + pergunta de reflexão
```

**Tudo é gratuito.** A IA usa o plano grátis da Groq (sem cartão), com vários modelos em sequência:
quando a cota de um acaba, usa o próximo; se todas acabarem, cai no modo básico. Os embeddings rodam no próprio servidor.

Sem `GROQ_API_KEY` o sistema roda em **modo básico**: só devolve textos que existem na base
(FAQ, histórias infantis prontas ou frases extraídas dos documentos), nunca texto inventado.

### Identificação de crianças

- Na primeira visita, a tela pergunta: *Sou criança / Sou adolescente / Sou adulto ou educador / Prefiro não dizer*.
- Se a pessoa disser a idade ("tenho 8 anos") ou o ano escolar ("estou no 3º ano"), o modo muda automaticamente.
- No modo automático, o vocabulário ("recreio", "minha professora", "brincar"...) e a análise do LLM também são usados.
- Quando o modo muda, aparece um aviso com o botão **"Não sou criança"** para corrigir.

### Modo criança

- Linguagem simples, frases curtas, tom acolhedor.
- Historinha em 2–3 quadrinhos com personagens fixos (Lia, Davi, Tom, Maya e a professora Rosa).
- Ilustrações desenhadas em SVG no próprio navegador (`public/illustrations.js`): 15 cenas, sem custo
  e sem gerar imagens externas.
- Botão **🔊 Ouvir** (leitura em voz alta pelo navegador) para quem ainda está aprendendo a ler.
- 17 respostas infantis curadas em `server/kidContent.js` (usadas no modo básico e como exemplo para o LLM).

## Como rodar localmente

```bash
npm install
cp .env.example .env   # e preencha GROQ_API_KEY (grátis em console.groq.com/keys)
npm run dev
```

Abra `http://localhost:3000`.

## Como adicionar conteúdo

Coloque arquivos `.pdf`, `.docx`, `.md` ou `.txt` dentro da pasta `OBPAZ - Banco de Dados`.
Na próxima inicialização eles são lidos, divididos em trechos e indexados (os embeddings ficam em cache em `.cache/`).

Para FAQs, use Markdown com uma pergunta por título `##`: cada pergunta vira um trecho próprio e é encontrada com mais precisão.

## Hospedagem gratuita

### Render (plano Free) — em uso

1. O serviço `IA_PAZ` no Render está ligado ao repositório GitHub (branch `main`): cada push publica sozinho.
2. Em **Environment**, configure `GROQ_API_KEY` (chave gratuita da Groq).
3. O plano grátis tem 512 MB de memória: lá o servidor detecta o Render e usa busca por palavras (BM25 + gírias)
   com reescrita da pergunta pela IA, sem carregar o modelo local de embeddings (que precisaria de ~580 MB).
4. O plano grátis "dorme" após 15 min sem acesso; o primeiro acesso depois disso demora ~1 min.

> Obs.: o Hugging Face Spaces passou a exigir plano pago para Spaces com servidor (Docker/Gradio),
> então não é mais uma opção gratuita para este projeto.

### Qualquer servidor com Docker (com mais memória, usa os embeddings locais)

```bash
docker build -t obpaz-chat .
docker run -p 7860:7860 -e GROQ_API_KEY=sua_chave obpaz-chat
```

## Testes de qualidade

```bash
node scripts/eval-retrieval.mjs   # a busca encontra o trecho certo? (27 perguntas)
node scripts/eval-answers.mjs     # respostas reais + perguntas armadilha + detector de nomes/números inventados
```

## Estrutura

```text
server/
  index.js         API (Express) + limite de requisições
  config.js        variáveis de ambiente
  ingest.js        leitura de PDF/DOCX/MD e divisão em trechos
  llm.js           cliente LLM (Groq/compatível OpenAI) com JSON e modelos de reserva
  embeddings.js    embeddings locais gratuitos (ou OpenAI opcional) com cache em disco
  retriever.js     busca híbrida BM25 + embeddings (RRF)
  chat.js          orquestração: segurança → análise → público → busca → resposta
  prompts.js       prompts e esquemas JSON (regras contra invenção)
  audience.js      identificação de criança / adolescente / adulto
  safety.js        respostas fixas para situações de risco
  kidContent.js    respostas e historinhas infantis curadas + lista de cenas
public/
  index.html, app.js, styles.css
  illustrations.js cenas ilustradas em SVG
```

## Endpoints

- `GET /api/health`: status, número de trechos, modo de IA e de embeddings.
- `GET /api/sources`: documentos processados.
- `POST /api/chat`: `{ "message": "...", "history": [...], "profile": "crianca|adolescente|adulto|null" }`
  → `{ answer, story, tip, question, audience, audienceDetected, grounded, sources, kind }`.

## Variáveis de ambiente

Veja `.env.example`. As principais: `GROQ_API_KEY`, `LLM_MODELS`, `EMBEDDING_PROVIDER`,
`SHOW_SOURCES` (mostra a base usada nas respostas para adultos), `RATE_LIMIT_PER_MINUTE`.
