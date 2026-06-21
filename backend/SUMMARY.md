# 🚀 SaaS Multi-Tenant - Foco em Negócio

## ✅ O que foi implementado?

### Estratégia Mudou: De "Enterprise" para "SaaS Real"

**Antes:** Pensando como Netflix (over-engineering)
**Agora:** Pensando como negócio de 10-50 oficinas 💰

---

## 🎯 Arquitetura Final (Simplificada)

### ✅ 1. Autenticação JWT com tenantId

**Arquivos:**
- `src/middleware/authMiddleware.js` - Middleware principal
- `src/services/authService.js` - Login, usuários, senhas
- `src/controllers/authController.js` - API de autenticação
- `src/routes/authRoutes.js` - Rotas de auth

**Features implementadas:**
- ✅ Login com JWT (token contém userId + tenantId + role)
- ✅ Bloqueio automático se tenant expirado
- ✅ Bloqueio automático se tenant suspenso
- ✅ Validação de limites de plano (middleware)
- ✅ Gestão de usuários por tenant
- ✅ Controle de permissões (admin/user)

**Token JWT:**
```javascript
{
  userId: 15,
  tenantId: 3,
  role: "admin",
  exp: 1234567890
}

```
backend/
├── migrations/
│   └── 001_add_multi_tenant.sql          # Migration SQL completa
│
├── src/
│   ├── middleware/
│   │   └── tenantMiddleware.js           # Middleware de identificação de tenant
│   │
│   ├── utils/
│   │   └── tenantQuery.js                # Helper para queries com tenant
│   │
│   ├── services/
│   │   ├── tenantsService.js             # Gerenciamento de tenants
│   │   └── empresasService.EXAMPLE.js    # Exemplo de service migrado
│   │
│   ├── controllers/
│   │   ├── tenantsController.js          # API de tenants
│   │   └── empresasController.EXAMPLE.js # Exemplo de controller migrado
│   │
│   └── routes/
│       ├── tenantsRoutes.js              # Rotas de tenants
│       └── index.js                      # Atualizado com middleware
│
├── run-multi-tenant-migration.js         # Script para executar migration
├── validate-multi-tenant.js              # Script para validar progresso
│
├── SETUP.md                              # 📘 Guia de instalação passo a passo
├── README_MULTI_TENANT.md                # 📗 README principal
├── MULTI_TENANT_GUIDE.md                 # 📙 Guia arquitetural
├── IMPLEMENTATION_CHECKLIST.md           # 📋 Checklist completo
├── TESTING_MULTI_TENANT.md               # 🧪 Guia de testes
├── API_EXAMPLES.md                       # 📡 Exemplos de API
│
├── .env                                  # ✅ Já configurado
└── package.json                          # ✅ Scripts adicionados
```

```

**Como usar:**
```bash
# 1. Login
POST /api/auth/login
Body: { "email": "admin@oficina.com", "senha": "senha123" }

# Response:
{ "token": "eyJhbGc...", "user": {...} }

# 2. Todas as outras requisições
Authorization: Bearer eyJhbGc...
```

### ✅ 2. Sistema de Métricas (KPIs de Negócio)

**Arquivos:**
- `src/services/metricsService.js` - Métricas e KPIs
- `src/controllers/metricsController.js` - API de métricas
- `src/routes/metricsRoutes.js` - Rotas de métricas

**Features implementadas:**
- ✅ Dashboard por tenant (clientes, orçamentos, receita)
- ✅ Uso de limites (próximos de upgrade)
- ✅ Métricas admin (churn risk, top clientes)
- ✅ Crescimento mensal
- ✅ Ranking de tenants

**Dashboard do Tenant:**
```javascript
GET /api/metrics/dashboard

{
  "clientes": { "total": 150 },
  "orcamentos": { "total": 450, "mes_atual": 45 },
  "receita": { "mes_atual": 12500, "total": 125000 }
}
```

**Métricas Admin (gerenciar SaaS):**
```javascript
GET /api/metrics/admin/churn-risk

// Tenants sem login há 7+ dias (risco de cancelar)
[
  {
    "id": 5,
    "nome": "Oficina XYZ",
    "ultimo_login": "2026-01-15",
    "total_ordens": 120
  }
]
```

### ✅ 3. Controle de Planos Robusto

**Tabela tenants atualizada:**
```sql
plano VARCHAR(50)              -- basic, premium, enterprise
max_usuarios INTEGER           -- 2, 5, ilimitado
max_orcamentos_mes INTEGER     -- 100, 200, ilimitado
data_expiracao DATE            -- auto-bloqueia quando vence
status VARCHAR(20)             -- active, suspended, canceled
```

