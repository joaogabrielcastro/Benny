# 🚗 Benny's Centro Automotivo - Sistema de Gestão

Sistema completo para gestão de oficina mecânica com React, Node.js e PostgreSQL.

## 🚀 Funcionalidades

### 📋 Gestão de Ordens de Serviço

- Criar, editar e visualizar OS com workflow completo
- Impressão profissional de OS com logo e detalhes
- Controle de status (Aberta, Em Andamento, Finalizada, Cancelada)
- Histórico completo de alterações (auditoria)
- Busca avançada por número, cliente, placa ou data
- Filtros por status e período
- Ordenação de colunas
- Paginação automática

### 💰 Orçamentos

- Criação de orçamentos detalhados
- **Compartilhamento via WhatsApp ou link público**
- Cliente pode aprovar/reprovar online
- Conversão automática para OS após aprovação
- Baixa automática de estoque na aprovação
- Controle de status (Pendente, Aprovado, Reprovado)

### 📦 Controle de Estoque

- Cadastro completo de produtos
- Alertas de estoque baixo
- Baixa automática em OS e orçamentos aprovados
- Movimentações de entrada/saída rastreadas
- Histórico de movimentações

### 👥 Clientes e Veículos

- Cadastro integrado de clientes
- Múltiplos veículos por cliente
- Histórico completo de serviços

### 📊 Dashboard Analítico

- Faturamento do mês
- Ticket médio
- OS abertas vs totais
- Produtos com estoque baixo
- Gráfico de faturamento mensal (6 meses)
- Top 10 produtos mais vendidos
- **Exportação de relatórios em PDF**

### 🎨 Interface Moderna

- **Dark Mode** com salvamento de preferência
- Design responsivo (mobile-first)
- Loading states e feedback visual
- Toast notifications para ações
- Confirmações customizadas
- Lazy loading de páginas

### ⚡ Performance e Infraestrutura

- Cache HTTP para endpoints frequentes
- Compressão de respostas (gzip)
- Paginação otimizada
- Queries SQL eficientes
- **WebSocket para atualizações em tempo real**
- Logs estruturados (Winston)
- Backup automático diário
- Sistema de health check

## 📋 Requisitos

- **Node.js** 18 ou superior
- **PostgreSQL** (recomendado Neon para produção)
- NPM ou Yarn

## 🔧 Instalação Local

### 1. Clone o repositório

```bash
git clone <seu-repositorio>
cd Benny
```

### 2. Backend

```bash
cd backend
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env e adicione sua DATABASE_URL do PostgreSQL

# Iniciar servidor
npm run dev
```

O backend estará em `http://localhost:3000`

### 3. Frontend

```bash
cd frontend
npm install

# Iniciar aplicação
npm run dev
```

O frontend estará em `http://localhost:5173`

## ☁️ Deploy em Produção

### Backend (Render)

