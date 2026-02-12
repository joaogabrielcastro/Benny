# 🚀 SaaS Real: Foco em Receita, Não em Engenharia

## ✅ Estratégia Simplificada (10-50 Oficinas)

Você estava certo. Para um SaaS pequeno, a arquitetura mudou para:

### 🎯 O que realmente importa:

1. **JWT com tenantId** ✅
   - Abandona headers X-Tenant-ID
   - Token contém tudo: userId + tenantId + role
   - Validação em uma camada só

2. **Sistema de Bloqueio Automático** ✅
   - Vencimento = sem acesso
   - Middleware bloqueia antes de processar qualquer coisa
   - Auto-suspend quando expira

3. **Controle de Planos Robusto** ✅
   - Basic: 2 usuários, 100 orçamentos/mês
   - Premium: 5 usuários, 200 orçamentos/mês  
   - Enterprise: Ilimitado
   - Bloqueio quando atinge limite

4. **Métricas para Decisões** ✅
   - Dashboard por tenant
   - Métricas admin (churn risk, top clientes)
   - Uso de limites (oportunidade de upsell)

---

## 📦 O que foi criado (foco em negócio):

### 1. Sistema de Autenticação JWT

**Arquivo:** `src/middleware/authMiddleware.js`

```javascript
// Token JWT contém tudo:
{
  userId: 15,
  tenantId: 3,
  role: "admin"
}
```

**Features:**
- ✅ Bloqueio automático se tenant expirado
- ✅ Bloqueio automático se tenant suspenso
- ✅ Validação de limites de plano
- ✅ Validação de permissões (role)
- ✅ Atualização de último login

**Rotas:**
- `POST /api/auth/login` - Login (público)
- `GET /api/auth/me` - Dados do usuário
- `POST /api/auth/usuarios` - Criar usuário (admin)
- `GET /api/auth/usuarios` - Listar usuários (admin)

### 2. Sistema de Métricas (KPIs de Negócio)

**Arquivo:** `src/services/metricsService.js`

**Dashboard do Tenant:**
```json
{
  "clientes": { "total": 150 },
  "orcamentos": { "total": 450, "mes_atual": 45 },
  "receita": { "mes_atual": 12500, "total": 125000 }
}
```

**Métricas Admin (gerenciar SaaS):**
- Top 10 tenants (candidatos a upsell)
- Tenants em risco de churn (sem login 7 dias)
- Crescimento mensal
- Uso de limites (próximos de upgrade)

**Rotas:**
- `GET /api/metrics/dashboard` - Dashboard do tenant
- `GET /api/metrics/limits` - Uso de limites
- `GET /api/metrics/admin` - Métricas globais
- `GET /api/metrics/admin/churn-risk` - Risco de cancelamento

### 3. Controle de Planos

**Tabela tenants:**
```sql
plano VARCHAR(50)              -- basic, premium, enterprise
max_usuarios INTEGER           -- 2, 5, ilimitado
max_orcamentos_mes INTEGER     -- 100, 200, ilimitado
data_expiracao DATE            -- auto-bloqueia quando vence
```

**Middleware de Limites:**
```javascript
authMiddleware.validatePlanLimits('orcamentos')
```

Bloqueia automaticamente quando:
- Tenant atinge limite de orçamentos no mês
- Tenant atinge limite de usuários
- Retorna mensagem com upgrade path

---

## 🎯 Prioridade de Implementação

### ✅ Fase 1: Autenticação (FEITO)
- [x] JWT com tenantId
- [x] Login/Logout
- [x] Middleware de autenticação
- [x] Bloqueio automático por expiração
- [x] Bloqueio automático por status

### ✅ Fase 2: Métricas (FEITO)
- [x] Dashboard por tenant
- [x] Métricas admin
- [x] Churn risk detection
- [x] Uso de limites

### ⏳ Fase 3: Migrar Services (PRÓXIMO - 30min cada)
Ordem recomendada:
1. empresasService (exemplo pronto)
2. clientesService 
3. produtosService
4. orcamentosService ⚠️ **Crítico - tem limite de plano**
5. ordensServicoService

**Padrão a seguir:**
```javascript
// Service recebe tenantId do JWT
async listar(tenantId) {
  return await pool.query(
    "SELECT * FROM tabela WHERE tenant_id = $1",
    [tenantId]
  );
}
```

### ⏳ Fase 4: Frontend (3-4h)
```javascript
// Configurar axios com JWT
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### ⏳ Fase 5: Beta com 3 Oficinas Reais
- Criar 3 tenants
- Testar isolamento
- Coletar feedback
- Iterar rápido

---

## 💰 Features que Geram Receita

### 1. Sistema de Upgrade Automático

Quando tenant atinge 80% do limite:
```javascript
return res.status(429).json({
  error: "Limite do plano atingido",
  usado: 80,
  limite: 100,
  upgrade_para: "premium",
  link: "/upgrade"
});
```

### 2. Bloqueio Inteligente

Tenant com plano vencido:
- ✅ Ainda pode ver dados (read-only)
- ❌ Não pode criar novos (write blocked)
- 🔔 Mensagem clara: "Renove para continuar"

### 3. Métricas de Uso

**Para você (admin):**
- Quem está usando muito? → Oferecer upgrade
- Quem está usando pouco? → Risco de churn, engajar
- Quem parou de logar? → Email de re-engajamento

---

## 🧪 Como Testar

### 1. Criar Tenant e Primeiro Usuário

```bash
# 1. Executar migration
npm run migrate:multi-tenant