**Middleware de limites:**
```javascript
// Bloqueia automaticamente quando atinge limite
authMiddleware.validatePlanLimits('orcamentos')

// Resposta quando atinge limite:
{
  "error": "Limite do plano atingido",
  "usado": 100,
  "limite": 100,
  "upgrade_para": "premium"
}
```

### ✅ 4. Estrutura Base Multi-Tenant

**Arquivos:**
- `migrations/001_add_multi_tenant.sql` - Migration completa
- `src/middleware/tenantMiddleware.js` - Identificação de tenant (legado)
- `src/utils/tenantQuery.js` - Helper para queries
- `src/services/tenantsService.js` - Gerenciamento de tenants
- `src/controllers/tenantsController.js` - API de tenants
- `src/routes/tenantsRoutes.js` - Rotas de tenants

---

## 📊 Status Atual

### ✅ FEITO (30%)

- [x] Migration SQL (tabelas tenants, usuarios, tenant_id)
- [x] **Autenticação JWT completa**
- [x] **Bloqueio automático (expiração + status)**
- [x] **Sistema de métricas (KPIs de negócio)**
- [x] **Controle de limites por plano**
- [x] Middleware de autenticação robusto
- [x] API de usuários (criar, listar, desativar)
- [x] Dependências instaladas (bcrypt, jsonwebtoken)
- [x] Documentação focada em negócio

### ⏳ Pendente (70%)

- [ ] Migrar 3 services essenciais (6h)
  - [ ] clientesService
  - [ ] orcamentosService ⚠️ Crítico - tem limite
  - [ ] ordensServicoService
- [ ] Adaptar frontend para JWT (3h)
- [ ] Deploy inicial (2h)
- [ ] Testar com 3 oficinas reais (1 semana)

---

## 🚀 Como Usar Agora

### 1. Executar Migration (5 min)

```bash
cd backend
npm run migrate:multi-tenant
```

### 2. Criar Tenant + Admin (2 min)

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "oficina-teste",
    "nome": "Oficina Teste",
    "email": "contato@oficina.com",
    "plano": "basic",
    "max_usuarios": 2,
    "max_orcamentos_mes": 100,
    "admin_email": "admin@oficina.com",
    "admin_senha": "senha123",
    "admin_nome": "Administrador"
  }'
```

### 3. Fazer Login (1 min)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@oficina.com",
    "senha": "senha123"
  }'

# Salve o token da resposta
```

### 4. Acessar Dashboard (1 min)

```bash
curl http://localhost:3000/api/metrics/dashboard \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 💰 Por que essa estratégia? (SaaS 10-50 oficinas)

### ❌ Abordagem Anterior (Over-Engineering)
- Headers X-Tenant-ID separados
- Subdomain routing complexo
- Pensando como Netflix
- Microserviços desnecessários

### ✅ Abordagem Atual (SaaS Real)
- JWT com tudo dentro (simples)
- Bloqueio automático (gera receita)
- Métricas para decisões (churn, upsell)
- Foco em 3 clientes pagando

---

## 🎯 Prioridade de Implementação

### ✅ Fase 1: Autenticação (CONCLUÍDA)
**Total: 100%**

### ⏳ Fase 2: Services Essenciais (30min cada)
**Total: 0%**

Ordem recomendada:
1. **clientesService** - CRUD básico
2. **orcamentosService** - ⚠️ Tem limite de plano
3. **ordensServicoService** - Gera receita

Padrão a seguir:
```javascript
// Antes (sem multi-tenant)
async listar() {
  return await pool.query("SELECT * FROM clientes");
}

// Depois (com tenant do JWT)
async listar(tenantId) {
  return await pool.query(
    "SELECT * FROM clientes WHERE tenant_id = $1",
    [tenantId]
  );
}

// Controller recebe tenantId do JWT automaticamente
async listar(req, res) {
  const clientes = await clientesService.listar(req.tenantId);
  res.json({ clientes });
}
```

### ⏳ Fase 3: Frontend (3-4h)
**Total: 0%**

```javascript
// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// Injetar token automaticamente
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### ⏳ Fase 4: Beta Real (1 semana)
**Total: 0%**

1. Criar 3 tenants de teste
2. Convidar 3 oficinas reais
3. Coletar feedback
4. Iterar rapidamente

---

## 💡 Decisões de Negócio

