# Gotas de CHAbedoria

App web (PWA) de devocional diário com plano de leitura em **Salmos (1–150)**, **Provérbios (1–31)** e **Eclesiastes (1–12)**, anotações locais no navegador, backup em JSON e geração opcional de reflexão com a API Gemini.

## 1. Como obter a chave da API Gemini

1. Acesse o [Google AI Studio](https://aistudio.google.com/apikey).
2. Crie uma nova API Key e copie o valor gerado.

## 2. Rodar localmente

Pré-requisitos: Node.js 18+ e [Vercel CLI](https://vercel.com/docs/cli).

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Crie um arquivo `.env` na raiz do projeto (baseado no `.env.example`):
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   GEMINI_MODEL=gemini-3.8-flash
   ```
3. Inicie o servidor local com suporte à função `/api/gerar`:
   ```bash
   npx vercel dev
   ```
   Abra o endereço exibido no terminal (geralmente `http://localhost:3000`).

> Caso queira testar apenas o front-end estático (sem geração por IA), basta abrir um servidor HTTP local na pasta.

## 3. Publicar na Vercel

1. Envie o repositório para o GitHub (o `.gitignore` já protege `.env` e `node_modules`).
2. Importe o projeto na [Vercel](https://vercel.com/).
3. Em **Settings → Environment Variables**, adicione:
   - `GEMINI_API_KEY`: sua chave do Google AI Studio
   - `GEMINI_MODEL`: `gemini-3.8-flash` (opcional, já é o padrão)
4. Faça o deploy. A função `/api/gerar` e o PWA ficarão disponíveis automaticamente.
