import pool from "../config/database.js";
import logger from "../config/logger.js";
import nfGatewayAdapter from "../adapters/nfGatewayAdapter.js";
import fs from "fs";
import path from "path";
import storage from "../lib/storage.js";

class NFService {
  /**
   * Gera uma Nota Fiscal para uma OS finalizada
   * @param {number} osId - ID da Ordem de Serviço
   * @returns {Promise<Object>} Dados da NF gerada
   */
  async gerarNF(osId) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Buscar informações completas da OS
      const osResult = await client.query(
        `SELECT os.*, 
                c.nome as cliente_nome, c.cpf_cnpj as cliente_cpf_cnpj,
                c.endereco as cliente_endereco, c.telefone as cliente_telefone,
                v.modelo as veiculo_modelo, v.placa as veiculo_placa
         FROM ordens_servico os
         LEFT JOIN clientes c ON os.cliente_id = c.id
         LEFT JOIN veiculos v ON os.veiculo_id = v.id
         WHERE os.id = $1`,
        [osId]
      );

      if (osResult.rows.length === 0) {
        throw new Error("Ordem de Serviço não encontrada");
      }

      const os = osResult.rows[0];

      // Verificar se a OS está finalizada
      if (os.status !== "Finalizada") {
        throw new Error("A OS precisa estar finalizada para gerar NF");
      }

      // Verificar se já existe NF para esta OS
      const nfExistente = await client.query(
        "SELECT id FROM notas_fiscais WHERE os_id = $1",
        [osId]
      );

      if (nfExistente.rows.length > 0) {
        throw new Error("Já existe uma NF gerada para esta OS");
      }

      // Buscar produtos da OS
      const produtosResult = await client.query(
        `SELECT p.*, pr.nome as produto_nome
         FROM os_produtos p
         LEFT JOIN produtos pr ON p.produto_id = pr.id
         WHERE p.os_id = $1`,
        [osId]
      );

      // Buscar serviços da OS
      const servicosResult = await client.query(
        "SELECT * FROM os_servicos WHERE os_id = $1",
        [osId]
      );

      // Gerar número da NF (sequencial)
      const ultimaNF = await client.query(
        "SELECT numero FROM notas_fiscais ORDER BY id DESC LIMIT 1"
      );

      let numeroNF;
      if (ultimaNF.rows.length > 0) {
        const ultimoNumero = parseInt(ultimaNF.rows[0].numero);
        numeroNF = String(ultimoNumero + 1).padStart(6, "0");
      } else {
        numeroNF = "000001";
      }

      // Calcular valores de produtos/serviços a partir dos itens, se necessário
      let valor_produtos = parseFloat(os.valor_produtos) || 0;
      let valor_servicos = parseFloat(os.valor_servicos) || 0;

      if (
        (!valor_produtos || valor_produtos === 0) &&
        produtosResult.rows.length > 0
      ) {
        valor_produtos = produtosResult.rows.reduce((sum, p) => {
          const v = parseFloat(p.valor_total) || 0;
          return sum + v;
        }, 0);
      }

      if (
        (!valor_servicos || valor_servicos === 0) &&
        servicosResult.rows.length > 0
      ) {
        valor_servicos = servicosResult.rows.reduce((sum, s) => {
          const v = parseFloat(s.valor_total) || 0;
          return sum + v;
        }, 0);
      }

      // Determinar a base (produtos + serviços). Se soma for 0, usar os.valor_total quando disponível.
      const somaProdutosServicos = (parseFloat(valor_produtos) || 0) + (parseFloat(valor_servicos) || 0);
      let valorBase = 0;
      if (somaProdutosServicos > 0) {
        valorBase = somaProdutosServicos;
      } else if (os.valor_total !== undefined && os.valor_total !== null && !isNaN(parseFloat(os.valor_total))) {
        valorBase = parseFloat(os.valor_total);
      } else {
        valorBase = 0;
      }

      // Calcular impostos (exemplo simplificado)
      const impostos = {
        icms: valorBase * 0.18, // 18% ICMS (exemplo)
        iss: valor_servicos * 0.05, // 5% ISS (exemplo)
        pis: valorBase * 0.0165, // 1.65% PIS
        cofins: valorBase * 0.076, // 7.6% COFINS
      };

      const totalImpostos =
        impostos.icms + impostos.iss + impostos.pis + impostos.cofins;

      // Valor final da NF = base + impostos (ajuste: incluir impostos no total)
      const valorFinal = parseFloat(valorBase) + parseFloat(totalImpostos);

