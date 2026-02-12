# API Multi-Tenant - Exemplos de Uso

## 📡 Endpoints Disponíveis

### Tenants Management

#### 1. Criar Novo Tenant
```bash
POST /api/tenants
Content-Type: application/json

{
  "slug": "oficina-silva",
  "nome": "Oficina Silva Mecânica",
  "cnpj": "12.345.678/0001-90",
  "email": "contato@oficinasilva.com",
  "telefone": "(11) 98765-4321",
  "plano": "premium",
  "max_usuarios": 10,
  "max_orcamentos_mes": 200,
  "admin_email": "admin@oficinasilva.com",
  "admin_senha": "senha-segura-123",
  "admin_nome": "João Silva",
  "empresa_nome": "Silva Mecânica Ltda"
}
```

**Resposta (201):**
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

#### 2. Listar Todos os Tenants
```bash
GET /api/tenants
```

**Resposta:**
```json
{
  "total": 2,
  "tenants": [
    {
      "id": 1,
      "slug": "oficina-principal",
      "nome": "Oficina Principal",
      "status": "active",
      "plano": "basic",
      "criado_em": "2026-02-11T10:00:00.000Z"
    },
    {
      "id": 2,
      "slug": "oficina-silva",
      "nome": "Oficina Silva Mecânica",
      "status": "active",
      "plano": "premium",
      "criado_em": "2026-02-11T11:30:00.000Z"
    }
  ]
}
```

#### 3. Buscar Tenant por Slug
```bash
GET /api/tenants/slug/oficina-silva
```

#### 4. Obter Tenant Atual
```bash
GET /api/tenants/current
Headers:
  X-Tenant-ID: 2
```

**Resposta:**
```json
{
  "id": 2,
  "slug": "oficina-silva",
  "nome": "Oficina Silva Mecânica",
  "email": "contato@oficinasilva.com",
  "status": "active",
  "plano": "premium",
  "max_usuarios": 10,
  "max_orcamentos_mes": 200
}
```

#### 5. Estatísticas do Tenant
```bash
GET /api/tenants/current/stats
Headers:
  X-Tenant-ID: 2
```

**Resposta:**
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

#### 6. Atualizar Tenant
```bash
PUT /api/tenants/2
Content-Type: application/json

{
  "plano": "enterprise",
  "max_orcamentos_mes": 500,
  "data_expiracao": "2027-02-11"
}
```

#### 7. Suspender Tenant
```bash
POST /api/tenants/2/suspend
Content-Type: application/json

{
  "motivo": "Pagamento em atraso"
}
```

#### 8. Reativar Tenant
```bash
POST /api/tenants/2/reactivate
```

---

## 🔐 Usando Headers para Identificar Tenant

Todas as rotas protegidas requerem identificação do tenant:

### Opção 1: X-Tenant-ID (recomendado)
```bash
GET /api/clientes
Headers:
  X-Tenant-ID: 2
```

### Opção 2: X-Tenant-Slug
```bash
GET /api/clientes
Headers:
  X-Tenant-Slug: oficina-silva
```

### Opção 3: Subdomain
```bash
GET http://oficina-silva.seudominio.com/api/clientes
```

---

## 📝 Exemplos com Outras Entidades

Todos esses exemplos assumem que você está enviando o header `X-Tenant-ID`.

### Clientes

```bash
# Criar cliente
POST /api/clientes
Headers:
  X-Tenant-ID: 2
  Content-Type: application/json

{
  "nome": "João da Silva",
  "telefone": "(11) 98765-4321",
  "cpf_cnpj": "123.456.789-00",
  "email": "joao@email.com",
  "endereco": "Rua A, 123",
  "cidade": "São Paulo",
  "estado": "SP"
}

# Listar clientes (só do tenant 2)
GET /api/clientes
Headers:
  X-Tenant-ID: 2

# Buscar cliente por ID (com validação de tenant)
GET /api/clientes/1
Headers:
  X-Tenant-ID: 2
```

### Produtos

```bash
# Criar produto
POST /api/produtos
Headers:
  X-Tenant-ID: 2
  Content-Type: application/json

{
  "codigo": "PROD001",
  "nome": "Óleo 5W30",
  "quantidade": 50,
  "valor_custo": 25.00,
  "valor_venda": 45.00,
  "estoque_minimo": 10
}

# Listar produtos (só do tenant 2)
GET /api/produtos
Headers:
  X-Tenant-ID: 2
```

### Orçamentos

```bash
# Criar orçamento
POST /api/orcamentos
Headers:
  X-Tenant-ID: 2
  Content-Type: application/json

{
  "cliente_id": 5,
  "veiculo_id": 12,
  "observacoes_gerais": "Revisão completa",
  "produtos": [
    {
      "produto_id": 1,
      "quantidade": 4,
      "valor_unitario": 45.00
    }
  ],
  "servicos": [
    {
      "codigo": "SERV001",
      "descricao": "Troca de óleo",
      "valor_unitario": 80.00
    }
  ]
}
```

---

## 🧪 Testando Isolamento

### Cenário: Dois tenants não devem ver dados um do outro

