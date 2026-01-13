import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import compression from "compression";
import dotenv from "dotenv";
import NodeCache from "node-cache";
import schedule from "node-schedule";
import { body, validationResult } from "express-validator";
import winston from "winston";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import pool from "./database.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar cache (TTL de 5 minutos por padrão)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Configurar Winston Logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Middlewares
app.use(compression()); // Compressão de respostas

// Configurar CORS
const corsOptions = {
  origin: [
    "http://localhost:5175", // Vite dev server
    "https://benny-theta.vercel.app", // Produção no Vercel
    /\.vercel\.app$/, // Permite todos os preview deployments do Vercel
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

// Adicionar headers CORS manualmente para garantir
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Aceitar localhost ou Vercel
  if (
    origin &&
    (origin.startsWith("http://localhost:") || /\.vercel\.app$/.test(origin))
  ) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware de logging de requisições
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });
  next();
});

// Middleware de cache para GET requests
const cacheMiddleware = (duration) => (req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }

  const key = req.originalUrl;
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    return res.json(cachedResponse);
  }

  res.originalJson = res.json;
  res.json = (body) => {
    cache.set(key, body, duration);
    res.originalJson(body);
  };

  next();
};

// Função para limpar cache específico
function clearCacheByPattern(pattern) {
  const keys = cache.keys();
  keys.forEach((key) => {
    if (key.includes(pattern)) {
      cache.del(key);
    }
  });
}

// Middleware de paginação
const paginate = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  req.pagination = { limit, offset, page };
  next();
};

