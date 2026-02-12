# Guia de Implementação Multi-Tenant

## Arquitetura Escolhida: Row-Level Isolation

Todos os tenants (oficinas) compartilham o mesmo banco de dados e schema, mas cada registro possui um `tenant_id` que garante o isolamento dos dados.

### Vantagens:
- ✅ Economicidade (um único banco)
- ✅ Fácil manutenção e updates
- ✅ Backup simplificado
- ✅ Escalabilidade horizontal

### Como Funciona:

1. **Identificação do Tenant**: 
   - Via subdomain: `oficina1.seudominio.com`
   - Via header: `X-Tenant-ID`
   - Via token JWT (inclui tenant_id no payload)

2. **Isolamento de Dados**:
   - Todas as queries automaticamente filtram por `tenant_id`
   - Middleware valida e injeta o tenant no contexto da requisição
   - Impossível acessar dados de outro tenant

3. **Segurança**:
   - Row-Level Security (RLS) no PostgreSQL (opcional)
   - Validação em múltiplas camadas
   - Logs de auditoria por tenant

## Estrutura de Tabelas

### Tabela Principal: `tenants`
```sql
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,  -- identificador único (ex: oficina-silva)
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20) UNIQUE,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',  -- active, suspended, canceled
  plano VARCHAR(50) DEFAULT 'basic',    -- basic, premium, enterprise
  data_expiracao DATE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  configuracoes JSONB DEFAULT '{}'     -- configurações personalizadas
);
```

### Todas as tabelas principais recebem:
```sql
ALTER TABLE <tabela> ADD COLUMN tenant_id INTEGER NOT NULL REFERENCES tenants(id);
CREATE INDEX idx_<tabela>_tenant ON <tabela>(tenant_id);
```

## Fluxo de Requisição

```
Cliente → [Header/Subdomain] → Middleware Tenant → Controller → Service → Database
                                      ↓
                                 req.tenant = {...}
                                      ↓
                                 WHERE tenant_id = $1
```

## Arquivos Criados/Modificados

### Novos Arquivos:
- `database-multi-tenant.js` - Schema com tenant_id
- `src/middleware/tenantMiddleware.js` - Identificação do tenant
- `src/middleware/authMiddleware.js` - Autenticação por tenant
- `src/utils/tenantQuery.js` - Helper para queries com tenant
- `src/services/tenantsService.js` - Gerenciamento de tenants
- `src/controllers/tenantsController.js` - API de tenants
- `src/routes/tenantsRoutes.js` - Rotas de tenants

### Modificados:
- Todos os services em `src/services/` - Usar tenantQuery helper
- Todos os controllers - Validar tenant do request
- `server.js` - Adicionar middleware de tenant

## Próximos Passos

1. ✅ Executar migration para adicionar tenant_id
2. ✅ Configurar middleware de tenant
3. ✅ Atualizar todos os services
4. ✅ Criar painel admin de tenants
5. ✅ Testar isolamento de dados