```bash
# 1. Criar cliente no tenant 1
curl -X POST http://localhost:3000/api/clientes \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Cliente A","telefone":"11111111111"}'

# Resposta: {"id": 1, "nome": "Cliente A", ...}

# 2. Criar cliente no tenant 2
curl -X POST http://localhost:3000/api/clientes \
  -H "X-Tenant-ID: 2" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Cliente B","telefone":"22222222222"}'

# Resposta: {"id": 2, "nome": "Cliente B", ...}

# 3. Tenant 1 lista clientes (só vê Cliente A)
curl http://localhost:3000/api/clientes \
  -H "X-Tenant-ID: 1"

# Resposta: [{"id": 1, "nome": "Cliente A", ...}]

# 4. Tenant 2 lista clientes (só vê Cliente B)
curl http://localhost:3000/api/clientes \
  -H "X-Tenant-ID: 2"

# Resposta: [{"id": 2, "nome": "Cliente B", ...}]

# 5. Tenant 2 tenta acessar cliente do tenant 1
curl http://localhost:3000/api/clientes/1 \
  -H "X-Tenant-ID: 2"

# Resposta: 404 Not Found (CORRETO!)
```

---

## 🛡️ Testando Segurança

### 1. Sem header de tenant
```bash
curl http://localhost:3000/api/clientes

# Resposta esperada:
{
  "error": "Tenant não identificado",
  "message": "Forneça X-Tenant-ID, X-Tenant-Slug no header ou use subdomain"
}
```

### 2. Tenant inexistente
```bash
curl http://localhost:3000/api/clientes \
  -H "X-Tenant-ID: 999"

# Resposta esperada:
{
  "error": "Tenant não encontrado",
  "message": "Organização '999' não existe"
}
```

### 3. Tenant suspenso
```bash
# Suspender tenant
curl -X POST http://localhost:3000/api/tenants/2/suspend \
  -H "Content-Type: application/json" \
  -d '{"motivo":"Teste"}'

# Tentar acessar
curl http://localhost:3000/api/clientes \
  -H "X-Tenant-ID: 2"

# Resposta esperada:
{
  "error": "Tenant inativo",
  "message": "Organização está suspended"
}
```

---

## 📊 Testando Limites de Plano

### Configurar limite
```bash
# Atualizar tenant com limite de 5 orçamentos/mês
curl -X PUT http://localhost:3000/api/tenants/2 \
  -H "Content-Type: application/json" \
  -d '{"max_orcamentos_mes": 5}'
```

### Testar limite
```bash
# Criar 5 orçamentos (OK)
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/orcamentos \
    -H "X-Tenant-ID: 2" \
    -H "Content-Type: application/json" \
    -d '{...}'
done

# Tentar criar o 6º orçamento (FALHA)
curl -X POST http://localhost:3000/api/orcamentos \
  -H "X-Tenant-ID: 2" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Resposta esperada:
{
  "error": "Limite excedido",
  "message": "Você atingiu o limite de 5 orçamentos por mês",
  "limite": 5,
  "usado": 5
}
```

---

## 🔧 Integrando com Frontend

### Axios Configuration

```javascript
// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api'
});

// Interceptor para adicionar tenant_id automaticamente
api.interceptors.request.use(config => {
  const tenantId = localStorage.getItem('tenant_id');
  
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId;
  }
  
  return config;
}, error => {
  return Promise.reject(error);
});

// Interceptor para tratar erros de tenant
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && error.response?.data?.error === 'Tenant não identificado') {
      // Redirecionar para seleção de tenant
      window.location.href = '/select-tenant';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### React Context

```javascript
// src/contexts/TenantContext.js
import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const TenantContext = createContext();

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tenantId = localStorage.getItem('tenant_id');
    
    if (tenantId) {
      loadTenant(tenantId);
    } else {
      setLoading(false);
    }
  }, []);

  const loadTenant = async (tenantId) => {
    try {
      const response = await api.get('/tenants/current', {
        headers: { 'X-Tenant-ID': tenantId }
      });
      setTenant(response.data);
    } catch (error) {
      console.error('Erro ao carregar tenant:', error);
      localStorage.removeItem('tenant_id');
    } finally {
      setLoading(false);
    }
  };

  const selectTenant = (tenantId) => {
    localStorage.setItem('tenant_id', tenantId);
    loadTenant(tenantId);
  };

  const clearTenant = () => {
    localStorage.removeItem('tenant_id');
    setTenant(null);
  };

  return (
    <TenantContext.Provider value={{ tenant, loading, selectTenant, clearTenant }}>
      {children}
    </TenantContext.Provider>
  );
}
```

---

## 📱 Postman Collection

Importe esta collection no Postman:

```json
{
  "info": {
    "name": "Benny Multi-Tenant",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000/api"
    },
    {
      "key": "tenant_id",
      "value": "1"
    }
  ],
  "item": [
    {
      "name": "Tenants",
      "item": [
        {
          "name": "Criar Tenant",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/tenants",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"slug\": \"minha-oficina\",\n  \"nome\": \"Minha Oficina\",\n  \"email\": \"contato@minhaoficina.com\"\n}"
            }
          }
        },
        {
          "name": "Listar Tenants",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/tenants"
          }
        },
        {
          "name": "Tenant Atual",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/tenants/current",
            "header": [
              {
                "key": "X-Tenant-ID",
                "value": "{{tenant_id}}"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

---

**💡 Dica:** Configure a variável `tenant_id` no Postman Environment e use `{{tenant_id}}` nos headers!
