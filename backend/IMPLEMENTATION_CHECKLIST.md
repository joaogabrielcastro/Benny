# Checklist de Implementação Multi-Tenant

## ✅ Fase 1: Estrutura Base (CONCLUÍDA)

- [x] Criar migration SQL com tabelas `tenants` e `usuarios`
- [x] Adicionar `tenant_id` em todas as tabelas
- [x] Criar índices para performance
- [x] Criar middleware `tenantMiddleware.js`
- [x] Criar helper `tenantQuery.js`
- [x] Criar service `tenantsService.js`
- [x] Criar controller `tenantsController.js`
- [x] Criar rotas `tenantsRoutes.js`
- [x] Atualizar `index.js` das rotas
- [x] Criar documentação e guias

## 📋 Fase 2: Migração dos Services (TODO)

Adaptar todos os services existentes para usar `tenantId`:

### Services a Migrar:

- [ ] **agendamentosService.js**
  - [ ] Adicionar parâmetro `tenantId` em todos os métodos
  - [ ] Incluir `WHERE tenant_id = $N` em todas as queries
  - [ ] Incluir `tenant_id` em INSERTs
  
- [ ] **cepService.js** (não precisa - serviço externo)

- [ ] **contasPagarService.js**
  - [ ] Adicionar parâmetro `tenantId`
  - [ ] Atualizar todas as queries
  
- [ ] **empresasService.js** ⚠️ Use o arquivo EXAMPLE como referência
  - [ ] Adicionar parâmetro `tenantId`
  - [ ] Atualizar todas as queries
  
- [ ] **gatewayConfigsService.js**
  - [ ] Adicionar parâmetro `tenantId`
  - [ ] Atualizar todas as queries
  
- [ ] **lembretesService.js**
  - [ ] Adicionar parâmetro `tenantId`
  - [ ] Atualizar todas as queries
  
- [ ] **nfService.js**
  - [ ] Adicionar parâmetro `tenantId`
  - [ ] Atualizar todas as queries

### Services no Server.js (Monolito)

O arquivo `server.js` ainda contém rotas inline. Migrar para MVC:

- [ ] **Produtos**
  - [ ] Criar `produtosService.js` com tenant_id
  - [ ] Criar `produtosController.js`
  - [ ] Criar `produtosRoutes.js`
  - [ ] Remover do server.js
  
- [ ] **Clientes**
  - [ ] Criar `clientesService.js` com tenant_id
  - [ ] Criar `clientesController.js`
  - [ ] Criar `clientesRoutes.js`
  - [ ] Remover do server.js
  
- [ ] **Veículos**
  - [ ] Criar `veiculosService.js` com tenant_id
  - [ ] Criar `veiculosController.js`
  - [ ] Criar `veiculosRoutes.js`
  - [ ] Remover do server.js
  
- [ ] **Orçamentos**
  - [ ] Criar `orcamentosService.js` com tenant_id
  - [ ] Criar `orcamentosController.js`
  - [ ] Criar `orcamentosRoutes.js`
  - [ ] Remover do server.js
  
- [ ] **Ordens de Serviço**
  - [ ] Criar `ordensServicoService.js` com tenant_id
  - [ ] Criar `ordensServicoController.js`
  - [ ] Criar `ordensServicoRoutes.js`
  - [ ] Remover do server.js
  
- [ ] **Movimentações de Estoque**
  - [ ] Criar `estoqueService.js` com tenant_id
  - [ ] Criar `estoqueController.js`
  - [ ] Criar `estoqueRoutes.js`
  - [ ] Remover do server.js

## 📋 Fase 3: Atualizar Controllers (TODO)

Todos os controllers devem:

- [ ] Validar `req.tenantId` no início de cada método
- [ ] Passar `req.tenantId` para os services
- [ ] Retornar erro 401 se tenant não identificado
- [ ] Nunca expor existência de recursos de outro tenant

### Controllers a Atualizar:

- [ ] agendamentosController.js
- [ ] contasPagarController.js
- [ ] lembretesController.js (se existir)
- [ ] Todos os novos controllers dos services acima

## 📋 Fase 4: Workers e Jobs (TODO)

- [ ] **nfWorker.js**
  - [ ] Incluir tenant_id no processamento
  - [ ] Garantir isolamento nas filas
  
- [ ] **Jobs de lembretes**
  - [ ] Filtrar por tenant_id
  
- [ ] **Jobs de recorrência**
  - [ ] Filtrar por tenant_id

## 📋 Fase 5: Autenticação e Autorização (TODO)

- [ ] Criar middleware de autenticação JWT
  - [ ] Incluir `tenant_id` no payload do JWT
  - [ ] Validar tenant_id do token vs tenant_id do header
  
- [ ] Criar service de autenticação
  - [ ] Login por email + senha + tenant
  - [ ] Registro de usuários
  - [ ] Recuperação de senha
  
