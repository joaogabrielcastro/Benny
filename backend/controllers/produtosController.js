import pool from "../database.js";
import logger from "../config/logger.js";
import { clearCacheByPattern } from "../config/cache.js";
import { broadcastUpdate } from "../services/websocket.js";

export async function listarProdutos(req, res) {
  try {
    const { limit, offset, page } = req.pagination;

    const result = await pool.query(
      "SELECT * FROM produtos ORDER BY nome LIMIT $1 OFFSET $2",
      [limit, offset]
    );

    const countResult = await pool.query("SELECT COUNT(*) FROM produtos");
    const total = parseInt(countResult.rows[0].count);

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
    res.status(500).json({ error: error.message });
  }
}

export async function buscarProduto(req, res) {
  try {
    const result = await pool.query("SELECT * FROM produtos WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function criarProduto(req, res) {
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

    clearCacheByPattern("/api/produtos");
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
}

export async function atualizarProduto(req, res) {
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

    console.log(
      `Produto ${req.params.id} atualizado - Nova quantidade: ${quantidade}`
    );

    clearCacheByPattern("/api/produtos");
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
}

export async function deletarProduto(req, res) {
  try {
    await pool.query("DELETE FROM produtos WHERE id = $1", [req.params.id]);
    clearCacheByPattern("/api/produtos");
    res.json({ message: "Produto deletado com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function produtosEstoqueBaixo(req, res) {
  try {
    const result = await pool.query(
      "SELECT * FROM produtos WHERE quantidade <= estoque_minimo ORDER BY quantidade"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
