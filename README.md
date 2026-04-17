# OBPAZ Chat

Chatbot web com backend e frontend para consultar a base de dados da OBPAZ sobre paz, cultura de paz, conflitos, direitos humanos e educação para a paz.

## Como rodar localmente

1. Instale as dependências:

```bash
npm install
```

2. Crie um arquivo `.env` a partir do `.env.example`.

3. Para respostas mais fluídas com IA, preencha:

```bash
OPENAI_API_KEY=sua_chave_aqui
OPENAI_MODEL=gpt-4.1-mini
```

Sem `OPENAI_API_KEY`, o sistema roda em modo local e responde usando os trechos recuperados da base.

4. Rode em desenvolvimento:

```bash
npm run dev
```

O sistema abre em `http://localhost:3000`.

## Como publicar no Render

1. Suba esta pasta para um repositório GitHub.
2. No Render, crie um novo **Web Service** apontando para o repositório.
3. Use:

```bash
Build Command: npm install
Start Command: npm start
```

4. Em **Environment Variables**, configure:

```bash
OPENAI_API_KEY=sua_chave_aqui
OPENAI_MODEL=gpt-4.1-mini
DATA_DIR=./OBPAZ - Banco de Dados-20260417T222334Z-3-001/OBPAZ - Banco de Dados
```

O arquivo `render.yaml` já traz uma configuração base para Blueprint do Render.

## Estrutura

```text
server/
  index.js            API do chat e servidor de produção
  knowledgeBase.js    leitura dos PDFs/DOCX e busca por relevância
public/
  index.html          tela do chat
  app.js              interação do chat
  styles.css          visual responsivo
```

## Endpoints

- `GET /api/health`: mostra se a base foi carregada.
- `GET /api/sources`: lista os documentos processados.
- `POST /api/chat`: recebe `{ "message": "..." }` e retorna resposta com fontes.
