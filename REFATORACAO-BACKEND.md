# Estrutura Refatorada do Backend

## 📁 Nova Organização de Arquivos

```
backend/
├── server.js                 # Arquivo principal (refatorado)
├── database.js              # Configuração do banco
├── package.json
│
├── config/                  # Configurações
│   ├── logger.js           # Winston logger
│   └── cache.js            # NodeCache + clearCacheByPattern
│
├── middlewares/             # Middlewares customizados
│   ├── cache.js            # Middleware de cache
│   ├── pagination.js       # Middleware de paginação
│   ├── validation.js       # Validações (express-validator)
│   ├── requestLogger.js    # Log de requisições
│   └── errorHandler.js     # Tratamento de erros centralizado
│
├── controllers/             # Lógica de negócio
│   ├── produtosController.js
│   ├── sistemaController.js
│   └── ... (outros controllers)
│
├── routes/                  # Definição de rotas
│   ├── index.js            # Centralizador de rotas
│   ├── sistema.js          # Rotas do sistema
│   ├── produtos.js         # Rotas de produtos
│   └── ... (outras rotas)
│
└── services/                # Serviços específicos
    ├── websocket.js        # WebSocket server
    └── backup.js           # Sistema de backup
```

## 🎯 Benefícios da Refatoração

### 1. **Separação de Responsabilidades**
- Cada arquivo tem uma responsabilidade única
- Código mais fácil de manter e testar
- Redução de acoplamento entre componentes

### 2. **Reutilização de Código**
- Middlewares podem ser usados em múltiplas rotas
- Controllers podem ser testados independentemente
- Serviços podem ser importados onde necessário

### 3. **Escalabilidade**
- Fácil adicionar novos recursos sem modificar código existente
- Estrutura clara para novos desenvolvedores
- Possibilidade de dividir em microserviços no futuro

### 4. **Manutenibilidade**
- Bugs são mais fáceis de localizar
- Mudanças em uma parte não afetam outras
- Código mais legível e organizado

## 📝 Como Usar a Nova Estrutura

### Adicionar uma Nova Rota

1. **Criar o Controller** (`controllers/exemplosController.js`):
```javascript
import pool from "../database.js";
import logger from "../config/logger.js";
import { clearCacheByPattern } from "../config/cache.js";

export async function listarExemplos(req, res) {
  try {
    const result = await pool.query("SELECT * FROM exemplos");
    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao listar exemplos:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function criarExemplo(req, res) {
  // Implementação
}
```

2. **Criar as Rotas** (`routes/exemplos.js`):
```javascript
import express from "express";
import * as exemplosController from "../controllers/exemplosController.js";
import { cacheMiddleware } from "../middlewares/cache.js";
import { paginate } from "../middlewares/pagination.js";

const router = express.Router();

router.get("/", paginate, cacheMiddleware(300), exemplosController.listarExemplos);
router.post("/", exemplosController.criarExemplo);

export default router;
```

3. **Registrar no Index de Rotas** (`routes/index.js`):
```javascript
import exemplosRoutes from "./exemplos.js";

// ...

router.use("/exemplos", exemplosRoutes);
```

### Adicionar um Novo Middleware

Criar arquivo em `middlewares/meuMiddleware.js`:
```javascript
export const meuMiddleware = (req, res, next) => {
  // Lógica do middleware
  next();
};
```

Usar nas rotas:
```javascript
import { meuMiddleware } from "../middlewares/meuMiddleware.js";

router.get("/", meuMiddleware, controller.handler);
```

### Adicionar um Novo Serviço

Criar arquivo em `services/meuServico.js`:
```javascript
import logger from "../config/logger.js";

export async function executarTarefa() {
  try {
    logger.info("Executando tarefa...");
    // Lógica do serviço
  } catch (error) {
    logger.error("Erro na tarefa:", error);
  }
}
```

Usar no código:
```javascript
import { executarTarefa } from "./services/meuServico.js";

// Agendar tarefa
schedule.scheduleJob("0 * * * *", executarTarefa);
```

## 🔄 Migração Gradual

A refatoração foi feita de forma que o código antigo ainda funciona. Para migrar completamente:

1. ✅ **Já Refatorado:**
   - Produtos (CRUD completo)
   - Sistema (Health check)
   - Middlewares (cache, paginação, validação, logging, erros)
   - Serviços (WebSocket, backup)

2. 🔄 **Pendente de Migração:**
   - Clientes
   - Veículos
   - Orçamentos
   - Ordens de Serviço
   - Relatórios
   - Auditoria

3. **Como Migrar Outras Rotas:**
   - Copiar a lógica para um novo controller
   - Criar arquivo de rotas correspondente
   - Registrar no `routes/index.js`
   - Testar endpoint por endpoint

## 🧪 Testando a Nova Estrutura

### Testar Health Check
```bash
curl http://localhost:3001/api/health
```

### Testar Produtos com Paginação
```bash
curl "http://localhost:3001/api/produtos?page=1&limit=10"
```

### Testar Validação
```bash
curl -X POST http://localhost:3001/api/produtos \
  -H "Content-Type: application/json" \
  -d '{"nome": "Teste"}'
# Deve retornar erro: "Código é obrigatório"
```

### Testar WebSocket
```javascript
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (event) => console.log(event.data);
```

## 📊 Comparação

### Antes (server.js monolítico)
- **1873 linhas** em um único arquivo
- Difícil de navegar e manter
- Testes difíceis de implementar
- Alto acoplamento

### Depois (estrutura modular)
- **~70 linhas** no server.js principal
- Código organizado por responsabilidade
- Fácil de testar cada componente
- Baixo acoplamento

## 🚀 Próximos Passos

1. **Migrar rotas restantes** (clientes, veículos, etc.)
2. **Adicionar testes unitários** para controllers
3. **Adicionar testes de integração** para rotas
4. **Documentar API** com Swagger/OpenAPI
5. **Implementar rate limiting** por rota
6. **Adicionar autenticação JWT** como middleware

## 💡 Dicas de Boas Práticas

1. **Um controller por recurso** - ProdutosController, ClientesController, etc.
2. **Middlewares reutilizáveis** - Evite código duplicado
3. **Tratamento de erros consistente** - Use try-catch em todos os controllers
4. **Logging adequado** - Log de info para sucesso, error para falhas
5. **Validação de entrada** - Sempre valide dados recebidos
6. **Cache inteligente** - Use cache apenas para dados que mudam pouco
7. **Broadcast seletivo** - Envie notificações WebSocket apenas quando necessário