// Middleware de validação para criar produto
const validateProduto = [
  body("codigo").notEmpty().withMessage("Código é obrigatório"),
  body("nome").notEmpty().withMessage("Nome é obrigatório"),
  body("quantidade")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Quantidade inválida"),
  body("valor_venda")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Valor de venda inválido"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// ============================================
// ROTAS - SISTEMA
// ============================================

// Endpoint de monitoramento de saúde
app.get("/api/health", async (req, res) => {
  try {
    // Verificar conexão com banco
    await pool.query("SELECT 1");

    // Verificar uso de memória
    const memoryUsage = process.memoryUsage();

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      },
      uptime: Math.round(process.uptime()),
      cache: {
        keys: cache.keys().length,
        stats: cache.getStats(),
      },
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

// ============================================
// ROTAS - PRODUTOS/ESTOQUE
// ============================================

// Listar todos os produtos (com cache e paginação)
app.get("/api/produtos", paginate, cacheMiddleware(300), async (req, res) => {
  try {
    const { limit, offset, page } = req.pagination;

    logger.info(`Listando produtos - limit: ${limit}, offset: ${offset}`);

    const result = await pool.query(
      "SELECT * FROM produtos ORDER BY nome LIMIT $1 OFFSET $2",
      [limit, offset]
    );

    const countResult = await pool.query("SELECT COUNT(*) FROM produtos");
    const total = parseInt(countResult.rows[0].count);

    logger.info(`Produtos encontrados: ${result.rows.length} de ${total}`);

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Erro ao listar produtos:", error);
    res.status(500).json({
      error: "Erro ao carregar produtos",
      message: error.message,
      details: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });
  }
});

// Produtos com estoque baixo (DEVE VIR ANTES DE /:id)
app.get("/api/produtos/alertas/estoque-baixo", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM produtos WHERE quantidade <= estoque_minimo ORDER BY quantidade"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar produto por ID
app.get("/api/produtos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar se é um número
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    
    logger.info(`Buscando produto ID: ${id}`);
    
    const result = await pool.query("SELECT * FROM produtos WHERE id = $1", [
      id,
    ]);
    
    if (result.rows.length === 0) {
      logger.warn(`Produto não encontrado: ${id}`);
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    
    logger.info(`Produto encontrado: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error(`Erro ao buscar produto ${req.params.id}:`, error);
    res.status(500).json({ 
      error: "Erro ao buscar produto",
      message: error.message,
      details: process.env.NODE_ENV !== "production" ? error.stack : undefined
    });
  }
});

// Criar produto
app.post("/api/produtos", validateProduto, async (req, res) => {
  try {
    const {
      codigo,
      nome,
      descricao,
      quantidade,
      valor_custo,
      valor_venda,
      estoque_minimo,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO produtos (codigo, nome, descricao, quantidade, valor_custo, valor_venda, estoque_minimo)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        codigo,
        nome,
        descricao,
        quantidade || 0,
        valor_custo || 0,
        valor_venda || 0,
        estoque_minimo || 5,
      ]
    );

    // Limpar cache de produtos
    clearCacheByPattern("/api/produtos");

    // Notificar clientes WebSocket
    broadcastUpdate("produto_criado", result.rows[0]);

    logger.info(`Produto criado: ${result.rows[0].id}`);

    res.status(201).json({
      id: result.rows[0].id,
      message: "Produto criado com sucesso",
      produto: result.rows[0],
    });
  } catch (error) {
    logger.error("Erro ao criar produto:", error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar produto
app.put("/api/produtos/:id", async (req, res) => {
  try {
    const {
      codigo,
      nome,
      descricao,
      quantidade,
      valor_custo,
      valor_venda,
      estoque_minimo,
    } = req.body;

    const result = await pool.query(
      `UPDATE produtos 
       SET codigo = $1, nome = $2, descricao = $3, quantidade = $4, valor_custo = $5, 
           valor_venda = $6, estoque_minimo = $7, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        codigo,
        nome,
        descricao,
        quantidade,
        valor_custo,
        valor_venda,
        estoque_minimo,
        req.params.id,
      ]
    );

    logger.info(
      `Produto ${req.params.id} atualizado - Nova quantidade: ${quantidade}`
    );

    clearCacheByPattern("/api/produtos");

    // Notificar clientes WebSocket
    broadcastUpdate("produto_atualizado", result.rows[0]);

    logger.info(`Produto atualizado: ${req.params.id}`);

    res.json({
      message: "Produto atualizado com sucesso",
      produto: result.rows[0],
    });
  } catch (error) {
    logger.error("Erro ao atualizar produto:", error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar produto
app.delete("/api/produtos/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM produtos WHERE id = $1", [req.params.id]);

    // Limpar cache de produtos
    clearCacheByPattern("/api/produtos");

    res.json({ message: "Produto deletado com sucesso" });
  } catch (error) {
    logger.error("Erro ao deletar produto:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS - CLIENTES
// ============================================

app.get("/api/clientes", async (req, res) => {
  try {
    const { busca } = req.query;

    logger.info(`Buscando clientes - busca: "${busca}"`);

    let query = "SELECT * FROM clientes";
    const params = [];

    if (busca) {
      query +=
        " WHERE LOWER(nome) LIKE LOWER($1) OR LOWER(telefone) LIKE LOWER($1) OR LOWER(cpf_cnpj) LIKE LOWER($1)";
      params.push(`%${busca}%`);
    }

    query += " ORDER BY nome LIMIT 50";

    logger.info(`Query SQL: ${query}`);
    logger.info(`Params: ${JSON.stringify(params)}`);

    const result = await pool.query(query, params);

    logger.info(`Clientes encontrados: ${result.rows.length}`);

    res.json(result.rows);
  } catch (error) {
    logger.error("Erro ao buscar clientes:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/clientes/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM clientes WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/clientes", async (req, res) => {
  try {
    const { nome, telefone, cpf_cnpj, email, endereco } = req.body;

    const result = await pool.query(
      `INSERT INTO clientes (nome, telefone, cpf_cnpj, email, endereco)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nome, telefone, cpf_cnpj, email, endereco]
    );

    res
      .status(201)
      .json({ id: result.rows[0].id, message: "Cliente criado com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/clientes/:id", async (req, res) => {
  try {
    const { nome, telefone, cpf_cnpj, email, endereco } = req.body;

    await pool.query(
      `UPDATE clientes 
       SET nome = $1, telefone = $2, cpf_cnpj = $3, email = $4, endereco = $5
       WHERE id = $6`,
      [nome, telefone, cpf_cnpj, email, endereco, req.params.id]
    );

    res.json({ message: "Cliente atualizado com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS - VEÍCULOS
// ============================================

app.get("/api/veiculos", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, c.nome as cliente_nome 
      FROM veiculos v 
      LEFT JOIN clientes c ON v.cliente_id = c.id 
      ORDER BY v.modelo
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/veiculos/cliente/:clienteId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM veiculos WHERE cliente_id = $1",
      [req.params.clienteId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/veiculos", async (req, res) => {
  try {
    const { cliente_id, modelo, cor, placa, ano } = req.body;

    const result = await pool.query(
      `INSERT INTO veiculos (cliente_id, modelo, cor, placa, ano)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [cliente_id, modelo, cor, placa, ano]
    );

    res
      .status(201)
      .json({ id: result.rows[0].id, message: "Veículo criado com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS - ORÇAMENTOS
// ============================================

async function gerarNumeroOrcamento() {
  const result = await pool.query(
    "SELECT numero FROM orcamentos ORDER BY id DESC LIMIT 1"
  );
  if (result.rows.length === 0) return "ORC-0001";

  const numero = parseInt(result.rows[0].numero.split("-")[1]) + 1;
  return `ORC-${numero.toString().padStart(4, "0")}`;
}

app.get("/api/orcamentos", async (req, res) => {
  try {
    const { status, busca } = req.query;

    let query = `
      SELECT o.*, 
             c.nome as cliente_nome, c.telefone as cliente_telefone,
             v.modelo as veiculo_modelo, v.placa as veiculo_placa
      FROM orcamentos o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      LEFT JOIN veiculos v ON o.veiculo_id = v.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (busca) {
      query += ` AND (o.numero ILIKE $${paramIndex} OR c.nome ILIKE $${
        paramIndex + 1
      } OR v.placa ILIKE $${paramIndex + 2})`;
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
      paramIndex += 3;
    }

    query += " ORDER BY o.id DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/orcamentos/:id", async (req, res) => {
  try {
    const orcResult = await pool.query(
      `
      SELECT o.*, 
             c.nome as cliente_nome, c.telefone as cliente_telefone, c.cpf_cnpj as cliente_cpf_cnpj,
             v.modelo as veiculo_modelo, v.placa as veiculo_placa, v.cor as veiculo_cor
      FROM orcamentos o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      LEFT JOIN veiculos v ON o.veiculo_id = v.id
      WHERE o.id = $1
    `,
      [req.params.id]
    );

    if (orcResult.rows.length === 0) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    const produtosResult = await pool.query(
      "SELECT * FROM orcamento_produtos WHERE orcamento_id = $1",
      [req.params.id]
    );
    const servicosResult = await pool.query(
      "SELECT * FROM orcamento_servicos WHERE orcamento_id = $1",
      [req.params.id]
    );

    res.json({
      ...orcResult.rows[0],
      produtos: produtosResult.rows,
      servicos: servicosResult.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota pública para visualizar orçamento (sem autenticação)
app.get("/api/orcamentos/publico/:id", async (req, res) => {
  try {
    const orcResult = await pool.query(
      `
      SELECT o.*, 
             c.nome as cliente_nome, c.telefone as cliente_telefone, c.cpf_cnpj as cliente_cpf_cnpj,
             v.modelo as veiculo_modelo, v.placa as veiculo_placa, v.cor as veiculo_cor
      FROM orcamentos o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      LEFT JOIN veiculos v ON o.veiculo_id = v.id
      WHERE o.id = $1
    `,
      [req.params.id]
    );

    if (orcResult.rows.length === 0) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    const produtosResult = await pool.query(
      "SELECT * FROM orcamento_produtos WHERE orcamento_id = $1",
      [req.params.id]
    );
    const servicosResult = await pool.query(
      "SELECT * FROM orcamento_servicos WHERE orcamento_id = $1",
      [req.params.id]
    );

    res.json({
      ...orcResult.rows[0],
      produtos: produtosResult.rows,
      servicos: servicosResult.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota pública para aprovar orçamento
app.put("/api/orcamentos/publico/:id/aprovar", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verificar status atual antes de aprovar
    const statusAtual = await client.query(
      "SELECT status FROM orcamentos WHERE id = $1",
      [req.params.id]
    );

    if (statusAtual.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    const jaAprovado = statusAtual.rows[0].status === "Aprovado";

    const result = await client.query(
      "UPDATE orcamentos SET status = 'Aprovado', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    // Só dar baixa no estoque se não estava aprovado antes
    if (!jaAprovado) {
      // Buscar produtos do orçamento e dar baixa no estoque
      const produtosResult = await client.query(
        "SELECT * FROM orcamento_produtos WHERE orcamento_id = $1",
        [req.params.id]
      );

      if (produtosResult.rows.length > 0) {
        for (const produto of produtosResult.rows) {
          if (produto.produto_id) {
            logger.info(
              `Aprovação de orçamento: Dando baixa - produto_id=${produto.produto_id}, qtd=${produto.quantidade}`
            );

            await client.query(
              "UPDATE produtos SET quantidade = quantidade - $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2",
              [produto.quantidade, produto.produto_id]
            );

            await client.query(
              `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, orcamento_id)
               VALUES ($1, 'SAIDA', $2, 'Orçamento aprovado', $3)`,
              [produto.produto_id, produto.quantidade, req.params.id]
            );
          }
        }
      }
    } else {
      logger.info(
        `Orçamento ${req.params.id} já estava aprovado, baixa ignorada`
      );
    }

    await client.query("COMMIT");
    clearCacheByPattern("/api/orcamentos");

    // Notificar clientes WebSocket
    broadcastUpdate("orcamento_aprovado", result.rows[0]);

    res.json({
      message: "Orçamento aprovado com sucesso",
      orcamento: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Erro ao aprovar orçamento:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Rota pública para reprovar orçamento
app.put("/api/orcamentos/publico/:id/reprovar", async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE orcamentos SET status = 'Reprovado', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    clearCacheByPattern("/api/orcamentos");

    // Notificar clientes WebSocket
    broadcastUpdate("orcamento_reprovado", result.rows[0]);

    res.json({ message: "Orçamento reprovado", orcamento: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/orcamentos", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      cliente_id,
      veiculo_id,
      km,
      previsao_entrega,
      observacoes_veiculo,
      observacoes_gerais,
      responsavel_tecnico,
      produtos,
      servicos,
    } = req.body;

    const numero = await gerarNumeroOrcamento();

    // Calcular totais
    const valor_produtos =
      produtos?.reduce((sum, item) => sum + item.valor_total, 0) || 0;
    const valor_servicos =
      servicos?.reduce((sum, item) => sum + item.valor_total, 0) || 0;
    const valor_total = valor_produtos + valor_servicos;

    // Inserir orçamento
    const orcResult = await client.query(
      `INSERT INTO orcamentos (numero, cliente_id, veiculo_id, km, previsao_entrega, observacoes_veiculo, observacoes_gerais, responsavel_tecnico, valor_produtos, valor_servicos, valor_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        numero,
        cliente_id,
        veiculo_id,
        km,
        previsao_entrega || null,
        observacoes_veiculo,
        observacoes_gerais,
        responsavel_tecnico || null,
        valor_produtos,
        valor_servicos,
        valor_total,
      ]
    );

    const orcamento_id = orcResult.rows[0].id;

    // Inserir produtos
    if (produtos && produtos.length > 0) {
      for (const produto of produtos) {
        await client.query(
          `INSERT INTO orcamento_produtos (orcamento_id, produto_id, codigo, descricao, quantidade, valor_unitario, valor_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            orcamento_id,
            produto.produto_id,
            produto.codigo,
            produto.descricao,
            produto.quantidade,
            produto.valor_unitario,
            produto.valor_total,
          ]
        );
      }
    }

    // Inserir serviços
    if (servicos && servicos.length > 0) {
      for (const servico of servicos) {
        await client.query(
          `INSERT INTO orcamento_servicos (orcamento_id, codigo, descricao, quantidade, valor_unitario, valor_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            orcamento_id,
            servico.codigo,
            servico.descricao,
            servico.quantidade,
            servico.valor_unitario,
            servico.valor_total,
          ]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({
      id: orcamento_id,
      numero,
      message: "Orçamento criado com sucesso",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Erro ao criar orçamento:", error);
    console.error("Erro detalhado ao criar orçamento:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.put("/api/orcamentos/:id", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      status,
      km,
      previsao_entrega,
      observacoes_veiculo,
      observacoes_gerais,
      produtos,
      servicos,
    } = req.body;

    // Buscar dados anteriores para auditoria
    const dadosAnteriores = await client.query(
      "SELECT * FROM orcamentos WHERE id = $1",
      [req.params.id]
    );

    // Calcular totais
    const valor_produtos =
      produtos?.reduce((sum, item) => sum + item.valor_total, 0) || 0;
    const valor_servicos =
      servicos?.reduce((sum, item) => sum + item.valor_total, 0) || 0;
    const valor_total = valor_produtos + valor_servicos;

    // Atualizar orçamento
    await client.query(
      `UPDATE orcamentos 
       SET status = $1, km = $2, previsao_entrega = $3, 
           observacoes_veiculo = $4, observacoes_gerais = $5, 
           valor_produtos = $6, valor_servicos = $7, valor_total = $8, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [
        status,
        km,
        previsao_entrega || null,
        observacoes_veiculo,
        observacoes_gerais,
        valor_produtos,
        valor_servicos,
        valor_total,
        req.params.id,
      ]
    );

    // Deletar produtos e serviços antigos
    await client.query(
      "DELETE FROM orcamento_produtos WHERE orcamento_id = $1",
      [req.params.id]
    );
    await client.query(
      "DELETE FROM orcamento_servicos WHERE orcamento_id = $1",
      [req.params.id]
    );

    // Inserir produtos novamente
    if (produtos && produtos.length > 0) {
      for (const produto of produtos) {
        await client.query(
          `INSERT INTO orcamento_produtos (orcamento_id, produto_id, codigo, descricao, quantidade, valor_unitario, valor_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            req.params.id,
            produto.produto_id,
            produto.codigo,
            produto.descricao,
            produto.quantidade,
            produto.valor_unitario,
            produto.valor_total,
          ]
        );
      }
    }

    // Inserir serviços novamente
    if (servicos && servicos.length > 0) {
      for (const servico of servicos) {
        await client.query(
          `INSERT INTO orcamento_servicos (orcamento_id, codigo, descricao, quantidade, valor_unitario, valor_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.params.id,
            servico.codigo,
            servico.descricao,
            servico.quantidade,
            servico.valor_unitario,
            servico.valor_total,
          ]
        );
      }
    }

    // Buscar dados novos para auditoria
    const dadosNovos = await client.query(
      "SELECT * FROM orcamentos WHERE id = $1",
      [req.params.id]
    );

    // Registrar auditoria
    try {
      await client.query(
        `INSERT INTO auditoria (tabela, registro_id, acao, dados_anteriores, dados_novos, usuario)
         VALUES ($1, $2::integer, $3, $4::jsonb, $5::jsonb, $6)`,
        [
          "orcamentos",
          req.params.id,
          "UPDATE",
          JSON.stringify(dadosAnteriores.rows[0]),
          JSON.stringify(dadosNovos.rows[0]),
          "sistema",
        ]
      );
    } catch (auditoriaError) {
      logger.error("Erro ao registrar auditoria:", auditoriaError);
    }

    // Se o status mudou para "Aprovado", dar baixa no estoque
    const statusAnterior = dadosAnteriores.rows[0]?.status;
    logger.info(
      `Orçamento ${req.params.id}: Status anterior: ${statusAnterior}, Status novo: ${status}`
    );

    if (status === "Aprovado" && statusAnterior !== "Aprovado") {
      logger.info(
        `Orçamento aprovado via edição: ID=${req.params.id}, dando baixa no estoque`
      );

      try {
        // Verificar se já existe movimentação de estoque para este orçamento
        const movExistente = await client.query(
          "SELECT id FROM movimentacoes_estoque WHERE orcamento_id = $1 AND motivo = 'Orçamento aprovado' LIMIT 1",
          [req.params.id]
        );

        if (movExistente.rows.length === 0) {
          // Buscar produtos do orçamento e dar baixa
          const produtosEstoque = await client.query(
            "SELECT * FROM orcamento_produtos WHERE orcamento_id = $1",
            [req.params.id]
          );

          if (produtosEstoque.rows.length > 0) {
            for (const produto of produtosEstoque.rows) {
              if (produto.produto_id) {
                try {
                  console.log(
                    `  Baixa no estoque: produto_id=${produto.produto_id}, quantidade=${produto.quantidade}`
                  );

                  // Verificar quantidade atual antes da baixa
                  const qtdAntes = await client.query(
                    "SELECT quantidade FROM produtos WHERE id = $1",
                    [produto.produto_id]
                  );
                  console.log(
                    `  Quantidade antes: ${
                      qtdAntes.rows[0]?.quantidade || "não encontrado"
                    }`
                  );

                  const updateResult = await client.query(
                    "UPDATE produtos SET quantidade = quantidade - $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2 RETURNING quantidade",
                    [produto.quantidade, produto.produto_id]
                  );

                  console.log(
                    `  Quantidade depois: ${
                      updateResult.rows[0]?.quantidade || "não atualizado"
                    }`
                  );
                  console.log(`  Linhas afetadas: ${updateResult.rowCount}`);

                  await client.query(
                    `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, orcamento_id)
                     VALUES ($1, 'SAIDA', $2, 'Orçamento aprovado', $3)`,
                    [produto.produto_id, produto.quantidade, req.params.id]
                  );

                  console.log(`  ✓ Baixa registrada com sucesso`);
                } catch (prodError) {
                  console.error(
                    `  ✗ Erro ao processar produto ${produto.produto_id}:`,
                    prodError.message
                  );
                  throw prodError;
                }
              } else {
                console.log(
                  `  Produto sem produto_id (item manual): ${produto.descricao}`
                );
              }
            }
            console.log(`  ✓ Todas as baixas processadas com sucesso`);
          }
        } else {
          console.log(`  Baixa já realizada anteriormente, ignorando.`);
        }
      } catch (estoqueError) {
        console.error("Erro ao processar baixa de estoque:", estoqueError);
        throw estoqueError; // Re-throw para fazer rollback da transação
      }
    }

    await client.query("COMMIT");
    clearCacheByPattern("/api/orcamentos");

    // Notificar clientes WebSocket
    broadcastUpdate("orcamento_atualizado", { id: req.params.id, status });

    // Se orçamento foi aprovado, limpar cache de produtos (estoque foi alterado)
    if (status === "Aprovado" && statusAnterior !== "Aprovado") {
      console.log(
        `[CACHE] Limpando cache de produtos após aprovar orçamento ${req.params.id}`
      );
      clearCacheByPattern("/api/produtos");
      broadcastUpdate("estoque_atualizado", {
        orcamento_id: req.params.id,
        status,
      });
    }

    res.json({ message: "Orçamento atualizado com sucesso" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Converter orçamento em OS
app.post("/api/orcamentos/:id/converter-os", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orcResult = await client.query(
      "SELECT * FROM orcamentos WHERE id = $1",
      [req.params.id]
    );

    if (orcResult.rows.length === 0) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    const orcamento = orcResult.rows[0];

    if (orcamento.status !== "Aprovado") {
      return res.status(400).json({
        error: "Apenas orçamentos aprovados podem ser convertidos em OS",
      });
    }

    const numero = await gerarNumeroOS();

    // Criar OS
    const osResult = await client.query(
      `INSERT INTO ordens_servico (numero, cliente_id, veiculo_id, km, previsao_entrega, observacoes_veiculo, observacoes_gerais, 
                                     valor_produtos, valor_servicos, valor_total, orcamento_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Aberta') RETURNING id`,
      [
        numero,
        orcamento.cliente_id,
        orcamento.veiculo_id,
        orcamento.km,
        orcamento.previsao_entrega || null,
        orcamento.observacoes_veiculo,
        orcamento.observacoes_gerais,
        orcamento.valor_produtos,
        orcamento.valor_servicos,
        orcamento.valor_total,
        orcamento.id,
      ]
    );

    const os_id = osResult.rows[0].id;

    // Copiar produtos (estoque já foi reduzido na aprovação)
    const produtosResult = await client.query(
      "SELECT * FROM orcamento_produtos WHERE orcamento_id = $1",
      [req.params.id]
    );
    if (produtosResult.rows.length > 0) {
      for (const produto of produtosResult.rows) {
        await client.query(
          `INSERT INTO os_produtos (os_id, produto_id, codigo, descricao, quantidade, valor_unitario, valor_total, baixa_estoque)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
          [
            os_id,
            produto.produto_id,
            produto.codigo,
            produto.descricao,
            produto.quantidade,
            produto.valor_unitario,
            produto.valor_total,
          ]
        );

        // Nota: Não dar baixa novamente, pois já foi feita na aprovação
      }
    }

    // Copiar serviços
    const servicosResult = await client.query(
      "SELECT * FROM orcamento_servicos WHERE orcamento_id = $1",
      [req.params.id]
    );
    if (servicosResult.rows.length > 0) {
      for (const servico of servicosResult.rows) {
        await client.query(
          `INSERT INTO os_servicos (os_id, codigo, descricao, quantidade, valor_unitario, valor_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            os_id,
            servico.codigo,
            servico.descricao,
            servico.quantidade,
            servico.valor_unitario,
            servico.valor_total,
          ]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({
      id: os_id,
      numero,
      message: "Orçamento convertido em OS com sucesso",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ============================================
// ROTAS - ORDENS DE SERVIÇO
// ============================================

async function gerarNumeroOS() {
  const result = await pool.query(
    "SELECT numero FROM ordens_servico ORDER BY id DESC LIMIT 1"
  );
  if (result.rows.length === 0) return "OS-0001";

  const numero = parseInt(result.rows[0].numero.split("-")[1]) + 1;
  return `OS-${numero.toString().padStart(4, "0")}`;
}

app.get("/api/ordens-servico", async (req, res) => {
  try {
    const { status, busca } = req.query;

    let query = `
      SELECT os.*, 
             c.nome as cliente_nome, c.telefone as cliente_telefone,
             v.marca as veiculo_marca, v.modelo as veiculo_modelo, v.placa as veiculo_placa,
             v.cor as veiculo_cor, v.ano as veiculo_ano
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN veiculos v ON os.veiculo_id = v.id
      WHERE 1=1
    `;

    console.log("[DEBUG] Query inicial:", query);

    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND os.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (busca) {
      query += ` AND (os.numero ILIKE $${paramIndex} OR c.nome ILIKE $${
        paramIndex + 1
      } OR v.placa ILIKE $${paramIndex + 2})`;
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
      paramIndex += 3;
    }

    query += " ORDER BY os.id DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("[ERROR] Erro em GET /api/ordens-servico:", error.message);
    console.error("[ERROR] Stack:", error.stack);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/ordens-servico/:id", async (req, res) => {
  try {
    const osResult = await pool.query(
      `
      SELECT os.*, 
             c.nome as cliente_nome, c.telefone as cliente_telefone, c.cpf_cnpj as cliente_cpf_cnpj,
             v.marca as veiculo_marca, v.modelo as veiculo_modelo, v.placa as veiculo_placa, 
             v.cor as veiculo_cor, v.ano as veiculo_ano
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN veiculos v ON os.veiculo_id = v.id
      WHERE os.id = $1
    `,
      [req.params.id]
    );

    if (osResult.rows.length === 0) {
      return res.status(404).json({ error: "OS não encontrada" });
    }

    const produtosResult = await pool.query(
      "SELECT * FROM os_produtos WHERE os_id = $1",
      [req.params.id]
    );
    const servicosResult = await pool.query(
      "SELECT * FROM os_servicos WHERE os_id = $1",
      [req.params.id]
    );

    res.json({
      ...osResult.rows[0],
      produtos: produtosResult.rows,
      servicos: servicosResult.rows,
    });
  } catch (error) {
    console.error(
      "[ERROR] Erro em GET /api/ordens-servico/:id:",
      error.message
    );
    console.error("[ERROR] Stack:", error.stack);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ordens-servico", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      cliente_id,
      veiculo_id,
      km,
      previsao_entrega,
      observacoes_veiculo,
      observacoes_gerais,
      produtos,
      servicos,
      responsavel_tecnico,
    } = req.body;

    logger.info("Criando nova OS", {
      produtos: produtos?.length || 0,
      servicos: servicos?.length || 0,
    });

    const numero = await gerarNumeroOS();

    // Calcular totais
    const valor_produtos =
      produtos?.reduce((sum, item) => sum + item.valor_total, 0) || 0;
    const valor_servicos =
      servicos?.reduce((sum, item) => sum + item.valor_total, 0) || 0;
    const valor_total = valor_produtos + valor_servicos;

    // Inserir OS
    const osResult = await client.query(
      `INSERT INTO ordens_servico (numero, cliente_id, veiculo_id, km, previsao_entrega, observacoes_veiculo, observacoes_gerais, 
                                     valor_produtos, valor_servicos, valor_total, responsavel_tecnico, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Aberta') RETURNING id`,
      [
        numero,
        cliente_id,
        veiculo_id,
        km,
        previsao_entrega || null,
        observacoes_veiculo,
        observacoes_gerais,
        valor_produtos,
        valor_servicos,
        valor_total,
        responsavel_tecnico,
      ]
    );

    const os_id = osResult.rows[0].id;

    // Inserir produtos e dar baixa no estoque
    if (produtos && produtos.length > 0) {
      for (const produto of produtos) {
        await client.query(
          `INSERT INTO os_produtos (os_id, produto_id, codigo, descricao, quantidade, valor_unitario, valor_total, baixa_estoque)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
          [
            os_id,
            produto.produto_id,
            produto.codigo,
            produto.descricao,
            produto.quantidade,
            produto.valor_unitario,
            produto.valor_total,
          ]
        );

        if (produto.produto_id) {
          logger.info(
            `Baixa estoque OS: produto=${produto.produto_id}, qtd=${produto.quantidade}`
          );

          await client.query(
            "UPDATE produtos SET quantidade = quantidade - $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2",
            [produto.quantidade, produto.produto_id]
          );

          await client.query(
            `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, os_id)
             VALUES ($1, 'SAIDA', $2, 'Utilizado na OS', $3)`,
            [produto.produto_id, produto.quantidade, os_id]
          );
        }
      }
    }

    // Inserir serviços
    if (servicos && servicos.length > 0) {
      for (const servico of servicos) {
        await client.query(
          `INSERT INTO os_servicos (os_id, codigo, descricao, quantidade, valor_unitario, valor_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            os_id,
            servico.codigo,
            servico.descricao,
            servico.quantidade,
            servico.valor_unitario,
            servico.valor_total,
          ]
        );
      }
    }

    await client.query("COMMIT");
    res
      .status(201)
      .json({ id: os_id, numero, message: "OS criada com sucesso" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.put("/api/ordens-servico/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      status,
      responsavel_tecnico,
      km,
      previsao_entrega,
      observacoes_veiculo,
      observacoes_gerais,
      produtos,
      servicos,
    } = req.body;

    // Buscar dados anteriores para auditoria
    const dadosAnteriores = await client.query(
      "SELECT * FROM ordens_servico WHERE id = $1",
      [req.params.id]
    );

    if (dadosAnteriores.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "OS não encontrada" });
    }

    // Se for atualização completa (com produtos/servicos), atualizar tudo
    if (produtos !== undefined || servicos !== undefined) {
      // Atualizar OS com todos os campos, preservando o status
      await client.query(
        `UPDATE ordens_servico 
         SET km = $1, previsao_entrega = $2, observacoes_veiculo = $3, 
             observacoes_gerais = $4, responsavel_tecnico = $5,
             status = COALESCE($6, status), atualizado_em = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [
          km || null,
          previsao_entrega || null,
          observacoes_veiculo,
          observacoes_gerais,
          responsavel_tecnico,
          status || null,
          req.params.id,
        ]
      );

      // Deletar produtos e serviços anteriores
      await client.query("DELETE FROM os_produtos WHERE os_id = $1", [
        req.params.id,
      ]);
      await client.query("DELETE FROM os_servicos WHERE os_id = $1", [
        req.params.id,
      ]);

      // Inserir novos produtos
      if (produtos && produtos.length > 0) {
        for (const produto of produtos) {
          await client.query(
            `INSERT INTO os_produtos (os_id, produto_id, codigo, descricao, quantidade, valor_unitario, valor_total)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              req.params.id,
              produto.produto_id || null,
              produto.codigo,
              produto.descricao,
              produto.quantidade,
              produto.valor_unitario,
              produto.valor_total,
            ]
          );
        }
      }

      // Inserir novos serviços
      if (servicos && servicos.length > 0) {
        for (const servico of servicos) {
          await client.query(
            `INSERT INTO os_servicos (os_id, codigo, descricao, quantidade, valor_unitario, valor_total)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              req.params.id,
              servico.codigo,
              servico.descricao,
              servico.quantidade,
              servico.valor_unitario,
              servico.valor_total,
            ]
          );
        }
      }

      // Recalcular totais
      const valorProdutos =
        produtos?.reduce((sum, p) => sum + Number(p.valor_total), 0) || 0;
      const valorServicos =
        servicos?.reduce((sum, s) => sum + Number(s.valor_total), 0) || 0;
      const valorTotal = valorProdutos + valorServicos;

      await client.query(
        `UPDATE ordens_servico 
         SET valor_produtos = $1, valor_servicos = $2, valor_total = $3
         WHERE id = $4`,
        [valorProdutos, valorServicos, valorTotal, req.params.id]
      );
    } else {
      // Atualização simples de status apenas
      await client.query(
        `UPDATE ordens_servico 
         SET status = $1::varchar, responsavel_tecnico = $2::varchar, atualizado_em = CURRENT_TIMESTAMP,
             finalizado_em = CASE WHEN $1::varchar = 'Finalizada' THEN CURRENT_TIMESTAMP ELSE finalizado_em END
         WHERE id = $3`,
        [status, responsavel_tecnico, req.params.id]
      );
    }

    // Buscar dados novos
    const dadosNovos = await client.query(
      "SELECT * FROM ordens_servico WHERE id = $1",
      [req.params.id]
    );

    // Registrar auditoria
    try {
      await client.query(
        `INSERT INTO auditoria (tabela, registro_id, acao, dados_anteriores, dados_novos, usuario)
         VALUES ($1, $2::integer, $3, $4::jsonb, $5::jsonb, $6)`,
        [
          "ordens_servico",
          req.params.id,
          "UPDATE",
          JSON.stringify(dadosAnteriores.rows[0]),
          JSON.stringify(dadosNovos.rows[0]),
          "sistema",
        ]
      );
    } catch (auditoriaError) {
      logger.error("Erro ao registrar auditoria:", auditoriaError);
      // Continua mesmo se auditoria falhar
    }

    // Gerenciar estoque baseado no status
    const statusAnterior = dadosAnteriores.rows[0]?.status;
    console.log(
      `OS ${req.params.id}: Status anterior: ${statusAnterior}, Status novo: ${status}`
    );

    // Se a OS foi FINALIZADA, dar baixa no estoque
    if (status === "Finalizada" && statusAnterior !== "Finalizada") {
      console.log(`OS finalizada: ID=${req.params.id}, dando baixa no estoque`);

      try {
        // Verificar se já existe baixa para esta OS
        const baixaExistente = await client.query(
          "SELECT id FROM movimentacoes_estoque WHERE os_id = $1 AND motivo = 'OS finalizada - baixa' LIMIT 1",
          [req.params.id]
        );

        console.log(`  Baixas existentes: ${baixaExistente.rows.length}`);

        if (baixaExistente.rows.length === 0) {
          // Buscar produtos da OS e dar baixa no estoque
          const produtosOS = await client.query(
            "SELECT * FROM os_produtos WHERE os_id = $1",
            [req.params.id]
          );

          console.log(`  Produtos encontrados: ${produtosOS.rows.length}`);

          if (produtosOS.rows.length > 0) {
            for (const produto of produtosOS.rows) {
              if (produto.produto_id) {
                try {
                  console.log(
                    `  Baixa no estoque: produto_id=${produto.produto_id}, quantidade=${produto.quantidade}`
                  );

                  // Verificar quantidade atual antes da baixa
                  const qtdAntes = await client.query(
                    "SELECT quantidade FROM produtos WHERE id = $1",
                    [produto.produto_id]
                  );
                  console.log(
                    `  Quantidade antes: ${
                      qtdAntes.rows[0]?.quantidade || "não encontrado"
                    }`
                  );

                  // Verificar se tem estoque suficiente
                  if (
                    qtdAntes.rows[0] &&
                    qtdAntes.rows[0].quantidade < produto.quantidade
                  ) {
                    console.warn(
                      `  ⚠️ Estoque insuficiente: disponível=${qtdAntes.rows[0].quantidade}, necessário=${produto.quantidade}`
                    );
                  }

                  const updateResult = await client.query(
                    "UPDATE produtos SET quantidade = quantidade - $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2 RETURNING quantidade",
                    [produto.quantidade, produto.produto_id]
                  );

                  console.log(
                    `  Quantidade depois: ${
                      updateResult.rows[0]?.quantidade || "não atualizado"
                    }`
                  );
                  console.log(`  Linhas afetadas: ${updateResult.rowCount}`);

                  await client.query(
                    `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, os_id)
                     VALUES ($1, 'SAIDA', $2, 'OS finalizada - baixa', $3)`,
                    [produto.produto_id, produto.quantidade, req.params.id]
                  );

                  console.log(`  ✓ Baixa registrada com sucesso`);
                } catch (prodError) {
                  console.error(
                    `  ✗ Erro ao processar produto ${produto.produto_id}:`,
                    prodError.message
                  );
                  throw prodError;
                }
              } else {
                console.log(
                  `  Produto sem produto_id (item manual): ${produto.descricao}`
                );
              }
            }
            console.log(`  ✓ Todas as baixas processadas com sucesso`);
          }
        } else {
          console.log(`  Baixa já realizada anteriormente, ignorando.`);
        }
      } catch (estoqueError) {
        console.error("Erro ao processar baixa de estoque:", estoqueError);
        throw estoqueError; // Re-throw para fazer rollback da transação
      }
    }

    // Se a OS foi cancelada, devolver itens ao estoque
    if (status === "Cancelada" && statusAnterior !== "Cancelada") {
      console.log(
        `OS cancelada: ID=${req.params.id}, devolvendo itens ao estoque`
      );

      try {
        // Verificar se já existe devolução para esta OS
        const devolucaoExistente = await client.query(
          "SELECT id FROM movimentacoes_estoque WHERE os_id = $1 AND motivo = 'OS cancelada - devolução' LIMIT 1",
          [req.params.id]
        );

        console.log(
          `  Devoluções existentes: ${devolucaoExistente.rows.length}`
        );

        if (devolucaoExistente.rows.length === 0) {
          // Buscar produtos da OS e devolver ao estoque
          const produtosOS = await client.query(
            "SELECT * FROM os_produtos WHERE os_id = $1",
            [req.params.id]
          );

          console.log(`  Produtos encontrados: ${produtosOS.rows.length}`);

          if (produtosOS.rows.length > 0) {
            for (const produto of produtosOS.rows) {
              if (produto.produto_id) {
                try {
                  console.log(
                    `  Devolução ao estoque: produto_id=${produto.produto_id}, quantidade=${produto.quantidade}`
                  );

                  // Verificar quantidade atual antes da devolução
                  const qtdAntes = await client.query(
                    "SELECT quantidade FROM produtos WHERE id = $1",
                    [produto.produto_id]
                  );
                  console.log(
                    `  Quantidade antes: ${
                      qtdAntes.rows[0]?.quantidade || "não encontrado"
                    }`
                  );

                  const updateResult = await client.query(
                    "UPDATE produtos SET quantidade = quantidade + $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2 RETURNING quantidade",
                    [produto.quantidade, produto.produto_id]
                  );

                  console.log(
                    `  Quantidade depois: ${
                      updateResult.rows[0]?.quantidade || "não atualizado"
                    }`
                  );
                  console.log(`  Linhas afetadas: ${updateResult.rowCount}`);

                  await client.query(
                    `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, os_id)
                     VALUES ($1, 'ENTRADA', $2, 'OS cancelada - devolução', $3)`,
                    [produto.produto_id, produto.quantidade, req.params.id]
                  );

                  console.log(`  ✓ Devolução registrada com sucesso`);
                } catch (prodError) {
                  console.error(
                    `  ✗ Erro ao processar produto ${produto.produto_id}:`,
                    prodError.message
                  );
                  throw prodError;
                }
              } else {
                console.log(
                  `  Produto sem produto_id (item manual): ${produto.descricao}`
                );
              }
            }
            console.log(`  ✓ Todas as devoluções processadas com sucesso`);
          }
        } else {
          console.log(`  Devolução já realizada anteriormente, ignorando.`);
        }
      } catch (estoqueError) {
        console.error("Erro ao processar devolução de estoque:", estoqueError);
        throw estoqueError; // Re-throw para fazer rollback da transação
      }
    }

    await client.query("COMMIT");
    clearCacheByPattern("/api/ordens-servico");

    // Notificar clientes WebSocket
    broadcastUpdate("os_atualizada", { id: req.params.id, status });

    // Se o estoque foi alterado, notificar também e limpar cache de produtos
    if (status === "Finalizada" || status === "Cancelada") {
      console.log(
        `[BROADCAST] Enviando estoque_atualizado: os_id=${req.params.id}, status=${status}`
      );
      clearCacheByPattern("/api/produtos");
      broadcastUpdate("estoque_atualizado", { os_id: req.params.id, status });
    }

    res.json({ message: "OS atualizada com sucesso" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao atualizar OS:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ============================================
// ROTAS - RELATÓRIOS E DASHBOARD
// ============================================

app.get("/api/relatorios/dashboard", async (req, res) => {
  try {
    // Faturamento do mês atual
    const faturamentoMesResult = await pool.query(`
      SELECT COALESCE(SUM(valor_total), 0) as faturamento
      FROM ordens_servico
      WHERE status = 'Finalizada'
        AND DATE_TRUNC('month', criado_em) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    // Ticket médio
    const ticketMedioResult = await pool.query(`
      SELECT COALESCE(AVG(valor_total), 0) as ticket_medio
      FROM ordens_servico
      WHERE status = 'Finalizada'
        AND DATE_TRUNC('month', criado_em) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    // Faturamento dos últimos 6 meses
    const faturamentoMensalResult = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', criado_em), 'Mon/YY') as mes,
        COALESCE(SUM(valor_total), 0) as valor
      FROM ordens_servico
      WHERE status = 'Finalizada'
        AND criado_em >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', criado_em)
      ORDER BY DATE_TRUNC('month', criado_em)
    `);

    // Produtos mais vendidos
    const produtosMaisVendidosResult = await pool.query(`
      SELECT 
        p.nome,
        COALESCE(SUM(op.quantidade), 0) as quantidade
      FROM produtos p
      LEFT JOIN os_produtos op ON p.id = op.produto_id
      LEFT JOIN ordens_servico os ON op.os_id = os.id
      WHERE os.status = 'Finalizada'
        AND os.criado_em >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY p.id, p.nome
      HAVING SUM(op.quantidade) > 0
      ORDER BY quantidade DESC
      LIMIT 10
    `);

    res.json({
      faturamentoMes: parseFloat(
        faturamentoMesResult.rows[0]?.faturamento || 0
      ),
      ticketMedio: parseFloat(ticketMedioResult.rows[0]?.ticket_medio || 0),
      faturamentoMensal: faturamentoMensalResult.rows.map((row) => ({
        mes: row.mes,
        valor: parseFloat(row.valor),
      })),
      produtosMaisVendidos: produtosMaisVendidosResult.rows.map((row) => ({
        nome: row.nome,
        quantidade: parseInt(row.quantidade),
      })),
    });
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    res.status(500).json({ error: error.message });
  }
});

// Relatório de vendas por período
app.get("/api/relatorios/vendas", async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;

    let query = `
      SELECT 
        os.id,
        os.numero,
        os.criado_em,
        os.valor_total,
        os.status,
        c.nome as cliente_nome,
        v.modelo as veiculo_modelo,
        v.placa as veiculo_placa
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN veiculos v ON os.veiculo_id = v.id
      WHERE os.status = 'Finalizada'
    `;

    const params = [];
    if (dataInicio && dataFim) {
      query += ` AND os.criado_em BETWEEN $1 AND $2`;
      params.push(dataInicio, dataFim);
    }

    query += ` ORDER BY os.criado_em DESC`;

    const result = await pool.query(query, params);

    const total = result.rows.reduce(
      (sum, os) => sum + parseFloat(os.valor_total),
      0
    );

    res.json({
      vendas: result.rows,
      total: total,
      quantidade: result.rows.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS - AUDITORIA
// ============================================

// Middleware para registrar alterações
async function registrarAuditoria(
  tabela,
  registroId,
  acao,
  dadosAnteriores,
  dadosNovos,
  usuario = "sistema"
) {
  try {
    await pool.query(
      `INSERT INTO auditoria (tabela, registro_id, acao, dados_anteriores, dados_novos, usuario)
       VALUES ($1, $2::integer, $3, $4::jsonb, $5::jsonb, $6)`,
      [
        tabela,
        registroId,
        acao,
        JSON.stringify(dadosAnteriores),
        JSON.stringify(dadosNovos),
        usuario,
      ]
    );
  } catch (error) {
    console.error("Erro ao registrar auditoria:", error);
  }
}

// Buscar histórico de uma OS
app.get("/api/auditoria/ordens-servico/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM auditoria 
       WHERE tabela = 'ordens_servico' AND registro_id = $1 
       ORDER BY criado_em DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar histórico de um orçamento
app.get("/api/auditoria/orcamentos/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM auditoria 
       WHERE tabela = 'orcamentos' AND registro_id = $1 
       ORDER BY criado_em DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS - BACKUP
// ============================================

app.post("/api/backup", async (req, res) => {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const backupDir = path.join(__dirname, "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    // Exportar todas as tabelas principais
    const [produtos, clientes, veiculos, orcamentos, ordens] =
      await Promise.all([
        pool.query("SELECT * FROM produtos"),
        pool.query("SELECT * FROM clientes"),
        pool.query("SELECT * FROM veiculos"),
        pool.query("SELECT * FROM orcamentos"),
        pool.query("SELECT * FROM ordens_servico"),
      ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      database: "benny_motorsport",
      tables: {
        produtos: produtos.rows,
        clientes: clientes.rows,
        veiculos: veiculos.rows,
        orcamentos: orcamentos.rows,
        ordens_servico: ordens.rows,
      },
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    res.json({
      success: true,
      message: "Backup realizado com sucesso",
      file: backupFile,
      size: fs.statSync(backupFile).size,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar backups disponíveis
app.get("/api/backup/list", async (req, res) => {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const backupDir = path.join(__dirname, "backups");

    if (!fs.existsSync(backupDir)) {
      return res.json([]);
    }

    const files = fs
      .readdirSync(backupDir)
      .filter((file) => file.startsWith("backup-") && file.endsWith(".json"))
      .map((file) => {
        const stats = fs.statSync(path.join(backupDir, file));
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime,
        };
      })
      .sort((a, b) => b.created - a.created);

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BACKUP AUTOMÁTICO AGENDADO
// ============================================

// Função para realizar backup automático
async function realizarBackupAutomatico() {
  try {
    console.log("🔄 Iniciando backup automático...");

    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const backupDir = path.join(__dirname, "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(backupDir, `backup-auto-${timestamp}.json`);

    const [produtos, clientes, veiculos, orcamentos, ordens] =
      await Promise.all([
        pool.query("SELECT * FROM produtos"),
        pool.query("SELECT * FROM clientes"),
        pool.query("SELECT * FROM veiculos"),
        pool.query("SELECT * FROM orcamentos"),
        pool.query("SELECT * FROM ordens_servico"),
      ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      database: "benny_motorsport",
      tipo: "automatico",
      tables: {
        produtos: produtos.rows,
        clientes: clientes.rows,
        veiculos: veiculos.rows,
        orcamentos: orcamentos.rows,
        ordens_servico: ordens.rows,
      },
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    // Limpar backups antigos (manter apenas últimos 10)
    const files = fs
      .readdirSync(backupDir)
      .filter((file) => file.startsWith("backup-") && file.endsWith(".json"))
      .map((file) => ({
        name: file,
        path: path.join(backupDir, file),
        created: fs.statSync(path.join(backupDir, file)).birthtime,
      }))
      .sort((a, b) => b.created - a.created);

    if (files.length > 10) {
      files.slice(10).forEach((file) => {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Backup antigo removido: ${file.name}`);
      });
    }

    console.log(`✓ Backup automático realizado com sucesso: ${backupFile}`);
  } catch (error) {
    console.error("❌ Erro ao realizar backup automático:", error);
  }
}

// Agendar backup diário às 2h da manhã
schedule.scheduleJob("0 2 * * *", realizarBackupAutomatico);

console.log("📅 Backup automático agendado para executar diariamente às 2h");

// ============================================
// WEBSOCKET PARA ATUALIZAÇÕES EM TEMPO REAL
// ============================================

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  logger.info("Novo cliente WebSocket conectado");

  ws.on("message", (message) => {
    logger.info(`Mensagem WebSocket recebida: ${message}`);
  });

  ws.on("close", () => {
    logger.info("Cliente WebSocket desconectado");
  });

  ws.on("error", (error) => {
    logger.error("Erro WebSocket:", error);
  });
});

// Função para notificar todos os clientes WebSocket
function broadcastUpdate(type, data) {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(message);
    }
  });

  logger.debug(`Broadcast enviado: ${type}`);
}

// ============================================
// TRATAMENTO DE ERROS CENTRALIZADO
// ============================================

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  logger.error("Erro na requisição:", {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Violação de unicidade (registro duplicado)
  if (err.code === "23505") {
    return res.status(409).json({ error: "Registro duplicado" });
  }

  // Violação de chave estrangeira
  if (err.code === "23503") {
    return res.status(400).json({ error: "Referência inválida" });
  }

  // Violação de not null
  if (err.code === "23502") {
    return res.status(400).json({ error: "Campo obrigatório não preenchido" });
  }

  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Erro interno do servidor"
        : err.message,
  });
});

// Handler para rotas não encontradas (404)
app.use((req, res) => {
  logger.warn(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Endpoint não encontrado" });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

server.listen(PORT, () => {
  logger.info(`✓ Servidor rodando em http://localhost:${PORT}`);
  logger.info(`✓ WebSocket disponível na mesma porta`);
  console.log(`✓ Servidor rodando em http://localhost:${PORT}`);
});