- [ ] Implementar RBAC (Role-Based Access Control)
  - [ ] Admin (full access)
  - [ ] User (limited access)
  - [ ] Viewer (read-only)
  
- [ ] Criar middleware de permissões
  - [ ] Validar role do usuário
  - [ ] Validar acesso a recursos

## 📋 Fase 6: Frontend (TODO)

- [ ] Adicionar seletor de tenant no login
- [ ] Armazenar tenant_id no localStorage/cookie
- [ ] Incluir X-Tenant-ID em todas as requisições axios
- [ ] Criar contexto de tenant no React
- [ ] Atualizar todas as páginas para usar tenant context

### Exemplo de configuração Axios:

```javascript
// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// Interceptor para adicionar tenant_id
api.interceptors.request.use(config => {
  const tenantId = localStorage.getItem('tenant_id');
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId;
  }
  return config;
});

export default api;
```

## 📋 Fase 7: Segurança Avançada (OPCIONAL)

- [ ] Implementar Row-Level Security (RLS) no PostgreSQL
  - [ ] CREATE POLICY para cada tabela
  - [ ] SET app.current_tenant antes das queries
  
- [ ] Audit logging por tenant
  - [ ] Registrar todas as ações
  - [ ] Timestamps e usuário responsável
  
- [ ] Rate limiting por tenant
  - [ ] Limitar requisições por minuto
  - [ ] Prevenir abuso
  
- [ ] Criptografia de dados sensíveis
  - [ ] Criptografar CNPJ, CPF
  - [ ] Usar chaves por tenant

## 📋 Fase 8: Testes (TODO)

- [ ] Testes unitários dos services
  - [ ] Validar tenant_id em todas as operações
  
- [ ] Testes de integração
  - [ ] Criar dados em múltiplos tenants
  - [ ] Validar isolamento
  
- [ ] Testes de segurança
  - [ ] Tentar acessar dados de outro tenant
  - [ ] Validar que retorna 404 (não 403)
  
- [ ] Testes de performance
  - [ ] Queries com índices tenant_id
  - [ ] Benchmark com múltiplos tenants

## 📋 Fase 9: Administração (TODO)

- [ ] Painel admin de tenants
  - [ ] Listar todos os tenants
  - [ ] Ver estatísticas
  - [ ] Suspender/reativar
  
- [ ] Sistema de billing
  - [ ] Tracking de uso por tenant
  - [ ] Limites por plano
  - [ ] Pagamentos
  
- [ ] Backups por tenant
  - [ ] Export de dados por tenant
  - [ ] Restore seletivo

## 📋 Fase 10: Deploy (TODO)

- [ ] Configurar variáveis de ambiente
  - [ ] DATABASE_URL
  - [ ] JWT_SECRET
  
- [ ] Executar migration em produção
  - [ ] Backup antes da migration
  - [ ] Executar 001_add_multi_tenant.sql
  
- [ ] Configurar DNS para subdomains
  - [ ] *.seudominio.com → seu servidor
  
- [ ] Monitoramento
  - [ ] Logs por tenant
  - [ ] Alertas de limite

## 🚀 Como Executar Cada Fase

### Fase 1 (Base):
```bash
node run-multi-tenant-migration.js
```

### Fase 2-4 (Migração de Services):
Para cada service:
1. Abrir o arquivo .EXAMPLE
2. Copiar o padrão
3. Aplicar no service original
4. Testar com Postman

### Fase 5 (Auth):
```bash
npm install jsonwebtoken bcrypt
# Criar authMiddleware.js e authService.js
```

### Fase 6 (Frontend):
```bash
cd frontend
# Atualizar api.js com interceptor
```

## 📊 Progresso Atual

- ✅ Estrutura Base: 100%
- ⏳ Migração Services: 0%
- ⏳ Controllers: 0%
- ⏳ Workers: 0%
- ⏳ Autenticação: 0%
- ⏳ Frontend: 0%
- ⏳ Testes: 0%
- ⏳ Admin: 0%
- ⏳ Deploy: 0%

**Total: ~10% concluído**

## 🎯 Próximo Passo Imediato

1. **Executar a migration:**
   ```bash
   node run-multi-tenant-migration.js
   ```

2. **Testar criação de tenant:**
   ```bash
   curl -X POST http://localhost:3000/api/tenants \
     -H "Content-Type: application/json" \
     -d '{"slug":"teste","nome":"Teste","email":"teste@teste.com"}'
   ```

3. **Migrar primeiro service (empresasService.js):**
   - Usar o arquivo .EXAMPLE como base
   - Atualizar todas as queries
   - Testar isolamento

4. **Repetir para todos os outros services**

## 💡 Dicas

- Sempre teste o isolamento após cada migração
- Use `X-Tenant-ID` nos headers para testar
- Valide que queries incluem `WHERE tenant_id = $N`
- Nunca retorne 403 para recursos de outro tenant (use 404)
- Mantenha logs de auditoria