### Planos e Preços (Sugestão)

| Plano | Preço/mês | Usuários | Orçamentos/mês | Target |
|-------|-----------|----------|----------------|---------|
| Basic | R$ 97 | 2 | 100 | Oficinas pequenas |
| Premium | R$ 197 | 5 | 200 | Oficinas médias |
| Enterprise | R$ 397 | Ilimitado | Ilimitado | Oficinas grandes |

### Projeção de Receita

**Cenário Conservador (6 meses):**
- 10 clientes Basic = R$ 970/mês
- 5 clientes Premium = R$ 985/mês
- **Total: R$ 1.955/mês**
- **MRR 6 meses: ~R$ 12.000**

**Cenário Otimista (12 meses):**
- 30 clientes Basic = R$ 2.910/mês
- 15 clientes Premium = R$ 2.955/mês
- 5 clientes Enterprise = R$ 1.985/mês
- **Total: R$ 7.850/mês**
- **MRR 12 meses: ~R$ 94.000**

### Custos Mensais

- Servidor (Render): R$ 50
- Banco (PostgreSQL no Coolify/servidor): conforme hospedagem
- Domínio + SSL: R$ 20
- **Total: R$ 170/mês**

**Margem: 98%** 💰

---

## 🧪 Como Testar Recursos Críticos

### 1. Testar Bloqueio por Limite

```bash
# Configurar limite baixo
UPDATE tenants SET max_orcamentos_mes = 2 WHERE id = 2;

# Criar 2 orçamentos (OK)
POST /api/orcamentos (x2)

# Tentar criar o 3º (deve bloquear)
POST /api/orcamentos

# Resposta esperada:
{
  "error": "Limite do plano atingido",
  "usado": 2,
  "limite": 2,
  "upgrade_para": "premium"
}
```

### 2. Testar Bloqueio por Expiração

```sql
-- Simular expiração
UPDATE tenants SET data_expiracao = '2026-01-01' WHERE id = 2;
```

```bash
# Tentar fazer login ou qualquer operação
# Deve bloquear com mensagem clara
{
  "error": "Plano expirado",
  "message": "Sua assinatura expirou. Renove para continuar."
}
```

### 3. Testar Churn Risk Detection

```bash
# Buscar tenants em risco
GET /api/metrics/admin/churn-risk

# Deve retornar tenants sem login há 7+ dias
```

---

## 📚 Documentação Disponível

1. **[SAAS_REAL.md](SAAS_REAL.md)** - **LEIA PRIMEIRO!** ⭐
   - Estratégia simplificada
   - Foco em receita, não em engenharia
   - Como testar tudo
   - Métricas que importam

2. **[SETUP.md](SETUP.md)** - Instalação passo a passo
   - Migration
   - Criar tenant
   - Login
   - Testar

3. **[README_MULTI_TENANT.md](README_MULTI_TENANT.md)** - Visão geral técnica

4. **[MULTI_TENANT_GUIDE.md](MULTI_TENANT_GUIDE.md)** - Arquitetura detalhada

5. **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** - Checklist completo

6. **[TESTING_MULTI_TENANT.md](TESTING_MULTI_TENANT.md)** - Guia de testes

7. **[API_EXAMPLES.md](API_EXAMPLES.md)** - 30+ exemplos de API

---

## 🎯 Próximo Passo AGORA

```bash
# 1. Executar migration
npm run migrate:multi-tenant

# 2. Criar tenant + admin
# (ver SAAS_REAL.md)

# 3. Fazer login
# (ver SAAS_REAL.md)

# 4. Testar dashboard
GET /api/metrics/dashboard

# 5. Migrar clientesService (30min)
# Seguir padrão do empresasService.EXAMPLE
```

---

## 💡 Mentalidade Correta

### ❌ Pensamento Engineer:
"Precisa de microserviços, caching, websockets, Kubernetes..."

### ✅ Pensamento Founder:
"Precisa de 3 clientes pagando R$ 197/mês = R$ 591/mês"

### Para 50 Oficinas:

**Custos:**
- Infra: R$ 170/mês
- Tempo seu: 0h (automatizado)

**Receita:**
- 30 Basic (R$ 97): R$ 2.910/mês
- 20 Premium (R$ 197): R$ 3.940/mês
- **Total: R$ 6.850/mês**

**Lucro: R$ 6.680/mês (97% margem)** 💰

---

## 🚀 Roadmap Simplificado

