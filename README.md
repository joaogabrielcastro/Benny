# 🚗 Benny's Centro Automotivo - Sistema de Gestão

Sistema completo para gestão de oficina mecânica com React, Node.js e PostgreSQL.

## 🚀 Funcionalidades

### 📋 Gestão de Ordens de Serviço

- Criar, editar e visualizar OS com workflow completo
- Impressão profissional de OS com logo e detalhes
- **Geração de Nota Fiscal (NF) para OS finalizadas** 🆕
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
- **Busca automática de endereço por CEP (ViaCEP)** 🆕
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

### 📅 Agendamentos 🆕

- Calendário completo de agendamentos
- Detecção de conflitos de horários
- Status (Agendado, Confirmado, Em Andamento, Concluído, Cancelado)
- Lembretes automáticos
- Busca por cliente, veículo ou serviço
- Integração com sistema de notificações

### 💳 Contas a Pagar 🆕

- Gestão completa de contas
- Dashboard com totais (Pagas, Pendentes, Vencidas)
- Alertas de vencimento
- 8 categorias pré-definidas
- Filtros por status, categoria e período
- Integração com sistema de lembretes

### 🔔 Sistema de Lembretes e Notificações 🆕

- Widget flutuante de notificações
- Processamento automático a cada 30 minutos
- Lembretes de agendamentos próximos
- Alertas de contas a vencer
- Notificações em tempo real via WebSocket
- Marcar como lido/não lido

### 📄 Notas Fiscais 🆕

- Geração automática de NF para OS finalizadas
- Numeração sequencial (000001, 000002...)
- Cálculo automático de tributos:
  - ICMS (18%)
  - ISS (5%)
  - PIS (1.65%)
  - COFINS (7.6%)
- Modal detalhado com todos os dados da NF
- Vinculação NF ↔ OS

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
- **PostgreSQL** 14+ (Docker local, Coolify ou servidor próprio)
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

### Banco de dados (PostgreSQL)

1. **Local / testes:** `docker compose --env-file .env.docker up` (ver `docs/DOCKER.md`)
2. **Produção:** Postgres no Coolify ou VPS — veja `docs/DEPLOY_COOLIFY.md`
3. Copie a connection string para `DATABASE_URL` no `.env` do backend
4. Após deploy: `npm run migrate`

## 📁 Estrutura do Projeto

