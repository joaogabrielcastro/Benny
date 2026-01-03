# 🚀 Guia de Deploy - Benny's Centro Automotivo

## 📋 Pré-requisitos

- Conta no [Neon Database](https://neon.tech) (já configurado)
- Conta no [Vercel](https://vercel.com) (para frontend)
- Conta no [Render](https://render.com) (para backend)
- Git instalado

---

## 🗄️ 1. Banco de Dados (Neon - PostgreSQL)

O banco de dados já está configurado!

**Connection String:**

```
postgresql://neondb_owner:npg_7troCv0OgNFz@ep-steep-mud-ac3ojtw1-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

### Criar as tabelas:

```bash
cd backend
npm install
npm start
```

As tabelas serão criadas automaticamente na primeira execução.

---

## 🎨 2. Deploy do Frontend (Vercel)

### Via Dashboard (mais fácil):

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Add New Project"**
3. Importe o repositório Git
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Clique em **"Deploy"**

### Via CLI:

```bash
npm install -g vercel
cd frontend
vercel login
vercel --prod
```

### Configurar variável de ambiente no Vercel:

Depois do deploy, adicione a variável:

- **VITE_API_URL**: `https://seu-backend.onrender.com`

---

## 🔧 3. Deploy do Backend (Render)

### Via Dashboard:

1. Acesse [render.com](https://render.com)
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu repositório Git
4. Configure:
   - **Name**: `benny-centro-automotivo-api`
   - **Region**: `Ohio (US East)`
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Adicione as **Environment Variables**:
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_7troCv0OgNFz@ep-steep-mud-ac3ojtw1-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
   PORT=3000
   ```
6. Clique em **"Create Web Service"**

### Via Blueprint (render.yaml):

O arquivo `backend/render.yaml` já está configurado. Basta:

1. Ir em **"New +"** → **"Blueprint"**
2. Conectar o repositório
3. Selecionar o arquivo `backend/render.yaml`

---

## 🌐 4. Atualizar URL da API no Frontend

Depois do backend estar no ar, edite o arquivo `frontend/src/api/axios.js`:

```javascript
const api = axios.create({
  baseURL: "https://seu-backend.onrender.com",
});
```

Faça commit e redeploy no Vercel.

---

## ✅ 5. Testar a Aplicação

1. Acesse a URL do Vercel (frontend)
2. Verifique se consegue:
   - ✓ Cadastrar produtos
   - ✓ Cadastrar clientes
   - ✓ Criar orçamentos
   - ✓ Criar ordens de serviço
   - ✓ Imprimir OS

---

## 🐛 Troubleshooting

### Erro de CORS:

Verifique se o backend está com `cors()` ativado no `server.js`.

### Banco não conecta:

- Verifique se a `DATABASE_URL` está correta nas variáveis de ambiente do Render
- Certifique-se de incluir `?sslmode=require` na connection string

### Frontend não carrega dados:

- Verifique a URL da API no `axios.js`
- Verifique os logs do backend no Render

### Tabelas não são criadas:

- As tabelas são criadas automaticamente ao iniciar o servidor
- Verifique os logs do Render para ver se houve erro

---

## 📊 Monitoramento

### Logs do Backend (Render):

1. Acesse o dashboard do Render
2. Clique no seu serviço
3. Vá em **"Logs"**

### Logs do Frontend (Vercel):

1. Acesse o dashboard da Vercel
2. Clique no seu projeto
3. Vá em **"Deployments"** → Clique no deploy → **"View Function Logs"**

---

## 🔄 Redeploy

### Frontend:

- Basta fazer push no repositório Git
- A Vercel faz redeploy automático

### Backend:

- Faça push no repositório Git
- O Render faz redeploy automático

---

## 💡 Dicas

1. **Free Tier do Render**: O plano free "hiberna" após 15 minutos sem uso. A primeira requisição pode demorar ~30s para "acordar".

2. **Neon Database**: Oferece 0.5GB gratuitos. Para mais armazenamento, considere upgrade.

3. **Custom Domain**: Você pode adicionar um domínio personalizado tanto na Vercel quanto no Render.

4. **HTTPS**: Tanto Vercel quanto Render fornecem HTTPS automático e gratuito.

---

## 🎉 Pronto!

Seu sistema está no ar! 🚀

**Frontend**: `https://seu-app.vercel.app`  
**Backend**: `https://seu-backend.onrender.com`  
**Database**: Neon PostgreSQL (já configurado)