      // Inserir NF no banco com status inicial (pendente)
      const nfResult = await client.query(
        `INSERT INTO notas_fiscais 
         (numero, os_id, cliente_id, data_emissao, valor_produtos, valor_servicos, 
          valor_total, icms, iss, pis, cofins, total_impostos, observacoes, xml_path, pdf_path)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          numeroNF,
          osId,
          os.cliente_id,
          valor_produtos,
          valor_servicos,
          // gravar valor_total já incluindo impostos
          valorFinal,
          impostos.icms,
          impostos.iss,
          impostos.pis,
          impostos.cofins,
          totalImpostos,
          `NF gerada automaticamente para OS ${os.numero}`,
          null,
          null,
        ]
      );

      const nf = nfResult.rows[0];

      // Atualizar OS com ID da NF
      await client.query(
        "UPDATE ordens_servico SET nf_id = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2",
        [nf.id, osId]
      );

      // Selecionar configuração do gateway para a emissão
      const gwRes = await client.query(
        "SELECT gc.* FROM gateway_configs gc WHERE gc.ativo = true LIMIT 1"
      );
      const empresaConfig = gwRes.rows[0] || null;

      // Preparar payload para ser processado em background (job)
      const nfPayload = {
        id: nf.id,
        numero_interno: numeroNF,
        os_id: osId,
        cliente: {
          id: os.cliente_id,
          nome: os.cliente_nome,
          cpf_cnpj: os.cliente_cpf_cnpj,
          endereco: os.cliente_endereco,
        },
        produtos: produtosResult.rows,
        servicos: servicosResult.rows,
        valor_produtos,
        valor_servicos,
        // enviar valor_total já incluindo impostos
        valor_total: valorFinal,
        impostos,
        empresaConfig,
      };

      // Forçar modo manual: gerar resumo/HTML e salvar arquivo para o usuário copiar/colar manualmente
      if (true) {
        // Sempre manual, gateways desabilitados
        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Resumo NF ${numeroNF}</title>
  <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}h1{font-size:18px}table{width:100%;border-collapse:collapse}td,th{padding:6px;border:1px solid #ddd}</style>
</head>
<body>
  <h1>Resumo da Nota Fiscal - ${numeroNF}</h1>
  <p><strong>Ordem de Serviço:</strong> ${os.numero}</p>
  <p><strong>Cliente:</strong> ${os.cliente_nome} (${os.cliente_cpf_cnpj})</p>
  <p><strong>Endereço:</strong> ${os.cliente_endereco || "-"}</p>
  <h2>Itens - Produtos</h2>
  <table>
    <thead><tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Total</th></tr></thead>
    <tbody>
      ${produtosResult.rows
        .map(
          (p) =>
            `<tr><td>${p.produto_nome || "-"}</td><td>${
              p.quantidade || 0
            }</td><td>${(p.valor_unitario || 0).toFixed(2)}</td><td>${(
              p.valor_total || 0
            ).toFixed(2)}</td></tr>`
        )
        .join("")}
    </tbody>
  </table>
  <h2>Itens - Serviços</h2>
  <table>
    <thead><tr><th>Serviço</th><th>Qtd</th><th>Preço</th><th>Total</th></tr></thead>
    <tbody>
      ${servicosResult.rows
        .map(
          (s) =>
            `<tr><td>${s.descricao || "-"}</td><td>1</td><td>${(
              s.valor_total || 0
            ).toFixed(2)}</td><td>${(s.valor_total || 0).toFixed(2)}</td></tr>`
        )
        .join("")}
    </tbody>
  </table>

  <h3>Totais</h3>
  <p><strong>Produtos:</strong> R$ ${valor_produtos.toFixed(2)}</p>
  <p><strong>Serviços:</strong> R$ ${valor_servicos.toFixed(2)}</p>
  <p><strong>Base:</strong> R$ ${valorBase.toFixed(2)}</p>
  <p><strong>Impostos (ex.):</strong> ICMS R$ ${impostos.icms.toFixed(
    2
  )}, ISS R$ ${impostos.iss.toFixed(2)}</p>
  <p><strong>Total Impostos:</strong> R$ ${totalImpostos.toFixed(2)}</p>
  <p><strong>Valor Total:</strong> R$ ${valorFinal.toFixed(2)}</p>

  <hr />
  <p>Copie e cole estes dados no sistema da prefeitura para emissão manual da NFS-e.</p>
</body>
</html>`;

        // salvar como arquivo HTML (o frontend pode abrir para impressão)
        const saved = await storage.saveFile(
          Buffer.from(html, "utf-8"),
          `nf_${nf.id}.html`
        );
        const pdfPath = saved.path;

        await client.query(
          `UPDATE notas_fiscais SET pdf_path = $1 WHERE id = $2`,
          [pdfPath, nf.id]
        );

        await client.query("COMMIT");

        logger.info(
          `NF ${numeroNF} gerada em modo manual (OS ${os.numero}) -> ${pdfPath}`
        );

        const nfAtual = await this.buscarNFPorId(nf.id);
        return nfAtual;
      }