```
Benny/
├── backend/
│   ├── server.js           # API REST principal (monolito em migração)
│   ├── database.js         # Pool PostgreSQL e migrations
│   ├── test-api.js         # Testes automatizados
│   ├── package.json
│   ├── .env               # Variáveis de ambiente
│   │
│   └── src/               # 🆕 Arquitetura MVC
│       ├── config/
│       │   ├── database.js
│       │   └── logger.js
│       ├── services/
│       │   ├── cepService.js
│       │   └── nfService.js
│       ├── controllers/
│       │   ├── cepController.js
│       │   └── nfController.js
│       ├── routes/
│       │   ├── index.js
│       │   ├── cepRoutes.js
│       │   └── nfRoutes.js
│       ├── models/         # (preparado)
│       ├── middlewares/    # (preparado)
│       └── utils/          # (preparado)
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
│   │   │   ├── OSDetalhes.jsx       # 🆕 Com geração de NF
│   │   │   ├── Agendamentos.jsx     # 🆕
│   │   │   └── ContasPagar.jsx      # 🆕
│   │   │
│   │   ├── components/    # Componentes reutilizáveis
│   │   │   ├── AdvancedFilters.jsx
│   │   │   ├── AuditHistory.jsx
│   │   │   ├── BuscaCEP.jsx         # 🆕
│   │   │   ├── ConfirmDialog.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── Logo.jsx
│   │   │   ├── NovoClienteModal.jsx # 🔄 Atualizado com CEP
│   │   │   ├── NotificacoesWidget.jsx # 🆕
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

### Ordens de Serviço

- `GET /api/ordens-servico` - Listar (com filtros)
- `GET /api/ordens-servico/:id` - Buscar por ID
- `POST /api/ordens-servico` - Criar
- `PUT /api/ordens-servico/:id` - Atualizar status

### 📄 Notas Fiscais 🆕

- `POST /api/notas-fiscais/gerar/:osId` - Gerar NF para OS
- `GET /api/notas-fiscais` - Listar todas
- `GET /api/notas-fiscais/:id` - Buscar por ID
- `PUT /api/notas-fiscais/:id/cancelar` - Cancelar NF

### 📅 Agendamentos 🆕

- `GET /api/agendamentos` - Listar (com filtros)
- `GET /api/agendamentos/:id` - Buscar por ID
- `POST /api/agendamentos` - Criar
- `PUT /api/agendamentos/:id` - Atualizar
- `DELETE /api/agendamentos/:id` - Deletar
- `GET /api/agendamentos/conflitos` - Verificar conflitos
- `POST /api/agendamentos/:id/reagendar` - Reagendar

### 💳 Contas a Pagar 🆕

- `GET /api/contas-pagar` - Listar (com filtros)
- `GET /api/contas-pagar/:id` - Buscar por ID
- `POST /api/contas-pagar` - Criar
- `PUT /api/contas-pagar/:id` - Atualizar
- `DELETE /api/contas-pagar/:id` - Deletar
- `POST /api/contas-pagar/:id/pagar` - Marcar como paga

### 🔔 Lembretes 🆕

- `GET /api/lembretes` - Listar (com filtros)
- `GET /api/lembretes/nao-lidos` - Não lidos
- `PUT /api/lembretes/:id/lido` - Marcar como lido

### 🏠 CEP 🆕

- `GET /api/cep/:cep` - Buscar endereço por CEP

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

## 🛠️ Tecnologias Utilizadas

### Backend

- **Node.js** 18+ com Express.js
- **PostgreSQL** com pool de conexões (`pg`)
- **Winston** para logging estruturado
- **node-schedule** para tarefas agendadas (backups, lembretes)
- **node-cache** para cache em memória
- **WebSocket (ws)** para notificações em tempo real
- **axios** para integração com APIs externas (ViaCEP)
- **express-validator** para validação de dados
- **compression** para otimização

### Frontend

- **React 18** com Vite
- **React Router v6** para navegação
- **TailwindCSS** para estilização
- **date-fns** para manipulação de datas
- **react-hot-toast** para notificações
- **react-to-print** para impressão
- **recharts** para gráficos
- **jsPDF** para exportação de PDFs

### APIs Externas

- **ViaCEP** - Busca de endereços brasileiros

## 🔒 Segurança

- Variáveis de ambiente para credenciais
- SSL/TLS nas conexões de banco
- Validação de dados com express-validator
- Sanitização de inputs
- CORS configurado
- Logs de auditoria
- WebSocket com validação

## 🧪 Testes

Execute a bateria de testes da API:

```bash
cd backend
npm test
```

## 🎯 Próximas Melhorias

- [ ] Autenticação de usuários (JWT)
- [ ] Permissões por perfil (admin, mecânico, atendente)
- [ ] Notificações por email
- [ ] Integração com pagamento online
- [ ] App mobile (React Native)
- [ ] Impressão de múltiplas OS
- [ ] Relatórios avançados em PDF
- [ ] Backup em nuvem (S3)
- [ ] ✅ Sistema de agendamentos (Concluído)
- [ ] ✅ Contas a pagar (Concluído)
- [ ] ✅ Busca de CEP (Concluído)
- [ ] ✅ Geração de NF (Concluído)
- [ ] 🚧 Migração completa para MVC (Em andamento)

## 📚 Documentação Adicional

- [📄 NOVAS_FUNCIONALIDADES.md](NOVAS_FUNCIONALIDADES.md) - Documentação detalhada das novas features
- [📖 GUIA_MIGRACAO_MVC.md](GUIA_MIGRACAO_MVC.md) - Guia completo de migração para MVC
- [📋 FUNCIONALIDADES_AGENDAMENTOS.md](FUNCIONALIDADES_AGENDAMENTOS.md) - Sistema de agendamentos e contas

## 📄 Licença

Este projeto é proprietário e de uso interno.

## 👨‍💻 Suporte

Para suporte ou dúvidas, entre em contato através do email ou WhatsApp da oficina.

---

**Desenvolvido com ❤️ para Benny's Centro Automotivo**
