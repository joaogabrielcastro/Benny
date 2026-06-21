# Setup Multi-Tenant - Passo a Passo

## 📦 1. Instalar Dependências

O sistema multi-tenant requer o `bcrypt` para hash de senhas:

```bash
cd backend
npm install bcrypt
```

## 🗄️ 2. Configurar Banco de Dados

Certifique-se de que o `backend/.env` está configurado (copie de `.env.example`):

```env
# Docker local (porta 5433 publicada pelo compose)
DATABASE_URL=postgresql://benny:benny_dev_secret@localhost:5433/benny?sslmode=disable

# Ou PostgreSQL local / Coolify em produção
# DATABASE_URL=postgresql://user:password@host:5432/benny?sslmode=disable
```

Ambiente Docker completo: veja `docs/DOCKER.md` na raiz do projeto.

## 🚀 3. Executar Migration

```bash
npm run migrate:multi-tenant
```

Isso irá:
- ✅ Criar tabela `tenants`
- ✅ Criar tabela `usuarios`
- ✅ Adicionar `tenant_id` em todas as tabelas
- ✅ Criar índices para performance
- ✅ Criar tenant padrão "oficina-principal"

**Saída esperada:**
```
🚀 Iniciando migração Multi-Tenant...

✅ Migration executada com sucesso!

📊 Tenants encontrados: 1

Tenants:
  - Oficina Principal (oficina-principal) - Status: active

✨ Migração concluída!
```

## ▶️ 4. Iniciar Servidor

```bash
npm run dev
```

## 🧪 5. Testar API

### Criar primeiro tenant

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "teste-oficina",
    "nome": "Teste Oficina",
    "email": "teste@oficina.com",
    "plano": "basic"
  }'
```

### Verificar tenant atual

```bash
curl http://localhost:3000/api/tenants/current \
  -H "X-Tenant-ID: 1"
```

### Ver estatísticas

```bash
curl http://localhost:3000/api/tenants/current/stats \
  -H "X-Tenant-ID: 1"
```

## 📊 6. Validar Progresso

```bash
npm run validate:multi-tenant
```

Isso mostra quais services já foram migrados:

```
📊 RELATÓRIO DE MIGRAÇÃO MULTI-TENANT

┌─────────────────────────────────────┬────────┬──────────┬──────────┬─────────┐
│ Service                             │ Status │ Métodos  │ WHERE    │ Score   │
├─────────────────────────────────────┼────────┼──────────┼──────────┼─────────┤
│ tenantsService.js                   │ ✅      │ 10/10    │ 15       │ 100%    │
│ empresasService.js                  │ ❌      │ 0/3      │ 0        │ 0%      │
└─────────────────────────────────────┴────────┴──────────┴──────────┴─────────┘