      // Não enfileirar jobs para gateways, apenas retornar a NF criada
      await client.query("COMMIT");
      logger.info(`NF ${numeroNF} gerada em modo manual (OS ${os.numero})`);
      const nfAtual = await this.buscarNFPorId(nf.id);
      return nfAtual;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`Erro ao gerar NF para OS ${osId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Busca NF por ID
   */
  async buscarNFPorId(nfId) {
    try {
      const result = await pool.query(
        `SELECT nf.*, 
                c.nome as cliente_nome, c.cpf_cnpj as cliente_cpf_cnpj,
                c.endereco as cliente_endereco,
                os.numero as os_numero
         FROM notas_fiscais nf
         LEFT JOIN clientes c ON nf.cliente_id = c.id
         LEFT JOIN ordens_servico os ON nf.os_id = os.id
         WHERE nf.id = $1`,
        [nfId]
      );

      if (result.rows.length === 0) {
        throw new Error("Nota Fiscal não encontrada");
      }

      const row = result.rows[0];
      // Provide aliases expected by frontend
      // valor_base = soma de produtos + serviços
      row.valor_base = parseFloat(row.valor_produtos || 0) + parseFloat(row.valor_servicos || 0);
      // valor_total já contém impostos (valorBase + totalImpostos)
      row.valor_icms = row.icms;
      row.valor_iss = row.iss;
      row.valor_pis = row.pis;
      row.valor_cofins = row.cofins;
      row.observacoes = row.observacoes || row.observacoes;

      return row;
    } catch (error) {
      logger.error(`Erro ao buscar NF ${nfId}:`, error);
      throw error;
    }
  }

  /**
   * Lista todas as NFs
   */
  async listarNFs(filtros = {}) {
    try {
      let query = `
        SELECT nf.*, 
               c.nome as cliente_nome,
               os.numero as os_numero
        FROM notas_fiscais nf
        LEFT JOIN clientes c ON nf.cliente_id = c.id
        LEFT JOIN ordens_servico os ON nf.os_id = os.id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      if (filtros.data_inicio) {
        query += ` AND nf.data_emissao >= $${paramIndex}`;
        params.push(filtros.data_inicio);
        paramIndex++;
      }

      if (filtros.data_fim) {
        query += ` AND nf.data_emissao <= $${paramIndex}`;
        params.push(filtros.data_fim);
        paramIndex++;
      }

      if (filtros.cliente_id) {
        query += ` AND nf.cliente_id = $${paramIndex}`;
        params.push(filtros.cliente_id);
        paramIndex++;
      }

      query += " ORDER BY nf.data_emissao DESC";

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error("Erro ao listar NFs:", error);
      throw error;
    }
  }

  /**
   * Cancela uma NF
   */
  async cancelarNF(nfId, motivo) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Verificar se NF existe
      const nfResult = await client.query(
        "SELECT * FROM notas_fiscais WHERE id = $1",
        [nfId]
      );

      if (nfResult.rows.length === 0) {
        throw new Error("Nota Fiscal não encontrada");
      }

      const nf = nfResult.rows[0];

      if (nf.cancelada) {
        throw new Error("Esta NF já está cancelada");
      }

      // Cancelar NF
      await client.query(
        `UPDATE notas_fiscais 
         SET cancelada = true, 
             data_cancelamento = CURRENT_TIMESTAMP,
             motivo_cancelamento = $1
         WHERE id = $2`,
        [motivo, nfId]
      );

      // Remover referência da OS
      await client.query(
        "UPDATE ordens_servico SET nf_id = NULL WHERE id = $1",
        [nf.os_id]
      );

      await client.query("COMMIT");

      logger.info(`NF ${nf.numero} cancelada com sucesso`);

      return { message: "NF cancelada com sucesso" };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`Erro ao cancelar NF ${nfId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new NFService();
