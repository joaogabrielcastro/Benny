# Como Testar o Sistema Multi-Tenant

## 1. Executar a Migration

```bash
cd backend
node run-multi-tenant-migration.js
```

Isso irá:
- Criar tabela `tenants`
- Criar tabela `usuarios`
- Adicionar `tenant_id` em todas as tabelas
- Criar um tenant padrão chamado "oficina-principal"

## 2. Iniciar o Servidor

```bash
npm run dev
```

## 3. Criar um Novo Tenant

### Método 1: Via API REST

```bash
# Criar tenant
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "oficina-silva",
    "nome": "Oficina Silva Mecânica",
    "cnpj": "12.345.678/0001-90",
    "email": "contato@oficinasilva.com",
    "telefone": "(11) 98765-4321",
    "plano": "premium",
    "admin_email": "admin@oficinasilva.com",
    "admin_senha": "senha123",
    "admin_nome": "João Silva",
    "empresa_nome": "Silva Mecânica Ltda"
  }'
```

Resposta:
```json
{
  "message": "Tenant criado com sucesso",
  "tenant": {
    "id": 2,
    "slug": "oficina-silva",
    "nome": "Oficina Silva Mecânica",
    "status": "active",
    "plano": "premium"
  }
}
```

## 4. Usar o Tenant nas Requisições

Existem 3 formas de identificar o tenant:

### Opção 1: Header X-Tenant-ID (recomendado)

```bash
# Listar empresas do tenant ID 2
curl http://localhost:3000/api/empresas \
  -H "X-Tenant-ID: 2"
```

### Opção 2: Header X-Tenant-Slug

```bash
curl http://localhost:3000/api/empresas \
  -H "X-Tenant-Slug: oficina-silva"
```

### Opção 3: Subdomain (requer configuração DNS)

```bash
# oficina-silva.seudominio.com automaticamente identifica o tenant
curl http://oficina-silva.seudominio.com/api/empresas
```

## 5. Testar Isolamento de Dados

### Criar dados no Tenant 1

```bash
# Criar cliente no tenant 1
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 1" \
  -d '{
    "nome": "Cliente Tenant 1",
    "telefone": "11988887777",
    "cpf_cnpj": "123.456.789-00"
  }'
```

### Criar dados no Tenant 2

```bash
# Criar cliente no tenant 2
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 2" \
  -d '{
    "nome": "Cliente Tenant 2",
    "telefone": "11977776666",
    "cpf_cnpj": "987.654.321-00"
  }'
```

### Verificar Isolamento

```bash
# Listar clientes do tenant 1 (só vê os dele)
curl http://localhost:3000/api/clientes \
  -H "X-Tenant-ID: 1"

# Listar clientes do tenant 2 (só vê os dele)
curl http://localhost:3000/api/clientes \
  -H "X-Tenant-ID: 2"
```

## 6. Testar Segurança Cross-Tenant

```bash
# Tentar buscar cliente do tenant 1 usando tenant 2
# Deve retornar 404 (não encontrado) mesmo que o ID exista
curl http://localhost:3000/api/clientes/1 \
  -H "X-Tenant-ID: 2"
```

**Resultado esperado:** 404 Not Found (isolamento funcionando!)

## 7. Obter Estatísticas do Tenant

```bash
# Ver estatísticas do tenant atual
curl http://localhost:3000/api/tenants/current/stats \
  -H "X-Tenant-ID: 2"
```

Resposta:
```json
{
  "total_clientes": 150,
  "total_veiculos": 320,
  "total_orcamentos": 450,
  "total_os": 380,
  "total_produtos": 89,
  "total_usuarios": 3,
  "orcamentos_mes_atual": 45,
  "receita_total": "125450.00"
}
```

## 8. Gerenciar Tenants (Admin)

### Listar todos os tenants

```bash
curl http://localhost:3000/api/tenants
```

### Suspender um tenant

```bash
curl -X POST http://localhost:3000/api/tenants/2/suspend \
  -H "Content-Type: application/json" \
  -d '{"motivo": "Pagamento em atraso"}'
```

### Reativar tenant

```bash
curl -X POST http://localhost:3000/api/tenants/2/reactivate
```

## 9. Testar Limites de Plano

```bash
# Tentar criar mais orçamentos do que o plano permite
# (Configurado em max_orcamentos_mes)
for i in {1..150}; do
  curl -X POST http://localhost:3000/api/orcamentos \
    -H "Content-Type: application/json" \
    -H "X-Tenant-ID: 2" \
    -d '{...}'
done
```

Quando atingir o limite, receberá:
```json
{
  "error": "Limite excedido",
  "message": "Você atingiu o limite de 100 orçamentos por mês",
  "limite": 100,
  "usado": 100
}
```

## 10. Testes com Postman/Insomnia

1. Crie uma coleção "Multi-Tenant"
2. Configure environment variable `tenant_id`
3. Adicione header global: `X-Tenant-ID: {{tenant_id}}`
4. Teste todas as rotas alternando o tenant_id

## Estrutura de Testes Recomendada

```javascript
// test/multi-tenant.test.js
describe('Multi-Tenant Isolation', () => {
  it('should isolate data between tenants', async () => {
    // Criar dados no tenant 1
    // Criar dados no tenant 2
    // Verificar que tenant 1 não vê dados do tenant 2
    // Verificar que tenant 2 não vê dados do tenant 1
  });

  it('should prevent cross-tenant access', async () => {
    // Tentar acessar recurso de outro tenant
    // Deve retornar 404
  });

  it('should enforce plan limits', async () => {
    // Criar recursos até o limite
    // Próxima tentativa deve falhar com 429
  });
});
```

## Troubleshooting

### Erro: "Tenant não identificado"
- Verifique se está enviando o header X-Tenant-ID ou X-Tenant-Slug
- Verifique se o tenant existe no banco

### Erro: "Tenant expirado"
- Verifique a coluna `data_expiracao` na tabela tenants
- Atualize ou remova a data de expiração

### Dados aparecem de outro tenant
- PROBLEMA CRÍTICO! Revise as queries
- Certifique-se de que todas incluem WHERE tenant_id = $N

## Próximas Implementações

- [ ] Autenticação JWT com tenant_id no payload
- [ ] Row-Level Security (RLS) no PostgreSQL
- [ ] Painel admin para gerenciar tenants
- [ ] Migração automática de dados existentes
- [ ] Logs de auditoria por tenant
- [ ] Billing/cobrança por tenant
