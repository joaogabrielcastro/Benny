# 🚀 Guia de Início Rápido - Benny's Centro Automotivo

## Passo 0: Configurar o Banco de Dados PostgreSQL

```powershell
cd backend
cp .env.example .env
```

Edite o arquivo `.env` e adicione a connection string do PostgreSQL (Neon):

```
DATABASE_URL=postgresql://neondb_owner:npg_7troCv0OgNFz@ep-steep-mud-ac3ojtw1-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

## Passo 1: Instalar Dependências do Backend

```powershell
cd backend
npm install
```

## Passo 2: Instalar Dependências do Frontend

Em outro terminal PowerShell:

```powershell
cd frontend
npm install
```

## Passo 3: Iniciar o Backend

No terminal do backend:

```powershell
npm start
```

Você verá:

```
✓ Servidor rodando em http://localhost:3000
✓ Conectado ao banco de dados PostgreSQL (Neon)
✓ Tabelas do banco de dados criadas/verificadas com sucesso!
```

## Passo 4: Iniciar o Frontend

No terminal do frontend:

```powershell
npm run dev
```

O sistema estará disponível em: **http://localhost:5173**

## 🎉 Pronto!

Acesse http://localhost:5173 no seu navegador.

## 📝 Primeiro Acesso

1. **Cadastrar Produtos no Estoque**

   - Acesse "Estoque" no menu
   - Clique em "+ Novo Produto"
   - Cadastre algumas peças e produtos

2. **Criar um Orçamento**

   - Acesse "Orçamentos"
   - Clique em "+ Novo Orçamento"
   - Preencha os dados do cliente, veículo, produtos e serviços

3. **Converter em Ordem de Serviço**

   - Aprove o orçamento
   - Clique em "Converter em OS"
   - A OS será criada automaticamente

4. **Imprimir a OS**
   - Visualize a OS criada
   - Clique em "Imprimir OS"
   - Use Ctrl+P ou o botão de impressão do navegador

## ⚠️ Problemas Comuns

### Erro "Cannot find module"

```powershell
# Execute no diretório correto (backend ou frontend):
npm install
```

### Porta já em uso

```powershell
# Verifique se outro processo está usando a porta 3000 ou 5173
# No PowerShell:
netstat -ano | findstr :3000
netstat -ano | findstr :5173
```

### Banco de dados não inicializa

```powershell
# Certifique-se de estar na pasta backend:
cd backend
npm run dev
```

## 🔧 Scripts Disponíveis

### Backend

- `npm start` - Inicia o servidor em modo produção
- `npm run dev` - Inicia o servidor em modo desenvolvimento (com nodemon)

### Frontend

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run preview` - Preview do build de produção

## 📞 Suporte

Para dúvidas ou problemas, verifique o README.md principal.
