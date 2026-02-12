# 🏢 Multi-Tenant Implementation - Benny

Sistema multi-tenant implementado usando **row-level isolation** no PostgreSQL.

## 📚 O que foi criado?

### Arquivos de Estrutura
- ✅ `migrations/001_add_multi_tenant.sql` - Migration completa
- ✅ `MULTI_TENANT_GUIDE.md` - Guia arquitetural
- ✅ `IMPLEMENTATION_CHECKLIST.md` - Checklist de implementação
- ✅ `TESTING_MULTI_TENANT.md` - Guia de testes

### Middleware e Helpers
- ✅ `src/middleware/tenantMiddleware.js` - Identificação automática do tenant
- ✅ `src/utils/tenantQuery.js` - Helper para queries seguras

### Services e Controllers
- ✅ `src/services/tenantsService.js` - Gerenciamento de tenants
- ✅ `src/controllers/tenantsController.js` - API de tenants
- ✅ `src/routes/tenantsRoutes.js` - Rotas de tenants

### Exemplos
- ✅ `src/services/empresasService.EXAMPLE.js` - Exemplo de service migrado
- ✅ `src/controllers/empresasController.EXAMPLE.js` - Exemplo de controller migrado

### Scripts
- ✅ `run-multi-tenant-migration.js` - Executa a migration
- ✅ `validate-multi-tenant.js` - Valida progresso da migração

## 🚀 Quick Start

### 1. Executar Migration

```bash
node run-multi-tenant-migration.js
```

### 2. Iniciar Servidor

```bash
npm run dev
```

### 3. Criar Primeiro Tenant

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "minha-oficina",
    "nome": "Minha Oficina",
    "email": "contato@minhaoficina.com",
    "plano": "premium"
  }'
```

### 4. Usar nas Requisições

Adicione o header em todas as requisições:

```bash
curl http://localhost:3000/api/clientes \
  -H "X-Tenant-ID: 1"
```

## 📖 Como Funciona?

### Identificação do Tenant

O sistema suporta 3 formas de identificar o tenant:

1. **Header X-Tenant-ID** (recomendado para desenvolvimento)
   ```
   X-Tenant-ID: 1
   ```

2. **Header X-Tenant-Slug**
   ```
   X-Tenant-Slug: minha-oficina
   ```

3. **Subdomain** (recomendado para produção)
   ```
   minha-oficina.seudominio.com
   ```

### Isolamento de Dados

Todos os dados são automaticamente isolados por tenant:

```javascript
// ❌ ANTES (sem multi-tenant)
SELECT * FROM clientes WHERE id = 1

// ✅ DEPOIS (com multi-tenant)
SELECT * FROM clientes WHERE id = 1 AND tenant_id = 2
```

### Segurança

- ✅ Impossível acessar dados de outro tenant
- ✅ Tentativas de acesso cross-tenant retornam 404
- ✅ Validação em múltiplas camadas (middleware + service + database)

## 🔧 Migração de Services Existentes

### Passo a Passo

1. **Abra o arquivo `.EXAMPLE`**
   ```bash
   code src/services/empresasService.EXAMPLE.js
   ```

2. **Copie o padrão para seu service**
   - Adicione parâmetro `tenantId` em todos os métodos
   - Inclua `WHERE tenant_id = $N` em SELECTs
   - Inclua `tenant_id` em INSERTs
   - Inclua `WHERE tenant_id = $N` em UPDATEs e DELETEs

3. **Atualize o controller correspondente**
   ```javascript
   // Extrair tenant do middleware
   const tenantId = req.tenantId;
   
   // Passar para o service
   const result = await service.metodo(data, tenantId);
   ```

4. **Valide o progresso**
   ```bash
   node validate-multi-tenant.js
   ```

### Exemplo Prático

```javascript
// ANTES
async criarCliente(data) {
  const result = await pool.query(
    'INSERT INTO clientes (nome, telefone) VALUES ($1, $2) RETURNING *',
    [data.nome, data.telefone]
  );
  return result.rows[0];
}

// DEPOIS
async criarCliente(data, tenantId) {
  if (!tenantId) throw new Error('tenantId é obrigatório');
  
  const result = await pool.query(
    'INSERT INTO clientes (tenant_id, nome, telefone) VALUES ($1, $2, $3) RETURNING *',
    [tenantId, data.nome, data.telefone]
  );
  return result.rows[0];
}
```

## 📊 Validar Progresso

Execute o script de validação para ver quais services já foram migrados:

```bash
node validate-multi-tenant.js
```

Saída esperada:
```
📊 RELATÓRIO DE MIGRAÇÃO MULTI-TENANT