🎯 Progresso: [███░░░░░░░░░░░░░░░░░░░░░░░░░░░] 10%
```

## 🔧 7. Migrar Services Existentes

### Exemplo: empresasService.js

#### Antes (sem multi-tenant):
```javascript
async listar() {
  const result = await pool.query(
    "SELECT * FROM empresas ORDER BY id DESC"
  );
  return result.rows;
}
```

#### Depois (com multi-tenant):
```javascript
async listar(tenantId) {
  if (!tenantId) {
    throw new Error("tenantId é obrigatório");
  }
  
  const result = await pool.query(
    "SELECT * FROM empresas WHERE tenant_id = $1 ORDER BY id DESC",
    [tenantId]
  );
  return result.rows;
}
```

### Atualizar Controller:

```javascript
async listar(req, res) {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({
        error: "Tenant não identificado"
      });
    }
    
    const empresas = await empresasService.listar(tenantId);
    res.json({ empresas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

## 📝 8. Checklist de Migration por Service

Para cada service (ex: clientesService, produtosService, etc):

- [ ] Adicionar parâmetro `tenantId` em **TODOS** os métodos
- [ ] Validar `tenantId` no início de cada método
- [ ] Incluir `WHERE tenant_id = $N` em **TODOS** os SELECTs
- [ ] Incluir `tenant_id` no VALUES de **TODOS** os INSERTs
- [ ] Incluir `WHERE tenant_id = $N` em **TODOS** os UPDATEs
- [ ] Incluir `WHERE tenant_id = $N` em **TODOS** os DELETEs
- [ ] Atualizar controller para passar `req.tenantId`
- [ ] Testar isolamento de dados

## 🧪 9. Testar Isolamento

```bash
# Criar cliente no tenant 1
curl -X POST http://localhost:3000/api/clientes \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Cliente T1","telefone":"11111111111"}'

# Criar cliente no tenant 2
curl -X POST http://localhost:3000/api/clientes \
  -H "X-Tenant-ID: 2" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Cliente T2","telefone":"22222222222"}'

# Listar cliente do tenant 1 (só deve ver o dele)
curl http://localhost:3000/api/clientes -H "X-Tenant-ID: 1"

# Listar cliente do tenant 2 (só deve ver o dele)
curl http://localhost:3000/api/clientes -H "X-Tenant-ID: 2"

# Tentar acessar cliente do T1 usando T2 (deve retornar 404)
curl http://localhost:3000/api/clientes/1 -H "X-Tenant-ID: 2"
```

## 🐛 10. Troubleshooting

### Erro: "bcrypt not found"
```bash
npm install bcrypt
```

### Erro: "column tenant_id does not exist"
```bash
# Re-executar migration
npm run migrate:multi-tenant
```

### Erro: "Tenant não identificado"
```bash
# Certifique-se de enviar o header
curl http://localhost:3000/api/clientes \
  -H "X-Tenant-ID: 1"
```

### Dados aparecem de outro tenant
**PROBLEMA CRÍTICO!** 
- Verifique se a query inclui `WHERE tenant_id = $N`
- Execute `npm run validate:multi-tenant` para ver o score
- Revise o service seguindo o arquivo `.EXAMPLE`

## 📚 11. Próximos Passos

### Services a Migrar:
1. ✅ tenantsService (já feito)
2. ⏳ empresasService
3. ⏳ clientesService (criar)
4. ⏳ produtosService (criar)
5. ⏳ veiculosService (criar)
6. ⏳ orcamentosService (criar)
7. ⏳ ordensServicoService (criar)
8. ⏳ agendamentosService
9. ⏳ contasPagarService
10. ⏳ lembretesService
11. ⏳ nfService

### Implementações Futuras:
- [ ] Autenticação JWT com tenant_id
- [ ] Middleware de permissões (RBAC)
- [ ] Frontend - Context de tenant
- [ ] Row-Level Security (RLS) no PostgreSQL
- [ ] Logs de auditoria por tenant
- [ ] Sistema de billing/cobrança

## 📖 12. Documentação

- **[README_MULTI_TENANT.md](README_MULTI_TENANT.md)** - Visão geral
- **[MULTI_TENANT_GUIDE.md](MULTI_TENANT_GUIDE.md)** - Guia arquitetural
- **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** - Checklist completo
- **[TESTING_MULTI_TENANT.md](TESTING_MULTI_TENANT.md)** - Guia de testes
- **[API_EXAMPLES.md](API_EXAMPLES.md)** - Exemplos de uso da API

## ✅ 13. Verificação Final

Antes de considerar a migração completa:

```bash
# 1. Validar todos os services
npm run validate:multi-tenant

# 2. Testar criação em múltiplos tenants
# (ver TESTING_MULTI_TENANT.md)

# 3. Verificar isolamento de dados
# (tentativas de cross-tenant devem retornar 404)

# 4. Validar limites de plano
# (criar mais recursos que o limite permite)

# 5. Performance
# (verificar se os índices tenant_id estão sendo usados)
```

## 🎉 Conclusão

Após seguir todos os passos:

- ✅ Banco de dados preparado para multi-tenant
- ✅ Middleware de tenant funcionando
- ✅ API de gerenciamento de tenants pronta
- ✅ Helpers para queries seguras criados
- ⏳ Services precisam ser migrados individualmente

**Tempo estimado:** 1-2 horas para cada service

---

**💡 Dica:** Comece migrando um service pequeno (ex: empresasService) para pegar o jeito, depois os maiores ficam mais fáceis!
