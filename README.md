# Benny's Centro Automotivo - Sistema de Gestão

Sistema web completo para gestão de oficina mecânica, desenvolvido com React + Node.js + PostgreSQL.

## 🚀 Características

### Funcionalidades Principais

- ✅ **Ordens de Serviço (OS)**: Criação, edição, visualização e impressão com layout profissional
- ✅ **Orçamentos**: Gerenciamento de orçamentos com conversão automática para OS
- ✅ **Estoque**: Controle de produtos com alertas de estoque baixo e baixa automática
- ✅ **Clientes e Veículos**: Cadastro integrado com histórico completo
- ✅ **Dashboard Analítico**: Gráficos de faturamento, produtos mais vendidos e métricas
- ✅ **Busca Avançada**: Pesquisa por número, cliente, placa ou data
- ✅ **Impressão**: Layout profissional para impressão de OS

### Novas Funcionalidades 🎉

- 🌙 **Dark Mode**: Tema escuro com salvamento de preferência
- 🔍 **Filtros Avançados**: Filtro por data, status e cliente
- 📄 **Exportação PDF**: Relatórios de OS, Orçamentos e Dashboard
- 📊 **Gráficos Interativos**: Recharts com visualizações em tempo real
- ⚡ **Performance**: Lazy loading, compressão HTTP e loading states
- 🎨 **UX Moderna**: Toast notifications, confirmações e animações

### Infraestrutura

- ☁️ **Cloud Ready**: Pronto para deploy na Vercel e Render com banco PostgreSQL (Neon)
- 🔒 **Segurança**: Variáveis de ambiente, SSL, conexões seguras

## 📋 Requisitos

- Node.js 18+ instalado
- NPM ou Yarn
- Banco de dados PostgreSQL (Neon recomendado para produção)

## 🔧 Instalação

### 1. Backend

```bash
cd backend
npm install

# Configure o arquivo .env com sua connection string do PostgreSQL
cp .env.example .env
# Edite o .env e coloque sua DATABASE_URL

npm run dev
```

O servidor será iniciado em `http://localhost:3000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend será iniciado em `http://localhost:5173`

## ☁️ Deploy em Produção

Veja o guia completo em **[DEPLOY.md](DEPLOY.md)** para instruções detalhadas de como fazer deploy na:

- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Neon (PostgreSQL)

## 📁 Estrutura do Projeto

```
Benny/
├── backend/
│   ├── server.js                # Servidor Express e API REST
│   ├── database.js              # Configuração do banco PostgreSQL
│   ├── .env                     # Variáveis de ambiente (DATABASE_URL)
│   ├── .env.example             # Template de variáveis
│   ├── render.yaml              # Configuração para deploy no Render
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/         # Páginas do sistema
│   │   │   ├── Home.jsx
│   │   │   ├── Estoque.jsx
│   │   │   ├── Orcamentos.jsx
│   │   │   ├── OrcamentoForm.jsx
│   │   │   ├── OrcamentoDetalhes.jsx
│   │   │   ├── OrdensServico.jsx
│   │   │   ├── OSForm.jsx
│   │   │   └── OSDetalhes.jsx
│   │   ├── services/
│   │   │   └── api.js     # Cliente Axios
│   │   ├── App.jsx        # Rotas e navegação
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md
```

## 🎯 Funcionalidades Principais

### Ordem de Serviço

- Criação de OS com dados do cliente, veículo, produtos e serviços
- Integração automática com estoque (baixa automática)
- Alerta de estoque insuficiente
- Controle de status (Aberta, Em andamento, Finalizada, Cancelada)
- Impressão com layout profissional
- Informações de garantia (3 meses)
- Busca por número, cliente ou placa

### Orçamentos

- Criação de orçamentos sem compromisso
- Aprovação/reprovação
- Conversão automática para OS com um clique
- Mesma estrutura de produtos e serviços da OS

### Estoque

- Cadastro completo de produtos
- Controle de quantidade em estoque
- Alerta automático de estoque baixo
- Valores de custo e venda
- Baixa automática ao criar OS
- Histórico de movimentações

### Dashboard

- Visão geral com estatísticas
- OS abertas
- Orçamentos pendentes
- Produtos com estoque baixo
- Acesso rápido às principais funções

## 🔌 API Endpoints

### Produtos

- `GET /api/produtos` - Listar todos
- `GET /api/produtos/:id` - Buscar por ID
- `POST /api/produtos` - Criar
- `PUT /api/produtos/:id` - Atualizar
- `DELETE /api/produtos/:id` - Deletar
- `GET /api/produtos/alertas/estoque-baixo` - Produtos com estoque baixo

### Clientes

- `GET /api/clientes` - Listar todos
- `GET /api/clientes/:id` - Buscar por ID
- `POST /api/clientes` - Criar
- `PUT /api/clientes/:id` - Atualizar

### Veículos

- `GET /api/veiculos` - Listar todos
- `GET /api/veiculos/cliente/:clienteId` - Listar por cliente
- `POST /api/veiculos` - Criar

### Orçamentos

- `GET /api/orcamentos` - Listar todos (com filtros)
- `GET /api/orcamentos/:id` - Buscar por ID
- `POST /api/orcamentos` - Criar
- `PUT /api/orcamentos/:id` - Atualizar
- `POST /api/orcamentos/:id/converter-os` - Converter em OS

### Ordens de Serviço

- `GET /api/ordens-servico` - Listar todas (com filtros)
- `GET /api/ordens-servico/:id` - Buscar por ID
- `POST /api/ordens-servico` - Criar
- `PUT /api/ordens-servico/:id` - Atualizar

## 🎨 Tecnologias Utilizadas

### Backend

- Node.js
- Express
- Better-SQLite3
- CORS

### Frontend

- React 18
- Vite
- React Router DOM
- Tailwind CSS
- Axios

## 📝 Observações

- O sistema está preparado para futuras expansões (financeiro, relatórios, controle de usuários)
- O banco de dados SQLite é criado automaticamente na primeira execução
- A impressão das OS usa CSS `@media print` para layout otimizado
- Todas as datas são formatadas para o padrão brasileiro (pt-BR)

## 🤝 Contribuindo

Este é um sistema desenvolvido especificamente para Benny's Centro Automotivo.

## 📄 Licença

Sistema proprietário - Benny's Centro Automotivo © 2025