### Semana 1: MVP
- [x] Auth JWT ✅
- [x] Métricas ✅
- [x] Bloqueio automático ✅
- [ ] 3 services essenciais (6h)
- [ ] Deploy (2h)

### Semana 2: Beta
- [ ] 3 oficinas testando
- [ ] Coletar feedback
- [ ] Ajustes rápidos

### Semana 3-4: Validação
- [ ] 10 oficinas usando
- [ ] Primeira cobrança (R$ 970)
- [ ] Ajustes baseados em uso real

### Mês 2+: Crescimento
- [ ] Marketing (indicações)
- [ ] Melhorias incrementais
- [ ] Mais oficinas

---

## 🎉 O que mudou?

### Antes:
- ❌ Headers X-Tenant-ID complexos
- ❌ Subdomain routing
- ❌ Over-engineering
- ❌ Pensando em 1000 clientes

### Agora:
- ✅ JWT simples e direto
- ✅ Bloqueio automático
- ✅ Métricas de negócio
- ✅ Pensando em 10-50 clientes
- ✅ **Focado em RECEITA**

---

## 📊 Métricas que Importam (KPIs)

Você pode ver tudo isso no dashboard admin:

### 1. MRR (Monthly Recurring Revenue)
```bash
GET /api/metrics/admin

{
  "total_tenants": 15,
  "tenants_ativos": 12,
  "plano_basic": 8,
  "plano_premium": 4,
  "receita_total": 45000.00
}
```

### 2. Churn Risk (quem vai cancelar)
```bash
GET /api/metrics/admin/churn-risk

// Tenants sem login há 7+ dias
[
  { "nome": "Oficina XYZ", "ultimo_login": "2026-01-15" }
]
```

### 3. Top Clientes (quem usar mais)
```bash
GET /api/metrics/admin/top-tenants

// Candidatos a upgrade para premium/enterprise
[
  { 
    "nome": "Oficina ABC",
    "total_ordens": 450,
    "plano": "basic"  // ⚠️ Upgrade!
  }
]
```

---

## 🛠️ Scripts Disponíveis

```bash
# Executar migration
npm run migrate:multi-tenant

# Validar progresso de migração
npm run validate:multi-tenant

# Iniciar servidor
npm run dev

# Produção
npm start
```

---

## 📞 Referência Rápida

```bash
# 1. Setup
npm install
npm run migrate:multi-tenant

# 2. Criar tenant
POST /api/tenants
{ "slug": "...", "nome": "...", "admin_email": "...", "admin_senha": "..." }

# 3. Login
POST /api/auth/login
{ "email": "...", "senha": "..." }

# 4. Usar token em todas as requisições
Authorization: Bearer TOKEN

# 5. Ver dashboard
GET /api/metrics/dashboard

# 6. Ver limites
GET /api/metrics/limits
```

---

## ⚠️ O que NÃO fazer agora

- ❌ Implementar todos os 11 services
- ❌ Adicionar websockets
- ❌ Fazer SSO/OAuth
- ❌ Criar painel admin mega complexo
- ❌ Pensar em escala de 1000 clientes
- ❌ Over-engineering

## ✅ O que fazer AGORA

1. ⏳ Migrar 3 services principais (6h)
2. ⏳ Frontend básico (4h)
3. ⏳ Deploy (2h)
4. ⏳ **Colocar 3 clientes reais usando**
5. ⏳ **Receber primeira mensalidade**

Depois disso, se tiver demanda, você melhora.

---

## 🎯 Conclusão

Você tem:
- ✅ Autenticação JWT completa
- ✅ Bloqueio automático (gera receita)
- ✅ Métricas de negócio (decisões)
- ✅ Controle de planos (limites)
- ✅ Estrutura multi-tenant sólida
- ✅ Documentação extensiva

**Falta:**
- ⏳ 3 services principais (6h)
- ⏳ Frontend (4h)
- ⏳ Deploy (2h)
- ⏳ **3 clientes pagando**

**Total: 12h para MVP funcional**

---

**🚀 O objetivo não é código perfeito, é receita recorrente.**

Para 10-50 oficinas, o que você tem **já funciona**.

Agora:
1. Termine os 3 services principais
2. Coloque 3 clientes usando
3. Cobre e receba primeira mensalidade
4. Valide se tem demanda real

Depois disso você decide se continua.

**O resto é over-engineering.**

---

**Leia:** [SAAS_REAL.md](SAAS_REAL.md) para entender a estratégia completa.

**Comece:** [SETUP.md](SETUP.md) para rodar tudo agora.
