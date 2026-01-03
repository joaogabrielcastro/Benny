import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import compression from 'compression';
import dotenv from 'dotenv';
import pool from './database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(compression()); // Compressão de respostas
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============================================
// ROTAS - PRODUTOS/ESTOQUE
// ============================================

// Listar todos os produtos
app.get('/api/produtos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM produtos ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar produto por ID
app.get('/api/produtos/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar produto
app.post('/api/produtos', async (req, res) => {
  try {
    const { codigo, nome, descricao, quantidade, valor_custo, valor_venda, estoque_minimo } = req.body;
    
    const result = await pool.query(
      `INSERT INTO produtos (codigo, nome, descricao, quantidade, valor_custo, valor_venda, estoque_minimo)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [codigo, nome, descricao, quantidade || 0, valor_custo || 0, valor_venda || 0, estoque_minimo || 5]
    );
    
    res.status(201).json({ id: result.rows[0].id, message: 'Produto criado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar produto
app.put('/api/produtos/:id', async (req, res) => {
  try {
    const { codigo, nome, descricao, quantidade, valor_custo, valor_venda, estoque_minimo } = req.body;
    
    await pool.query(
      `UPDATE produtos 
       SET codigo = $1, nome = $2, descricao = $3, quantidade = $4, valor_custo = $5, 
           valor_venda = $6, estoque_minimo = $7, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [codigo, nome, descricao, quantidade, valor_custo, valor_venda, estoque_minimo, req.params.id]
    );
    
    res.json({ message: 'Produto atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar produto
app.delete('/api/produtos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM produtos WHERE id = $1', [req.params.id]);
    res.json({ message: 'Produto deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Produtos com estoque baixo
app.get('/api/produtos/alertas/estoque-baixo', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM produtos WHERE quantidade <= estoque_minimo ORDER BY quantidade');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS - CLIENTES
// ============================================

app.get('/api/clientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clientes/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clientes', async (req, res) => {
  try {
    const { nome, telefone, cpf_cnpj, email, endereco } = req.body;
    
    const result = await pool.query(
      `INSERT INTO clientes (nome, telefone, cpf_cnpj, email, endereco)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nome, telefone, cpf_cnpj, email, endereco]
    );
    
    res.status(201).json({ id: result.rows[0].id, message: 'Cliente criado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  try {
    const { nome, telefone, cpf_cnpj, email, endereco } = req.body;
    
    await pool.query(
      `UPDATE clientes 
       SET nome = $1, telefone = $2, cpf_cnpj = $3, email = $4, endereco = $5
       WHERE id = $6`,
      [nome, telefone, cpf_cnpj, email, endereco, req.params.id]
    );
    
    res.json({ message: 'Cliente atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS - VEÍCULOS
// ============================================

app.get('/api/veiculos', async (req, res) => {
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

app.get('/api/veiculos/cliente/:clienteId', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM veiculos WHERE cliente_id = $1', [req.params.clienteId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/veiculos', async (req, res) => {
  try {
    const { cliente_id, modelo, cor, placa, ano } = req.body;
    
    const result = await pool.query(
      `INSERT INTO veiculos (cliente_id, modelo, cor, placa, ano)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [cliente_id, modelo, cor, placa, ano]
    );
    
    res.status(201).json({ id: result.rows[0].id, message: 'Veículo criado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS - ORÇAMENTOS
// ============================================

async function gerarNumeroOrcamento() {
  const result = await pool.query('SELECT numero FROM orcamentos ORDER BY id DESC LIMIT 1');
  if (result.rows.length === 0) return 'ORC-0001';
  
  const numero = parseInt(result.rows[0].numero.split('-')[1]) + 1;
  return `ORC-${numero.toString().padStart(4, '0')}`;
}

app.get('/api/orcamentos', async (req, res) => {
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
      query += ` AND (o.numero ILIKE $${paramIndex} OR c.nome ILIKE $${paramIndex + 1} OR v.placa ILIKE $${paramIndex + 2})`;
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
      paramIndex += 3;
    }
    
    query += ' ORDER BY o.id DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orcamentos/:id', async (req, res) => {
  try {
    const orcResult = await pool.query(`
      SELECT o.*, 
             c.nome as cliente_nome, c.telefone as cliente_telefone, c.cpf_cnpj as cliente_cpf_cnpj,
             v.modelo as veiculo_modelo, v.placa as veiculo_placa, v.cor as veiculo_cor
      FROM orcamentos o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      LEFT JOIN veiculos v ON o.veiculo_id = v.id
      WHERE o.id = $1
    `, [req.params.id]);
    
    if (orcResult.rows.length === 0) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }
    
    const produtosResult = await pool.query('SELECT * FROM orcamento_produtos WHERE orcamento_id = $1', [req.params.id]);
    const servicosResult = await pool.query('SELECT * FROM orcamento_servicos WHERE orcamento_id = $1', [req.params.id]);
    
    res.json({ 
      ...orcResult.rows[0], 
      produtos: produtosResult.rows, 
      servicos: servicosResult.rows 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orcamentos', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { cliente_id, veiculo_id, km, observacoes_veiculo, observacoes_gerais, produtos, servicos } = req.body;
    
    const numero = await gerarNumeroOrcamento();
    
    // Calcular totais
    const valor_produtos = produtos?.reduce((sum, item) => sum + item.valor_total, 0) || 0;
    const valor_servicos = servicos?.reduce((sum, item) => sum + item.valor_total, 0) || 0;
    const valor_total = valor_produtos + valor_servicos;
    
    // Inserir orçamento
    const orcResult = await client.query(
      `INSERT INTO orcamentos (numero, cliente_id, veiculo_id, km, observacoes_veiculo, observacoes_gerais, valor_produtos, valor_servicos, valor_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [numero, cliente_id, veiculo_id, km, observacoes_veiculo, observacoes_gerais, valor_produtos, valor_servicos, valor_total]
    );
    
    const orcamento_id = orcResult.rows[0].id;
    
    // Inserir produtos
    if (produtos && produtos.length > 0) {
      for (const produto of produtos) {
        await client.query(
          `INSERT INTO orcamento_produtos (orcamento_id, produto_id, codigo, descricao, quantidade, valor_unitario, valor_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [orcamento_id, produto.produto_id, produto.codigo, produto.descricao, produto.quantidade, produto.valor_unitario, produto.valor_total]
        );
      }
    }
    
    // Inserir serviços
    if (servicos && servicos.length > 0) {
      for (const servico of servicos) {
        await client.query(
          `INSERT INTO orcamento_servicos (orcamento_id, codigo, descricao, quantidade, valor_unitario, valor_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orcamento_id, servico.codigo, servico.descricao, servico.quantidade, servico.valor_unitario, servico.valor_total]
        );
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json({ id: orcamento_id, numero, message: 'Orçamento criado com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.put('/api/orcamentos/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { status, km, observacoes_veiculo, observacoes_gerais, produtos, servicos } = req.body;
    
    // Calcular totais
    const valor_produtos = produtos?.reduce((sum, item) => sum + item.valor_total, 0) || 0;
    const valor_servicos = servicos?.reduce((sum, item) => sum + item.valor_total, 0) || 0;
    const valor_total = valor_produtos + valor_servicos;
    
    // Atualizar orçamento
    await client.query(
      `UPDATE orcamentos 
       SET status = $1, km = $2, observacoes_veiculo = $3, observacoes_gerais = $4, 
           valor_produtos = $5, valor_servicos = $6, valor_total = $7, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [status, km, observacoes_veiculo, observacoes_gerais, valor_produtos, valor_servicos, valor_total, req.params.id]
    );
    
    // Deletar produtos e serviços antigos
    await client.query('DELETE FROM orcamento_produtos WHERE orcamento_id = $1', [req.params.id]);
    await client.query('DELETE FROM orcamento_servicos WHERE orcamento_id = $1', [req.params.id]);
    
    // Inserir produtos novamente
    if (produtos && produtos.length > 0) {
      for (const produto of produtos) {
        await client.query(
          `INSERT INTO orcamento_produtos (orcamento_id, produto_id, codigo, descricao, quantidade, valor_unitario, valor_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [req.params.id, produto.produto_id, produto.codigo, produto.descricao, produto.quantidade, produto.valor_unitario, produto.valor_total]
        );
      }
    }
    
    // Inserir serviços novamente
    if (servicos && servicos.length > 0) {
      for (const servico of servicos) {
        await client.query(
          `INSERT INTO orcamento_servicos (orcamento_id, codigo, descricao, quantidade, valor_unitario, valor_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.params.id, servico.codigo, servico.descricao, servico.quantidade, servico.valor_unitario, servico.valor_total]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Orçamento atualizado com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Converter orçamento em OS
app.post('/api/orcamentos/:id/converter-os', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const orcResult = await client.query('SELECT * FROM orcamentos WHERE id = $1', [req.params.id]);
    
    if (orcResult.rows.length === 0) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }
    
    const orcamento = orcResult.rows[0];
    
    if (orcamento.status !== 'Aprovado') {
      return res.status(400).json({ error: 'Apenas orçamentos aprovados podem ser convertidos em OS' });
    }
    
    const numero = await gerarNumeroOS();
    
    // Criar OS
    const osResult = await client.query(
      `INSERT INTO ordens_servico (numero, cliente_id, veiculo_id, km, observacoes_veiculo, observacoes_gerais, 
                                     valor_produtos, valor_servicos, valor_total, orcamento_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Aberta') RETURNING id`,
      [numero, orcamento.cliente_id, orcamento.veiculo_id, orcamento.km, 
       orcamento.observacoes_veiculo, orcamento.observacoes_gerais,
       orcamento.valor_produtos, orcamento.valor_servicos, orcamento.valor_total, orcamento.id]
    );
    
    const os_id = osResult.rows[0].id;
    
    // Copiar produtos
    const produtosResult = await client.query('SELECT * FROM orcamento_produtos WHERE orcamento_id = $1', [req.params.id]);
    if (produtosResult.rows.length > 0) {
      for (const produto of produtosResult.rows) {
        await client.query(
          `INSERT INTO os_produtos (os_id, produto_id, codigo, descricao, quantidade, valor_unitario, valor_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [os_id, produto.produto_id, produto.codigo, produto.descricao, produto.quantidade, produto.valor_unitario, produto.valor_total]
        );
      }
    }
    
    // Copiar serviços
    const servicosResult = await client.query('SELECT * FROM orcamento_servicos WHERE orcamento_id = $1', [req.params.id]);
    if (servicosResult.rows.length > 0) {
      for (const servico of servicosResult.rows) {
        await client.query(
          `INSERT INTO os_servicos (os_id, codigo, descricao, quantidade, valor_unitario, valor_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [os_id, servico.codigo, servico.descricao, servico.quantidade, servico.valor_unitario, servico.valor_total]
        );
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json({ id: os_id, numero, message: 'Orçamento convertido em OS com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ============================================
// ROTAS - ORDENS DE SERVIÇO
// ============================================

async function gerarNumeroOS() {
  const result = await pool.query('SELECT numero FROM ordens_servico ORDER BY id DESC LIMIT 1');
  if (result.rows.length === 0) return 'OS-0001';
  
  const numero = parseInt(result.rows[0].numero.split('-')[1]) + 1;
  return `OS-${numero.toString().padStart(4, '0')}`;
}

app.get('/api/ordens-servico', async (req, res) => {
  try {
    const { status, busca } = req.query;
    
    let query = `
      SELECT os.*, 
             c.nome as cliente_nome, c.telefone as cliente_telefone,
             v.modelo as veiculo_modelo, v.placa as veiculo_placa
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN veiculos v ON os.veiculo_id = v.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND os.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (busca) {
      query += ` AND (os.numero ILIKE $${paramIndex} OR c.nome ILIKE $${paramIndex + 1} OR v.placa ILIKE $${paramIndex + 2})`;
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
      paramIndex += 3;
    }
    
    query += ' ORDER BY os.id DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ordens-servico/:id', async (req, res) => {
  try {
    const osResult = await pool.query(`
      SELECT os.*, 
             c.nome as cliente_nome, c.telefone as cliente_telefone, c.cpf_cnpj as cliente_cpf_cnpj,
             v.modelo as veiculo_modelo, v.placa as veiculo_placa, v.cor as veiculo_cor
      FROM ordens_servico os
      LEFT JOIN clientes c ON os.cliente_id = c.id
      LEFT JOIN veiculos v ON os.veiculo_id = v.id
      WHERE os.id = $1
    `, [req.params.id]);
    
    if (osResult.rows.length === 0) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }
    
    const produtosResult = await pool.query('SELECT * FROM os_produtos WHERE os_id = $1', [req.params.id]);
    const servicosResult = await pool.query('SELECT * FROM os_servicos WHERE os_id = $1', [req.params.id]);
    
    res.json({ 
      ...osResult.rows[0], 
      produtos: produtosResult.rows, 
      servicos: servicosResult.rows 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ordens-servico', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { cliente_id, veiculo_id, km, observacoes_veiculo, observacoes_gerais, produtos, servicos, responsavel_tecnico } = req.body;
    
    const numero = await gerarNumeroOS();
    
    // Calcular totais
    const valor_produtos = produtos?.reduce((sum, item) => sum + item.valor_total, 0) || 0;
    const valor_servicos = servicos?.reduce((sum, item) => sum + item.valor_total, 0) || 0;
    const valor_total = valor_produtos + valor_servicos;
    
    // Inserir OS
    const osResult = await client.query(
      `INSERT INTO ordens_servico (numero, cliente_id, veiculo_id, km, observacoes_veiculo, observacoes_gerais, 
                                     valor_produtos, valor_servicos, valor_total, responsavel_tecnico, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Aberta') RETURNING id`,
      [numero, cliente_id, veiculo_id, km, observacoes_veiculo, observacoes_gerais, valor_produtos, valor_servicos, valor_total, responsavel_tecnico]
    );
    
    const os_id = osResult.rows[0].id;
    
    // Inserir produtos e dar baixa no estoque
    if (produtos && produtos.length > 0) {
      for (const produto of produtos) {
        await client.query(
          `INSERT INTO os_produtos (os_id, produto_id, codigo, descricao, quantidade, valor_unitario, valor_total, baixa_estoque)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
          [os_id, produto.produto_id, produto.codigo, produto.descricao, produto.quantidade, produto.valor_unitario, produto.valor_total]
        );
        
        if (produto.produto_id) {
          await client.query('UPDATE produtos SET quantidade = quantidade - $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2', 
            [produto.quantidade, produto.produto_id]);
          
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
          [os_id, servico.codigo, servico.descricao, servico.quantidade, servico.valor_unitario, servico.valor_total]
        );
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json({ id: os_id, numero, message: 'OS criada com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.put('/api/ordens-servico/:id', async (req, res) => {
  try {
    const { status, responsavel_tecnico } = req.body;
    
    await pool.query(
      `UPDATE ordens_servico 
       SET status = $1, responsavel_tecnico = $2, atualizado_em = CURRENT_TIMESTAMP,
           finalizado_em = CASE WHEN $1 = 'Finalizada' THEN CURRENT_TIMESTAMP ELSE finalizado_em END
       WHERE id = $3`,
      [status, responsavel_tecnico, req.params.id]
    );
    
    res.json({ message: 'OS atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS - RELATÓRIOS E DASHBOARD
// ============================================

app.get('/api/relatorios/dashboard', async (req, res) => {
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
      faturamentoMes: parseFloat(faturamentoMesResult.rows[0]?.faturamento || 0),
      ticketMedio: parseFloat(ticketMedioResult.rows[0]?.ticket_medio || 0),
      faturamentoMensal: faturamentoMensalResult.rows.map(row => ({
        mes: row.mes,
        valor: parseFloat(row.valor)
      })),
      produtosMaisVendidos: produtosMaisVendidosResult.rows.map(row => ({
        nome: row.nome,
        quantidade: parseInt(row.quantidade)
      }))
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: error.message });
  }
});

// Relatório de vendas por período
app.get('/api/relatorios/vendas', async (req, res) => {
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

    const total = result.rows.reduce((sum, os) => sum + parseFloat(os.valor_total), 0);

    res.json({
      vendas: result.rows,
      total: total,
      quantidade: result.rows.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`✓ Servidor rodando em http://localhost:${PORT}`);
});
