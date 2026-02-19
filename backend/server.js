import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import compression from "compression";
import dotenv from "dotenv";
import schedule from "node-schedule";
import { body, validationResult } from "express-validator";
import path from "path";
import pool from "./database.js";

// Importar novas rotas MVC
import apiRoutes from "./src/routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(compression()); // Compressão de respostas

// Configurar CORS
const corsOptions = {
  origin: [
    "http://localhost:7", // Vite dev server
    "https://benny-theta.vercel.app", // Produção no Vercel
    /\.vercel\.app$/, // Permite todos os preview deployments do Vercel
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Usar rotas MVC (novas funcionalidades)
// Servir arquivos gerados (storage) para download/visualização (modo local)
app.use(
  "/api/storage",
  express.static(path.join(process.cwd(), "backend", "storage")),
);

app.use("/api", apiRoutes);

// Middleware de paginação
const paginate = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  req.pagination = { limit, offset, page };
  next();
};

// Middleware de validação para criar produto (codigo agora opcional)
const validateProduto = [
  body("codigo").optional().isString(),
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
    await pool.query("SELECT 1");
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// ============================================
// ROTAS - PRODUTOS/ESTOQUE
// ============================================

// Listar todos os produtos (com paginação)
app.get("/api/produtos", paginate, async (req, res) => {
  try {
    const { limit, offset, page } = req.pagination;

    console.log(`Listando produtos - limit: ${limit}, offset: ${offset}`);

    const result = await pool.query(
      "SELECT * FROM produtos ORDER BY nome LIMIT $1 OFFSET $2",
      [limit, offset],
    );

    const countResult = await pool.query("SELECT COUNT(*) FROM produtos");
    const total = parseInt(countResult.rows[0].count);

    console.log(`Produtos encontrados: ${result.rows.length} de ${total}`);

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
    console.error("Erro ao listar produtos:", error);
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
      "SELECT * FROM produtos WHERE quantidade <= estoque_minimo ORDER BY quantidade",
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota de diagnóstico para verificar produtos problemáticos
app.get("/api/produtos/diagnostico/verificar", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, codigo, nome, 
              CASE WHEN descricao IS NULL THEN 'NULL' ELSE 'OK' END as descricao_status,
              quantidade, valor_custo, valor_venda, estoque_minimo
       FROM produtos 
       ORDER BY id`,
    );

    const problemProducts = result.rows.filter(
      (p) =>
        p.quantidade === null ||
        p.valor_venda === null ||
        p.codigo === null ||
        p.nome === null,
    );

    res.json({
      total: result.rows.length,
      problemProducts: problemProducts,
      allProducts: result.rows,
    });
  } catch (error) {
    console.error("Erro no diagnóstico:", error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar produto por ID
app.get("/api/produtos/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const result = await client.query(
      `SELECT id, 
              COALESCE(codigo, '') as codigo, 
              COALESCE(nome, '') as nome, 
              COALESCE(descricao, '') as descricao, 
              COALESCE(quantidade, 0)::numeric as quantidade, 
              COALESCE(valor_custo, 0)::numeric as valor_custo, 
              COALESCE(valor_venda, 0)::numeric as valor_venda, 
              COALESCE(estoque_minimo, 0)::numeric as estoque_minimo, 
              criado_em, atualizado_em 
       FROM produtos WHERE id = $1::integer`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Erro ao buscar produto ${req.params.id}:`, {
      message: error.message,
      code: error.code,
    });

    res.status(500).json({
      error: "Erro ao buscar produto",
      message: error.message,
    });
  } finally {
    client.release();
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
    let result;

    if (codigo && codigo.toString().trim() !== "") {
      // Se o cliente forneceu um código, usa-o
      result = await pool.query(
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
        ],
      );
    } else {
      // Gerar código automático no formato P-0001 baseado no maior número extraído dos códigos existentes
      const insertQuery = `WITH next_num AS (
          SELECT COALESCE(MAX((regexp_replace(codigo, '\\D', '', 'g'))::int), 0) + 1 AS n FROM produtos
        )
        INSERT INTO produtos (codigo, nome, descricao, quantidade, valor_custo, valor_venda, estoque_minimo)
        SELECT ('P-' || lpad(next_num.n::text, 4, '0')) as codigo, $1, $2, $3, $4, $5, $6
        FROM next_num
        RETURNING *`;

      result = await pool.query(insertQuery, [
        nome,
        descricao,
        quantidade || 0,
        valor_custo || 0,
        valor_venda || 0,
        estoque_minimo || 5,
      ]);
    }

    // Cache removido (não necessário para 10-50 clientes)

    console.log(`Produto criado: ${result.rows[0].id}`);

    res.status(201).json({
      id: result.rows[0].id,
      message: "Produto criado com sucesso",
      produto: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao criar produto:", error);
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
      ],
    );

    console.log(
      `Produto ${req.params.id} atualizado - Nova quantidade: ${quantidade}`,
    );

    // WebSocket removido (HTTP simples suficiente)

    console.log(`Produto atualizado: ${req.params.id}`);

    res.json({
      message: "Produto atualizado com sucesso",
      produto: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar produto
app.delete("/api/produtos/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM produtos WHERE id = $1", [req.params.id]);

    res.json({ message: "Produto deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar produto:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS - SERVIÇOS
// ============================================

// Listar serviços
app.get("/api/servicos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM servicos ORDER BY nome");
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar serviços:", error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar serviço por ID
app.get("/api/servicos/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM servicos WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Serviço não encontrado" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Erro ao buscar serviço ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Criar serviço
app.post("/api/servicos", async (req, res) => {
  try {
    const { codigo, nome, descricao, valor_unitario } = req.body;
    let result;

    if (codigo && codigo.toString().trim() !== "") {
      // Se o cliente forneceu um código, usa-o
      result = await pool.query(
        `INSERT INTO servicos (codigo, nome, descricao, valor_unitario) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [codigo, nome, descricao, valor_unitario || 0],
      );
    } else {
      // Gerar código automático no formato S-0001 baseado no maior número
      const insertQuery = `WITH next_num AS (
          SELECT COALESCE(MAX((regexp_replace(codigo, '\\D', '', 'g'))::int), 0) + 1 AS n FROM servicos
        )
        INSERT INTO servicos (codigo, nome, descricao, valor_unitario)
        SELECT ('S-' || lpad(next_num.n::text, 4, '0')) as codigo, $1, $2, $3
        FROM next_num
        RETURNING *`;

      result = await pool.query(insertQuery, [
        nome,
        descricao,
        valor_unitario || 0,
      ]);
    }

    console.log(`Serviço criado: ${result.rows[0].id}`);
    res
      .status(201)
      .json({ servico: result.rows[0], message: "Serviço criado" });
  } catch (error) {
    console.error("Erro ao criar serviço:", error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar serviço
app.put("/api/servicos/:id", async (req, res) => {
  try {
    const { codigo, nome, descricao, valor_unitario } = req.body;
    const result = await pool.query(
      `UPDATE servicos SET codigo=$1, nome=$2, descricao=$3, valor_unitario=$4, atualizado_em=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *`,
      [codigo, nome, descricao, valor_unitario || 0, req.params.id],
    );
    res.json({ servico: result.rows[0], message: "Serviço atualizado" });
  } catch (error) {
    console.error(`Erro ao atualizar serviço ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar serviço
app.delete("/api/servicos/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM servicos WHERE id = $1", [req.params.id]);
    res.json({ message: "Serviço deletado com sucesso" });
  } catch (error) {
    console.error(`Erro ao deletar serviço ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS - CLIENTES
// ============================================

app.get("/api/clientes", async (req, res) => {
  try {
    const { busca } = req.query;

    console.log(`Buscando clientes - busca: "${busca}"`);

    let query = "SELECT * FROM clientes";
    const params = [];

    if (busca) {
      query +=
        " WHERE LOWER(nome) LIKE LOWER($1) OR LOWER(telefone) LIKE LOWER($1) OR LOWER(cpf_cnpj) LIKE LOWER($1)";
      params.push(`%${busca}%`);
    }

    query += " ORDER BY nome LIMIT 50";

    console.log(`Query SQL: ${query}`);
    console.log(`Params: ${JSON.stringify(params)}`);

    const result = await pool.query(query, params);

    console.log(`Clientes encontrados: ${result.rows.length}`);

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
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
      [nome, telefone, cpf_cnpj, email, endereco],
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
      [nome, telefone, cpf_cnpj, email, endereco, req.params.id],
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
      [req.params.clienteId],
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
      [cliente_id, modelo, cor, placa, ano],
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
    "SELECT numero FROM orcamentos ORDER BY id DESC LIMIT 1",
  );
  if (result.rows.length === 0) return "ORC-0001";

  const numero = parseInt(result.rows[0].numero.split("-")[1]) + 1;
  return `ORC-${numero.toString().padStart(4, "0")}`;
}

// Função para gerar token público único
async function gerarTokenPublico() {
  const crypto = await import("crypto");
  let token;
  let existe = true;

  // Gerar token único
  while (existe) {
    token = crypto.randomBytes(32).toString("hex");
    const result = await pool.query(
      "SELECT id FROM orcamentos WHERE token_publico = $1",
      [token],
    );
    existe = result.rows.length > 0;
  }

  return token;
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
      [req.params.id],
    );

    if (orcResult.rows.length === 0) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    const produtosResult = await pool.query(
      "SELECT * FROM orcamento_produtos WHERE orcamento_id = $1",
      [req.params.id],
    );
    const servicosResult = await pool.query(
      "SELECT * FROM orcamento_servicos WHERE orcamento_id = $1",
      [req.params.id],
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
app.get("/api/orcamentos/v/:token", async (req, res) => {
  try {
    const orcResult = await pool.query(
      `
      SELECT o.*, 
             c.nome as cliente_nome, c.telefone as cliente_telefone, c.cpf_cnpj as cliente_cpf_cnpj,
             v.modelo as veiculo_modelo, v.placa as veiculo_placa, v.cor as veiculo_cor
      FROM orcamentos o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      LEFT JOIN veiculos v ON o.veiculo_id = v.id
      WHERE o.token_publico = $1
    `,
      [req.params.token],
    );

    if (orcResult.rows.length === 0) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    const produtosResult = await pool.query(
      "SELECT * FROM orcamento_produtos WHERE orcamento_id = $1",
      [orcResult.rows[0].id],
    );
    const servicosResult = await pool.query(
      "SELECT * FROM orcamento_servicos WHERE orcamento_id = $1",
      [orcResult.rows[0].id],
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
app.put("/api/orcamentos/v/:token/aprovar", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verificar status atual antes de aprovar
    const statusAtual = await client.query(
      "SELECT id, status FROM orcamentos WHERE token_publico = $1",
      [req.params.token],
    );

    if (statusAtual.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    const orcamentoId = statusAtual.rows[0].id;
    const jaAprovado = statusAtual.rows[0].status === "Aprovado";

    const result = await client.query(
      "UPDATE orcamentos SET status = 'Aprovado', atualizado_em = CURRENT_TIMESTAMP WHERE token_publico = $1 RETURNING *",
      [req.params.token],
    );

    // Só dar baixa no estoque se não estava aprovado antes
    if (!jaAprovado) {
      // Buscar produtos do orçamento e dar baixa no estoque
      const produtosResult = await client.query(
        "SELECT * FROM orcamento_produtos WHERE orcamento_id = $1",
        [orcamentoId],
      );

      if (produtosResult.rows.length > 0) {
        for (const produto of produtosResult.rows) {
          if (produto.produto_id) {
            console.log(
              `Aprovação de orçamento: Dando baixa - produto_id=${produto.produto_id}, qtd=${produto.quantidade}`,
            );

            await client.query(
              "UPDATE produtos SET quantidade = quantidade - $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2",
              [produto.quantidade, produto.produto_id],
            );

            await client.query(
              `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, orcamento_id)
               VALUES ($1, 'SAIDA', $2, 'Orçamento aprovado', $3)`,
              [produto.produto_id, produto.quantidade, orcamentoId],
            );
          }
        }
      }
    } else {
      console.log(
        `Orçamento ${orcamentoId} já estava aprovado, baixa ignorada`,
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Orçamento aprovado com sucesso",
      orcamento: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao aprovar orçamento:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Rota pública para reprovar orçamento
app.put("/api/orcamentos/v/:token/reprovar", async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE orcamentos SET status = 'Reprovado', atualizado_em = CURRENT_TIMESTAMP WHERE token_publico = $1 RETURNING *",
      [req.params.token],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

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
    const tokenPublico = await gerarTokenPublico();

    // Calcular totais
    const valor_produtos =
      produtos?.reduce((sum, item) => sum + item.valor_total, 0) || 0;
    const valor_servicos =
      servicos?.reduce((sum, item) => sum + item.valor_total, 0) || 0;
    const valor_total = valor_produtos + valor_servicos;

    // Inserir orçamento
    const orcResult = await client.query(
      `INSERT INTO orcamentos (numero, cliente_id, veiculo_id, km, previsao_entrega, observacoes_veiculo, observacoes_gerais, responsavel_tecnico, valor_produtos, valor_servicos, valor_total, token_publico)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
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
        tokenPublico,
      ],
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
          ],
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
          ],
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
    console.error("Erro ao criar orçamento:", error);
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
      [req.params.id],
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
      ],
    );

    // Deletar produtos e serviços antigos
    await client.query(
      "DELETE FROM orcamento_produtos WHERE orcamento_id = $1",
      [req.params.id],
    );
    await client.query(
      "DELETE FROM orcamento_servicos WHERE orcamento_id = $1",
      [req.params.id],
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
          ],
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
          ],
        );
      }
    }

    // Buscar dados novos para auditoria
    const dadosNovos = await client.query(
      "SELECT * FROM orcamentos WHERE id = $1",
      [req.params.id],
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
        ],
      );
    } catch (auditoriaError) {
      console.error("Erro ao registrar auditoria:", auditoriaError);
    }

    // Se o status mudou para "Aprovado", dar baixa no estoque
    const statusAnterior = dadosAnteriores.rows[0]?.status;
    console.log(
      `Orçamento ${req.params.id}: Status anterior: ${statusAnterior}, Status novo: ${status}`,
    );

    if (status === "Aprovado" && statusAnterior !== "Aprovado") {
      console.log(
        `Orçamento aprovado via edição: ID=${req.params.id}, dando baixa no estoque`,
      );

      try {
        // Verificar se já existe movimentação de estoque para este orçamento
        const movExistente = await client.query(
          "SELECT id FROM movimentacoes_estoque WHERE orcamento_id = $1 AND motivo = 'Orçamento aprovado' LIMIT 1",
          [req.params.id],
        );

        if (movExistente.rows.length === 0) {
          // Buscar produtos do orçamento e dar baixa
          const produtosEstoque = await client.query(
            "SELECT * FROM orcamento_produtos WHERE orcamento_id = $1",
            [req.params.id],
          );

          if (produtosEstoque.rows.length > 0) {
            for (const produto of produtosEstoque.rows) {
              if (produto.produto_id) {
                try {
                  console.log(
                    `  Baixa no estoque: produto_id=${produto.produto_id}, quantidade=${produto.quantidade}`,
                  );

                  // Verificar quantidade atual antes da baixa
                  const qtdAntes = await client.query(
                    "SELECT quantidade FROM produtos WHERE id = $1",
                    [produto.produto_id],
                  );
                  console.log(
                    `  Quantidade antes: ${
                      qtdAntes.rows[0]?.quantidade || "não encontrado"
                    }`,
                  );

                  const updateResult = await client.query(
                    "UPDATE produtos SET quantidade = quantidade - $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2 RETURNING quantidade",
                    [produto.quantidade, produto.produto_id],
                  );

                  console.log(
                    `  Quantidade depois: ${
                      updateResult.rows[0]?.quantidade || "não atualizado"
                    }`,
                  );
                  console.log(`  Linhas afetadas: ${updateResult.rowCount}`);

                  await client.query(
                    `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, orcamento_id)
                     VALUES ($1, 'SAIDA', $2, 'Orçamento aprovado', $3)`,
                    [produto.produto_id, produto.quantidade, req.params.id],
                  );

                  console.log(`  ✓ Baixa registrada com sucesso`);
                } catch (prodError) {
                  console.error(
                    `  ✗ Erro ao processar produto ${produto.produto_id}:`,
                    prodError.message,
                  );
                  throw prodError;
                }
              } else {
                console.log(
                  `  Produto sem produto_id (item manual): ${produto.descricao}`,
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

    // Se orçamento foi aprovado, log de info
    if (status === "Aprovado" && statusAnterior !== "Aprovado") {
      console.log(
        `[INFO] Orçamento ${req.params.id} aprovado - estoque foi alterado`,
      );
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
      [req.params.id],
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
      ],
    );

    const os_id = osResult.rows[0].id;

    // Copiar produtos (estoque já foi reduzido na aprovação)
    const produtosResult = await client.query(
      "SELECT * FROM orcamento_produtos WHERE orcamento_id = $1",
      [req.params.id],
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
          ],
        );

        // Nota: Não dar baixa novamente, pois já foi feita na aprovação
      }
    }

    // Copiar serviços
    const servicosResult = await client.query(
      "SELECT * FROM orcamento_servicos WHERE orcamento_id = $1",
      [req.params.id],
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
          ],
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
    "SELECT numero FROM ordens_servico ORDER BY id DESC LIMIT 1",
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
      [req.params.id],
    );

    if (osResult.rows.length === 0) {
      return res.status(404).json({ error: "OS não encontrada" });
    }

    const produtosResult = await pool.query(
      "SELECT * FROM os_produtos WHERE os_id = $1",
      [req.params.id],
    );
    const servicosResult = await pool.query(
      "SELECT * FROM os_servicos WHERE os_id = $1",
      [req.params.id],
    );

    res.json({
      ...osResult.rows[0],
      produtos: produtosResult.rows,
      servicos: servicosResult.rows,
    });
  } catch (error) {
    console.error(
      "[ERROR] Erro em GET /api/ordens-servico/:id:",
      error.message,
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

    console.log("Criando nova OS", {
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
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Aberta') RETURNING id`,
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
      ],
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
          ],
        );

        if (produto.produto_id) {
          console.log(
            `Baixa estoque OS: produto=${produto.produto_id}, qtd=${produto.quantidade}`,
          );

          await client.query(
            "UPDATE produtos SET quantidade = quantidade - $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2",
            [produto.quantidade, produto.produto_id],
          );

          await client.query(
            `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, os_id)
             VALUES ($1, 'SAIDA', $2, 'Utilizado na OS', $3)`,
            [produto.produto_id, produto.quantidade, os_id],
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
          ],
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
      [req.params.id],
    );

    if (dadosAnteriores.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "OS não encontrada" });
    }

    // Atualizar OS
    await client.query(
      `UPDATE ordens_servico 
       SET status = $1::varchar, responsavel_tecnico = $2::varchar, atualizado_em = CURRENT_TIMESTAMP,
           finalizado_em = CASE WHEN $1::varchar = 'Finalizada' THEN CURRENT_TIMESTAMP ELSE finalizado_em END
       WHERE id = $3`,
      [status, responsavel_tecnico, req.params.id],
    );

    // Buscar dados novos
    const dadosNovos = await client.query(
      "SELECT * FROM ordens_servico WHERE id = $1",
      [req.params.id],
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
        ],
      );
    } catch (auditoriaError) {
      console.error("Erro ao registrar auditoria:", auditoriaError);
      // Continua mesmo se auditoria falhar
    }

    // Gerenciar estoque baseado no status
    const statusAnterior = dadosAnteriores.rows[0]?.status;
    console.log(
      `OS ${req.params.id}: Status anterior: ${statusAnterior}, Status novo: ${status}`,
    );

    // Se a OS foi FINALIZADA, dar baixa no estoque
    if (status === "Finalizada" && statusAnterior !== "Finalizada") {
      console.log(`OS finalizada: ID=${req.params.id}, dando baixa no estoque`);

      try {
        // Verificar se já existe baixa para esta OS
        const baixaExistente = await client.query(
          "SELECT id FROM movimentacoes_estoque WHERE os_id = $1 AND motivo = 'OS finalizada - baixa' LIMIT 1",
          [req.params.id],
        );

        console.log(`  Baixas existentes: ${baixaExistente.rows.length}`);

        if (baixaExistente.rows.length === 0) {
          // Buscar produtos da OS e dar baixa no estoque
          const produtosOS = await client.query(
            "SELECT * FROM os_produtos WHERE os_id = $1",
            [req.params.id],
          );

          console.log(`  Produtos encontrados: ${produtosOS.rows.length}`);

          if (produtosOS.rows.length > 0) {
            for (const produto of produtosOS.rows) {
              if (produto.produto_id) {
                try {
                  console.log(
                    `  Baixa no estoque: produto_id=${produto.produto_id}, quantidade=${produto.quantidade}`,
                  );

                  // Verificar quantidade atual antes da baixa
                  const qtdAntes = await client.query(
                    "SELECT quantidade FROM produtos WHERE id = $1",
                    [produto.produto_id],
                  );
                  console.log(
                    `  Quantidade antes: ${
                      qtdAntes.rows[0]?.quantidade || "não encontrado"
                    }`,
                  );

                  // Verificar se tem estoque suficiente
                  if (
                    qtdAntes.rows[0] &&
                    qtdAntes.rows[0].quantidade < produto.quantidade
                  ) {
                    console.warn(
                      `  ⚠️ Estoque insuficiente: disponível=${qtdAntes.rows[0].quantidade}, necessário=${produto.quantidade}`,
                    );
                  }

                  const updateResult = await client.query(
                    "UPDATE produtos SET quantidade = quantidade - $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2 RETURNING quantidade",
                    [produto.quantidade, produto.produto_id],
                  );

                  console.log(
                    `  Quantidade depois: ${
                      updateResult.rows[0]?.quantidade || "não atualizado"
                    }`,
                  );
                  console.log(`  Linhas afetadas: ${updateResult.rowCount}`);

                  await client.query(
                    `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, os_id)
                     VALUES ($1, 'SAIDA', $2, 'OS finalizada - baixa', $3)`,
                    [produto.produto_id, produto.quantidade, req.params.id],
                  );

                  console.log(`  ✓ Baixa registrada com sucesso`);
                } catch (prodError) {
                  console.error(
                    `  ✗ Erro ao processar produto ${produto.produto_id}:`,
                    prodError.message,
                  );
                  throw prodError;
                }
              } else {
                console.log(
                  `  Produto sem produto_id (item manual): ${produto.descricao}`,
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
        `OS cancelada: ID=${req.params.id}, devolvendo itens ao estoque`,
      );

      try {
        // Verificar se já existe devolução para esta OS
        const devolucaoExistente = await client.query(
          "SELECT id FROM movimentacoes_estoque WHERE os_id = $1 AND motivo = 'OS cancelada - devolução' LIMIT 1",
          [req.params.id],
        );

        console.log(
          `  Devoluções existentes: ${devolucaoExistente.rows.length}`,
        );

        if (devolucaoExistente.rows.length === 0) {
          // Buscar produtos da OS e devolver ao estoque
          const produtosOS = await client.query(
            "SELECT * FROM os_produtos WHERE os_id = $1",
            [req.params.id],
          );

          console.log(`  Produtos encontrados: ${produtosOS.rows.length}`);

          if (produtosOS.rows.length > 0) {
            for (const produto of produtosOS.rows) {
              if (produto.produto_id) {
                try {
                  console.log(
                    `  Devolução ao estoque: produto_id=${produto.produto_id}, quantidade=${produto.quantidade}`,
                  );

                  // Verificar quantidade atual antes da devolução
                  const qtdAntes = await client.query(
                    "SELECT quantidade FROM produtos WHERE id = $1",
                    [produto.produto_id],
                  );
                  console.log(
                    `  Quantidade antes: ${
                      qtdAntes.rows[0]?.quantidade || "não encontrado"
                    }`,
                  );

                  const updateResult = await client.query(
                    "UPDATE produtos SET quantidade = quantidade + $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2 RETURNING quantidade",
                    [produto.quantidade, produto.produto_id],
                  );

                  console.log(
                    `  Quantidade depois: ${
                      updateResult.rows[0]?.quantidade || "não atualizado"
                    }`,
                  );
                  console.log(`  Linhas afetadas: ${updateResult.rowCount}`);

                  await client.query(
                    `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, os_id)
                     VALUES ($1, 'ENTRADA', $2, 'OS cancelada - devolução', $3)`,
                    [produto.produto_id, produto.quantidade, req.params.id],
                  );

                  console.log(`  ✓ Devolução registrada com sucesso`);
                } catch (prodError) {
                  console.error(
                    `  ✗ Erro ao processar produto ${produto.produto_id}:`,
                    prodError.message,
                  );
                  throw prodError;
                }
              } else {
                console.log(
                  `  Produto sem produto_id (item manual): ${produto.descricao}`,
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

    // Log de info se estoque foi alterado
    if (status === "Finalizada" || status === "Cancelada") {
      console.log(
        `[INFO] Estoque atualizado: os_id=${req.params.id}, status=${status}`,
      );
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
        faturamentoMesResult.rows[0]?.faturamento || 0,
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
      0,
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
  usuario = "sistema",
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
      ],
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
      [req.params.id],
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
      [req.params.id],
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS - AGENDAMENTOS
// ============================================

// Listar agendamentos com filtros
app.get("/api/agendamentos", async (req, res) => {
  try {
    const { data_inicio, data_fim, status, cliente_id } = req.query;

    let query = `
      SELECT a.*, 
             c.nome as cliente_nome, c.telefone as cliente_telefone,
             v.modelo as veiculo_modelo, v.placa as veiculo_placa
      FROM agendamentos a
      LEFT JOIN clientes c ON a.cliente_id = c.id
      LEFT JOIN veiculos v ON a.veiculo_id = v.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (data_inicio) {
      query += ` AND a.data_agendamento >= $${paramIndex}`;
      params.push(data_inicio);
      paramIndex++;
    }

    if (data_fim) {
      query += ` AND a.data_agendamento <= $${paramIndex}`;
      params.push(data_fim);
      paramIndex++;
    }

    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (cliente_id) {
      query += ` AND a.cliente_id = $${paramIndex}`;
      params.push(cliente_id);
      paramIndex++;
    }

    query += ` ORDER BY a.data_agendamento DESC, a.hora_inicio ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar agendamentos:", error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar agendamento por ID
app.get("/api/agendamentos/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, 
              c.nome as cliente_nome, c.telefone as cliente_telefone,
              v.modelo as veiculo_modelo, v.placa as veiculo_placa
       FROM agendamentos a
       LEFT JOIN clientes c ON a.cliente_id = c.id
       LEFT JOIN veiculos v ON a.veiculo_id = v.id
       WHERE a.id = $1`,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar agendamento
app.post("/api/agendamentos", async (req, res) => {
  try {
    const {
      cliente_id,
      veiculo_id,
      data_agendamento,
      hora_inicio,
      hora_fim,
      tipo_servico,
      observacoes,
      valor_estimado,
      mecanico_responsavel,
    } = req.body;

    // Verificar conflito de horário
    const conflito = await pool.query(
      `SELECT id FROM agendamentos 
       WHERE data_agendamento = $1 
       AND status NOT IN ('Cancelado', 'Concluído')
       AND (
         (hora_inicio <= $2 AND hora_fim >= $2) OR
         (hora_inicio <= $3 AND hora_fim >= $3) OR
         (hora_inicio >= $2 AND hora_fim <= $3)
       )`,
      [data_agendamento, hora_inicio, hora_fim || hora_inicio],
    );

    if (conflito.rows.length > 0) {
      return res.status(400).json({
        error: "Já existe um agendamento neste horário",
      });
    }

    const result = await pool.query(
      `INSERT INTO agendamentos 
       (cliente_id, veiculo_id, data_agendamento, hora_inicio, hora_fim, 
        tipo_servico, observacoes, valor_estimado, mecanico_responsavel)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        cliente_id,
        veiculo_id || null,
        data_agendamento,
        hora_inicio,
        hora_fim || null,
        tipo_servico,
        observacoes || null,
        valor_estimado || null,
        mecanico_responsavel || null,
      ],
    );

    // Criar lembrete automático (1 dia antes)
    const dataLembrete = new Date(data_agendamento);
    dataLembrete.setDate(dataLembrete.getDate() - 1);
    dataLembrete.setHours(9, 0, 0, 0);

    await pool.query(
      `INSERT INTO lembretes (tipo, referencia_id, titulo, mensagem, data_lembrete, prioridade)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        "agendamento",
        result.rows[0].id,
        "Lembrete de Agendamento",
        `Agendamento amanhã às ${hora_inicio} - ${tipo_servico}`,
        dataLembrete,
        "alta",
      ],
    );

    console.log(`Agendamento criado: ${result.rows[0].id}`);

    res.status(201).json({
      message: "Agendamento criado com sucesso",
      agendamento: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar agendamento
app.put("/api/agendamentos/:id", async (req, res) => {
  try {
    const {
      status,
      data_agendamento,
      hora_inicio,
      hora_fim,
      tipo_servico,
      observacoes,
      valor_estimado,
      mecanico_responsavel,
    } = req.body;

    const result = await pool.query(
      `UPDATE agendamentos 
       SET status = COALESCE($1, status),
           data_agendamento = COALESCE($2, data_agendamento),
           hora_inicio = COALESCE($3, hora_inicio),
           hora_fim = COALESCE($4, hora_fim),
           tipo_servico = COALESCE($5, tipo_servico),
           observacoes = COALESCE($6, observacoes),
           valor_estimado = COALESCE($7, valor_estimado),
           mecanico_responsavel = COALESCE($8, mecanico_responsavel),
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        status,
        data_agendamento,
        hora_inicio,
        hora_fim,
        tipo_servico,
        observacoes,
        valor_estimado,
        mecanico_responsavel,
        req.params.id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    res.json({
      message: "Agendamento atualizado com sucesso",
      agendamento: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar agendamento
app.delete("/api/agendamentos/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM agendamentos WHERE id = $1", [req.params.id]);
    await pool.query(
      "DELETE FROM lembretes WHERE tipo = 'agendamento' AND referencia_id = $1",
      [req.params.id],
    );

    res.json({ message: "Agendamento deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar agendamento:", error);
    res.status(500).json({ error: error.message });
  }
});

// Agendamentos do dia
app.get("/api/agendamentos/hoje/lista", async (req, res) => {
  try {
    const hoje = new Date().toISOString().split("T")[0];

    const result = await pool.query(
      `SELECT a.*, 
              c.nome as cliente_nome, c.telefone as cliente_telefone,
              v.modelo as veiculo_modelo, v.placa as veiculo_placa
       FROM agendamentos a
       LEFT JOIN clientes c ON a.cliente_id = c.id
       LEFT JOIN veiculos v ON a.veiculo_id = v.id
       WHERE a.data_agendamento = $1
       ORDER BY a.hora_inicio ASC`,
      [hoje],
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS - CONTAS A PAGAR
// ============================================

// Listar contas a pagar com filtros
app.get("/api/contas-pagar", async (req, res) => {
  try {
    const { status, data_inicio, data_fim, categoria } = req.query;

    let query = "SELECT * FROM contas_pagar WHERE 1=1";
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (data_inicio) {
      query += ` AND data_vencimento >= $${paramIndex}`;
      params.push(data_inicio);
      paramIndex++;
    }

    if (data_fim) {
      query += ` AND data_vencimento <= $${paramIndex}`;
      params.push(data_fim);
      paramIndex++;
    }

    if (categoria) {
      query += ` AND categoria = $${paramIndex}`;
      params.push(categoria);
      paramIndex++;
    }

    query += " ORDER BY data_vencimento DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar contas a pagar:", error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar conta por ID
app.get("/api/contas-pagar/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM contas_pagar WHERE id = $1",
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar conta a pagar
app.post("/api/contas-pagar", async (req, res) => {
  try {
    const {
      descricao,
      categoria,
      valor,
      data_vencimento,
      fornecedor,
      observacoes,
      recorrente,
      frequencia,
      intervalo,
      data_termino,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO contas_pagar 
       (descricao, categoria, valor, data_vencimento, fornecedor, observacoes, recorrente, frequencia, intervalo, data_termino)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, false), $8, COALESCE($9, 1), $10) 
       RETURNING *`,
      [
        descricao,
        categoria,
        valor,
        data_vencimento,
        fornecedor || null,
        observacoes || null,
        recorrente === true || recorrente === "true" ? true : false,
        frequencia || null,
        intervalo || 1,
        data_termino || null,
      ],
    );

    // Criar lembrete automático (3 dias antes do vencimento)
    const dataLembrete = new Date(data_vencimento);
    dataLembrete.setDate(dataLembrete.getDate() - 3);
    dataLembrete.setHours(9, 0, 0, 0);

    await pool.query(
      `INSERT INTO lembretes (tipo, referencia_id, titulo, mensagem, data_lembrete, prioridade)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        "conta_pagar",
        result.rows[0].id,
        "Lembrete de Pagamento",
        `Conta a vencer em 3 dias: ${descricao} - ${valor}`,
        dataLembrete,
        "alta",
      ],
    );

    console.log(`Conta a pagar criada: ${result.rows[0].id}`);

    res.status(201).json({
      message: "Conta criada com sucesso",
      conta: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao criar conta:", error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar conta a pagar
app.put("/api/contas-pagar/:id", async (req, res) => {
  try {
    const {
      descricao,
      categoria,
      valor,
      data_vencimento,
      data_pagamento,
      status,
      fornecedor,
      forma_pagamento,
      observacoes,
      recorrente,
      frequencia,
      intervalo,
      data_termino,
    } = req.body;

    const result = await pool.query(
      `UPDATE contas_pagar 
       SET descricao = COALESCE($1, descricao),
           categoria = COALESCE($2, categoria),
           valor = COALESCE($3, valor),
           data_vencimento = COALESCE($4, data_vencimento),
           data_pagamento = COALESCE($5, data_pagamento),
           status = COALESCE($6, status),
           fornecedor = COALESCE($7, fornecedor),
           forma_pagamento = COALESCE($8, forma_pagamento),
           observacoes = COALESCE($9, observacoes),
           recorrente = COALESCE($10, recorrente),
           frequencia = COALESCE($11, frequencia),
           intervalo = COALESCE($12, intervalo),
           data_termino = COALESCE($13, data_termino),
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
      [
        descricao,
        categoria,
        valor,
        data_vencimento,
        data_pagamento,
        status,
        fornecedor,
        forma_pagamento,
        observacoes,
        typeof recorrente === "boolean"
          ? recorrente
          : recorrente === "true"
            ? true
            : null,
        frequencia || null,
        intervalo || null,
        data_termino || null,
        req.params.id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }

    res.json({
      message: "Conta atualizada com sucesso",
      conta: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar conta:", error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar conta a pagar
app.delete("/api/contas-pagar/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM contas_pagar WHERE id = $1", [req.params.id]);
    await pool.query(
      "DELETE FROM lembretes WHERE tipo = 'conta_pagar' AND referencia_id = $1",
      [req.params.id],
    );

    res.json({ message: "Conta deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar conta:", error);
    res.status(500).json({ error: error.message });
  }
});

// Contas vencidas e a vencer
app.get("/api/contas-pagar/alertas/resumo", async (req, res) => {
  try {
    const hoje = new Date().toISOString().split("T")[0];

    const [vencidas, aVencer] = await Promise.all([
      pool.query(
        "SELECT * FROM contas_pagar WHERE status = 'Pendente' AND data_vencimento < $1 ORDER BY data_vencimento",
        [hoje],
      ),
      pool.query(
        "SELECT * FROM contas_pagar WHERE status = 'Pendente' AND data_vencimento >= $1 AND data_vencimento <= $2 ORDER BY data_vencimento",
        [
          hoje,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        ],
      ),
    ]);

    res.json({
      vencidas: vencidas.rows,
      aVencer: aVencer.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS - LEMBRETES
// ============================================

// Listar lembretes pendentes
app.get("/api/lembretes", async (req, res) => {
  try {
    const { tipo, enviado } = req.query;

    let query = "SELECT * FROM lembretes WHERE 1=1";
    const params = [];
    let paramIndex = 1;

    if (tipo) {
      query += ` AND tipo = $${paramIndex}`;
      params.push(tipo);
      paramIndex++;
    }

    if (enviado !== undefined) {
      query += ` AND enviado = $${paramIndex}`;
      params.push(enviado === "true");
      paramIndex++;
    }

    query += " ORDER BY data_lembrete DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar lembretes:", error);
    res.status(500).json({ error: error.message });
  }
});

// Lembretes pendentes de hoje
app.get("/api/lembretes/hoje", async (req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const result = await pool.query(
      `SELECT l.*, 
              CASE 
                WHEN l.tipo = 'agendamento' THEN a.tipo_servico
                WHEN l.tipo = 'conta_pagar' THEN c.descricao
              END as descricao_referencia
       FROM lembretes l
       LEFT JOIN agendamentos a ON l.tipo = 'agendamento' AND l.referencia_id = a.id
       LEFT JOIN contas_pagar c ON l.tipo = 'conta_pagar' AND l.referencia_id = c.id
       WHERE l.data_lembrete >= $1 AND l.data_lembrete < $2 AND l.enviado = false
       ORDER BY l.prioridade DESC, l.data_lembrete ASC`,
      [hoje, amanha],
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marcar lembrete como enviado
app.put("/api/lembretes/:id/marcar-enviado", async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE lembretes 
       SET enviado = true, data_envio = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lembrete não encontrado" });
    }

    res.json({
      message: "Lembrete marcado como enviado",
      lembrete: result.rows[0],
    });
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
// PROCESSAMENTO AUTOMÁTICO DE LEMBRETES
// ============================================

// Função para verificar e processar lembretes pendentes
async function processarLembretesPendentes() {
  try {
    console.log("🔔 Verificando lembretes pendentes...");

    const hoje = new Date();
    const lembretes = await pool.query(
      `SELECT l.*, 
              CASE 
                WHEN l.tipo = 'agendamento' THEN 
                  json_build_object(
                    'cliente_nome', (SELECT c.nome FROM agendamentos a 
                                     JOIN clientes c ON a.cliente_id = c.id 
                                     WHERE a.id = l.referencia_id),
                    'tipo_servico', (SELECT tipo_servico FROM agendamentos WHERE id = l.referencia_id),
                    'data_agendamento', (SELECT data_agendamento FROM agendamentos WHERE id = l.referencia_id),
                    'hora_inicio', (SELECT hora_inicio FROM agendamentos WHERE id = l.referencia_id)
                  )
                WHEN l.tipo = 'conta_pagar' THEN 
                  json_build_object(
                    'descricao', (SELECT descricao FROM contas_pagar WHERE id = l.referencia_id),
                    'valor', (SELECT valor FROM contas_pagar WHERE id = l.referencia_id),
                    'data_vencimento', (SELECT data_vencimento FROM contas_pagar WHERE id = l.referencia_id)
                  )
              END as dados_referencia
       FROM lembretes l
       WHERE l.data_lembrete <= $1 
       AND l.enviado = false
       ORDER BY l.prioridade DESC, l.data_lembrete ASC`,
      [hoje],
    );

    if (lembretes.rows.length > 0) {
      console.log(
        `📬 ${lembretes.rows.length} lembrete(s) pendente(s) encontrado(s)`,
      );

      for (const lembrete of lembretes.rows) {
        try {
          // Aqui você pode integrar com serviços de notificação
          // Por enquanto, apenas logamos e marcamos como enviado

          console.log(`📨 Lembrete: ${lembrete.titulo}`);
          console.log(`   Tipo: ${lembrete.tipo}`);
          console.log(`   Mensagem: ${lembrete.mensagem}`);

          if (lembrete.dados_referencia) {
            // dados_referencia já é um objeto JavaScript (do json_build_object do PostgreSQL)
            console.log(`   Dados:`, lembrete.dados_referencia);
          }

          // Marcar como enviado
          await pool.query(
            `UPDATE lembretes 
             SET enviado = true, data_envio = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [lembrete.id],
          );

          console.log(`   ✓ Lembrete processado com sucesso`);
        } catch (error) {
          console.error(
            `   ✗ Erro ao processar lembrete ${lembrete.id}:`,
            error.message,
          );
        }
      }
    } else {
      console.log("✓ Nenhum lembrete pendente no momento");
    }
  } catch (error) {
    console.error("❌ Erro ao processar lembretes:", error);
  }
}

// Verificar lembretes a cada 30 minutos
schedule.scheduleJob("*/30 * * * *", processarLembretesPendentes);

console.log(
  "🔔 Verificação de lembretes agendada para rodar a cada 30 minutos",
);

// Executar verificação inicial ao iniciar o servidor
setTimeout(processarLembretesPendentes, 5000); // Aguardar 5s após inicialização

// ============================================
// GERAÇÃO DE CONTAS RECORRENTES
// ============================================

async function gerarContasRecorrentes() {
  try {
    console.log("🔁 Verificando contas recorrentes...");

    const hoje = new Date();
    const resTemplates = await pool.query(
      `SELECT * FROM contas_pagar WHERE recorrente = true AND data_vencimento <= $1`,
      [hoje],
    );

    if (resTemplates.rows.length === 0) {
      console.log("✓ Nenhuma conta recorrente a processar");
      return;
    }

    for (const tpl of resTemplates.rows) {
      try {
        // Função para adicionar intervalo a uma data
        const addInterval = (dateStr, freq, intv) => {
          const d = new Date(dateStr);
          const n = parseInt(intv, 10) || 1;
          switch ((freq || "").toLowerCase()) {
            case "diario":
            case "diária":
            case "diaria":
              d.setDate(d.getDate() + n);
              break;
            case "semanal":
            case "semanalmente":
              d.setDate(d.getDate() + 7 * n);
              break;
            case "anual":
            case "anualmente":
            case "anualmente":
              d.setFullYear(d.getFullYear() + n);
              break;
            case "mensal":
            case "mensalmente":
            default:
              d.setMonth(d.getMonth() + n);
              break;
          }
          return d;
        };

        // Gerar ocorrências enquanto a data do template estiver no passado/hoje
        let currentDue = new Date(tpl.data_vencimento);
        while (currentDue <= hoje) {
          // Inserir ocorrência (cópia da template)
          const insertRes = await pool.query(
            `INSERT INTO contas_pagar (descricao, categoria, valor, data_vencimento, fornecedor, forma_pagamento, observacoes, recorrente, recorrencia_origem_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8) RETURNING *`,
            [
              tpl.descricao,
              tpl.categoria,
              tpl.valor,
              currentDue,
              tpl.fornecedor || null,
              tpl.forma_pagamento || null,
              tpl.observacoes || null,
              tpl.id,
            ],
          );

          // Criar lembrete para a nova ocorrência (3 dias antes)
          const dataLembrete = new Date(currentDue);
          dataLembrete.setDate(dataLembrete.getDate() - 3);
          dataLembrete.setHours(9, 0, 0, 0);

          await pool.query(
            `INSERT INTO lembretes (tipo, referencia_id, titulo, mensagem, data_lembrete, prioridade)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              "conta_pagar",
              insertRes.rows[0].id,
              "Lembrete de Pagamento",
              `Conta a vencer em 3 dias: ${tpl.descricao} - ${tpl.valor}`,
              dataLembrete,
              "alta",
            ],
          );

          // Avançar para próxima data
          const next = addInterval(currentDue, tpl.frequencia, tpl.intervalo);

          // Se houver data_termino e próxima data for depois dela, desative a recorrência
          if (tpl.data_termino && next > new Date(tpl.data_termino)) {
            await pool.query(
              `UPDATE contas_pagar SET recorrente = false WHERE id = $1`,
              [tpl.id],
            );
            break;
          }

          // Atualizar data_vencimento do template para a próxima ocorrência
          await pool.query(
            `UPDATE contas_pagar SET data_vencimento = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2`,
            [next, tpl.id],
          );

          // Preparar loop: se ainda no passado, continuar (caso tenha muitas datas perdidas)
          currentDue = new Date(next);
        }
      } catch (err) {
        console.error(
          `Erro ao processar recorrência template ${tpl.id}:`,
          err.message,
        );
      }
    }
  } catch (error) {
    console.error(
      "❌ Erro ao gerar contas recorrentes:",
      error.message || error,
    );
  }
}

// Agendar execução diária à meia-noite
schedule.scheduleJob("0 0 * * *", gerarContasRecorrentes);
console.log("🔁 Geração de contas recorrentes agendada diariamente à 00:00");

// Executar ao iniciar (após 8s)
setTimeout(gerarContasRecorrentes, 8000);

// ============================================
// TRATAMENTO DE ERROS CENTRALIZADO
// ============================================

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error("Erro na requisição:", {
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
  console.warn(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Endpoint não encontrado" });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`✓ Servidor rodando em http://localhost:${PORT}`);
});