1. Crie uma conta no [Render](https://render.com)
2. Conecte seu repositório GitHub
3. Crie um Web Service apontando para `/backend`
4. Configure a variável de ambiente:
   - `DATABASE_URL`: Sua connection string do PostgreSQL

### Frontend (Vercel)

1. Instale a Vercel CLI: `npm i -g vercel`
2. Na pasta raiz do projeto: `vercel`
3. Siga as instruções
4. Configure a variável de ambiente:
   - `VITE_API_URL`: URL do seu backend no Render

### Database (Neon)

1. Crie uma conta no [Neon](https://neon.tech)
2. Crie um novo projeto PostgreSQL
3. Copie a connection string
4. Use no `.env` do backend

## 📁 Estrutura do Projeto

```
Benny/
├── backend/
│   ├── server.js           # API REST completa
│   ├── database.js         # Pool PostgreSQL e migrations
│   ├── test-api.js         # Testes automatizados
│   ├── package.json
│   └── .env               # Variáveis de ambiente
│
├── frontend/
│   ├── src/
│   │   ├── pages/         # Páginas da aplicação
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Estoque.jsx
│   │   │   ├── Orcamentos.jsx
│   │   │   ├── OrcamentoForm.jsx
│   │   │   ├── OrcamentoDetalhes.jsx
│   │   │   ├── OrcamentoPublico.jsx
│   │   │   ├── OrdensServico.jsx
│   │   │   ├── OSForm.jsx
│   │   │   └── OSDetalhes.jsx
│   │   │
│   │   ├── components/    # Componentes reutilizáveis
│   │   │   ├── AdvancedFilters.jsx
│   │   │   ├── AuditHistory.jsx
│   │   │   ├── ConfirmDialog.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── Logo.jsx
│   │   │   ├── OSImpressao.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── SortableHeader.jsx
│   │   │   └── ThemeToggle.jsx
│   │   │
│   │   ├── contexts/      # React Context
│   │   │   └── ThemeContext.jsx
│   │   │
│   │   ├── services/      # API Client
│   │   │   └── api.js
│   │   │
│   │   ├── utils/         # Utilitários
│   │   │   ├── formatters.js
│   │   │   ├── formValidation.jsx
│   │   │   └── pdfExport.js
│   │   │
│   │   ├── styles/
│   │   │   └── print.css  # Estilos para impressão
│   │   │
│   │   ├── App.jsx        # Rotas e Layout
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── vercel.json            # Config Vercel
└── README.md
```

## 🔌 API Endpoints

### Produtos

- `GET /api/produtos` - Listar (com paginação)
- `GET /api/produtos/:id` - Buscar por ID
- `POST /api/produtos` - Criar
- `PUT /api/produtos/:id` - Atualizar
- `DELETE /api/produtos/:id` - Deletar
- `GET /api/produtos/alertas/estoque-baixo` - Estoque baixo

### Clientes e Veículos

- `GET /api/clientes` - Listar clientes
- `POST /api/clientes` - Criar cliente
- `GET /api/veiculos/cliente/:id` - Veículos do cliente
- `POST /api/veiculos` - Cadastrar veículo

### Orçamentos

- `GET /api/orcamentos` - Listar (com filtros)
- `GET /api/orcamentos/:id` - Buscar por ID
- `POST /api/orcamentos` - Criar
- `PUT /api/orcamentos/:id` - Atualizar
- `POST /api/orcamentos/:id/converter-os` - Converter em OS
- `GET /api/orcamentos/publico/:id` - Visualização pública
- `PUT /api/orcamentos/publico/:id/aprovar` - Aprovação pública
- `PUT /api/orcamentos/publico/:id/reprovar` - Reprovação pública

### Ordens de Serviço

- `GET /api/ordens-servico` - Listar (com filtros)
- `GET /api/ordens-servico/:id` - Buscar por ID
- `POST /api/ordens-servico` - Criar
- `PUT /api/ordens-servico/:id` - Atualizar status

### Relatórios

- `GET /api/relatorios/dashboard` - Dados do dashboard
- `GET /api/relatorios/vendas` - Relatório de vendas

### Sistema

- `GET /api/health` - Health check
- `POST /api/backup` - Criar backup manual
- `GET /api/backup/list` - Listar backups

### Auditoria

- `GET /api/auditoria/ordens-servico/:id` - Histórico de OS
- `GET /api/auditoria/orcamentos/:id` - Histórico de orçamento

## 🔒 Segurança

- Variáveis de ambiente para credenciais
- SSL/TLS nas conexões de banco
- Validação de dados com express-validator
- Sanitização de inputs
- CORS configurado
- Logs de auditoria

## 🧪 Testes

Execute a bateria de testes da API:

```bash
cd backend
npm test
```

Taxa de sucesso: **97.1% (33/34 testes)**

## 🎯 Próximas Melhorias

- [ ] Autenticação de usuários (JWT)
- [ ] Permissões por perfil (admin, mecânico, atendente)
- [ ] Notificações por email
- [ ] Integração com pagamento online
- [ ] App mobile (React Native)
- [ ] Impressão de múltiplas OS
- [ ] Relatórios avançados
- [ ] Backup em nuvem (S3)

## 📄 Licença

Este projeto é proprietário e de uso interno.

## 👨‍💻 Suporte

Para suporte ou dúvidas, entre em contato através do email ou WhatsApp da oficina.

---

**Desenvolvido com ❤️ para Benny's Centro Automotivo**