# 2. Criar tenant com usuário admin
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "oficina-teste",
    "nome": "Oficina Teste",
    "email": "teste@oficina.com",
    "plano": "basic",
    "max_usuarios": 2,
    "max_orcamentos_mes": 100,
    "admin_email": "admin@oficina.com",
    "admin_senha": "senha123",
    "admin_nome": "Admin"
  }'
```

### 2. Fazer Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@oficina.com",
    "senha": "senha123"
  }'
```

Resposta:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "nome": "Admin",
    "email": "admin@oficina.com",
    "role": "admin",
    "tenantId": 2
  }
}
```

### 3. Usar o Token

```bash
# Todas as requisições agora usam o token
curl http://localhost:3000/api/metrics/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### 4. Testar Bloqueio por Limite

```bash
# Criar orçamentos até o limite (100)
# O 101º vai retornar erro 429 com mensagem de upgrade
```

### 5. Testar Bloqueio por Expiração

```sql
-- Simular expiração
UPDATE tenants SET data_expiracao = '2026-01-01' WHERE id = 2;

-- Tentar acessar
-- Deve retornar 403 com mensagem de plano expirado
```

---

## 📊 Métricas que Você Deve Acompanhar

### Para o Negócio:
1. **MRR** (Monthly Recurring Revenue)
   - Basic: R$ 97/mês x quantidade
   - Premium: R$ 197/mês x quantidade

2. **Churn Rate**
   - Quantos cancelaram no mês?
   - Por que cancelaram?

3. **Activation Rate**
   - Tenants que fizeram ≥ 10 orçamentos = ativados
   - Meta: 80% de activation

4. **Upgrade Rate**
   - Quantos fizeram upgrade de Basic → Premium?
   - Meta: 20% em 3 meses

### Para Produto:
1. Uso médio de orçamentos/mês
2. Uso médio de usuários
3. Features mais usadas
4. Tempo no sistema

---

## 🎯 Foco Agora

Você tem 2 caminhos:

### Caminho A: Produto (Tech Founder)
1. Terminar migração de services (6-8h)
2. Terminar frontend (4-6h)
3. Deploy (2h)
4. **Total: 12-16h**

### Caminho B: Validação (Business Founder) ⭐
1. Migrar apenas 3 services essenciais (3h)
   - Clientes
   - Orçamentos
   - Ordens de Serviço
2. MVP funcional (2h)
3. **Colocar 3 oficinas usando AGORA**
4. Coletar feedback REAL
5. Iterar baseado em feedback

**Recomendação: Caminho B**

Por quê?
- Validação mais rápida
- Feedback real vs especulação
- Menor risco de over-engineering
- Você descobre o que realmente importa

---

## 💡 Mentalidade Correta

### ❌ Pensamento de Engineer:
"Precisa de microserviços, Kubernetes, caching, websockets..."

### ✅ Pensamento de Founder:
"Precisa de 3 clientes pagando R$ 197/mês"

Para 50 oficinas:
- 1 servidor Render (R$ 50/mês)
- 1 banco Neon Postgres (R$ 100/mês)
- **Total: R$ 150/mês de infra**

Receita com 50 clientes Basic (R$ 97):
- **R$ 4.850/mês**

Margem: 97%

---

## 🚀 Próximo Passo AGORA

```bash
# 1. Rodar migration
npm run migrate:multi-tenant

# 2. Criar tenant de teste
# (usar curl acima)

# 3. Fazer login
# (usar curl acima)

# 4. Testar dashboard
curl /api/metrics/dashboard -H "Authorization: Bearer TOKEN"

# 5. Migrar clientesService (30min)
#    Seguir padrão do empresasService.EXAMPLE

# 6. Testar isolamento
# 7. Repetir para próximo service
```

---

## 📞 Arquivos Importantes

- **SETUP.md** - Como rodar tudo
- **authMiddleware.js** - Autenticação JWT
- **metricsService.js** - KPIs do negócio
- **empresasService.EXAMPLE.js** - Padrão de migração

---

**🎯 Lembre-se: O objetivo não é código perfeito, é receita recorrente.**

Para 10-50 oficinas, o que você tem já está MUITO acima do necessário.

Agora foque em:
1. ✅ Terminar autenticação (FEITO)
2. ⏳ Migrar 3 services principais
3. ⏳ 3 clientes reais usando
4. ⏳ Cobrar e receber primeira mensalidade

Depois disso, se tiver demanda, você melhora.

**O resto é over-engineering.**