┌─────────────────────────────────────┬────────┬──────────┬──────────┬─────────┐
│ Service                             │ Status │ Métodos  │ WHERE    │ Score   │
├─────────────────────────────────────┼────────┼──────────┼──────────┼─────────┤
│ empresasService.js                  │ ✅      │ 5/5      │ 8        │ 100%    │
│ clientesService.js                  │ 🔄      │ 2/5      │ 3        │ 40%     │
│ produtosService.js                  │ ❌      │ 0/5      │ 0        │ 0%      │
└─────────────────────────────────────┴────────┴──────────┴──────────┴─────────┘

🎯 Progresso: [████████░░░░░░░░░░░░░░░░░░░░] 33%
```

## 🧪 Testes

### Testar Isolamento

```bash
# Criar cliente no tenant 1
curl -X POST http://localhost:3000/api/clientes \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Cliente Tenant 1","telefone":"11988887777"}'

# Criar cliente no tenant 2
curl -X POST http://localhost:3000/api/clientes \
  -H "X-Tenant-ID: 2" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Cliente Tenant 2","telefone":"11977776666"}'

# Listar clientes do tenant 1 (só vê os dele)
curl http://localhost:3000/api/clientes -H "X-Tenant-ID: 1"

# Listar clientes do tenant 2 (só vê os dele)
curl http://localhost:3000/api/clientes -H "X-Tenant-ID: 2"
```

### Testar Segurança Cross-Tenant

```bash
# Tentar acessar cliente do tenant 1 usando credenciais do tenant 2
curl http://localhost:3000/api/clientes/1 -H "X-Tenant-ID: 2"
# Deve retornar 404 (não 403!)
```

## 📚 Documentação Completa

- 📘 **[MULTI_TENANT_GUIDE.md](MULTI_TENANT_GUIDE.md)** - Arquitetura e conceitos
- 📗 **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** - Checklist completo
- 📙 **[TESTING_MULTI_TENANT.md](TESTING_MULTI_TENANT.md)** - Guia de testes detalhado

## 🎯 Status Atual

- ✅ Estrutura base criada (100%)
- ⏳ Migração de services (0%)
- ⏳ Migração de controllers (0%)
- ⏳ Frontend (0%)
- ⏳ Autenticação JWT (0%)

**Total: ~10% concluído**

## 📋 Próximos Passos

1. ✅ Executar migration
2. ✅ Testar criação de tenant
3. ⏳ Migrar primeiro service (empresasService)
4. ⏳ Migrar todos os outros services
5. ⏳ Atualizar controllers
6. ⏳ Implementar autenticação JWT
7. ⏳ Adaptar frontend

## 🐛 Troubleshooting

### "Tenant não identificado"
- Verifique se está enviando o header `X-Tenant-ID`
- Verifique se o tenant existe: `SELECT * FROM tenants`

### "Column tenant_id does not exist"
- Execute a migration: `node run-multi-tenant-migration.js`

### Dados de outro tenant aparecem
- **PROBLEMA CRÍTICO!** Revise as queries
- Certifique-se: `WHERE tenant_id = $N` em todos os SELECTs

## 💡 Dicas

- Sempre teste o isolamento após migrar um service
- Use `X-Tenant-ID` nos headers do Postman/Insomnia
- Nunca retorne 403 para recursos de outro tenant (use 404)
- Execute `validate-multi-tenant.js` regularmente
- Consulte os arquivos `.EXAMPLE` como referência

## 🤝 Contribuindo

Para adicionar novos services:

1. Crie o service seguindo o padrão `.EXAMPLE`
2. Adicione `tenantId` em todos os métodos
3. Inclua `WHERE tenant_id = $N` em queries
4. Valide com `node validate-multi-tenant.js`
5. Teste o isolamento

## 📞 Suporte

Consulte a documentação:
- Arquitetura: `MULTI_TENANT_GUIDE.md`
- Implementação: `IMPLEMENTATION_CHECKLIST.md`
- Testes: `TESTING_MULTI_TENANT.md`

---

**Desenvolvido com ❤️ para o Benny**
