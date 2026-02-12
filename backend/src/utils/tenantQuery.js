/**
 * Helper para queries automáticas com isolamento de tenant
 * Substitui operações diretas no pool por funções que incluem tenant_id
 */

import pool from "../../database.js";

class TenantQuery {
  /**
   * Query com filtro automático de tenant
   * @param {string} query - SQL query
   * @param {Array} params - Parâmetros da query
   * @param {number} tenantId - ID do tenant
   */
  async query(query, params = [], tenantId) {
    if (!tenantId) {
      throw new Error("tenantId é obrigatório para queries com tenant");
    }

    // A query JÁ deve incluir WHERE tenant_id = $N
    // Este helper garante que o tenantId seja passado
    return pool.query(query, params);
  }

  /**
   * SELECT com tenant automático
   * @param {string} table - Nome da tabela
   * @param {object} options - Opções da query
   */
  async select(table, options = {}) {
    const {
      tenantId,
      where = {},
      orderBy = "id DESC",
      limit = null,
      offset = null,
      columns = "*",
    } = options;

    if (!tenantId) {
      throw new Error("tenantId é obrigatório");
    }

    // Adicionar tenant_id ao WHERE automaticamente
    where.tenant_id = tenantId;

    // Construir WHERE clause
    const whereKeys = Object.keys(where);
    const whereClause = whereKeys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(" AND ");

    const whereValues = Object.values(where);

    // Construir query completa
    let sql = `SELECT ${columns} FROM ${table} WHERE ${whereClause}`;

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    if (offset) {
      sql += ` OFFSET ${offset}`;
    }

    return pool.query(sql, whereValues);
  }

  /**
   * INSERT com tenant automático
   * @param {string} table - Nome da tabela
   * @param {object} data - Dados a inserir
   * @param {number} tenantId - ID do tenant
   */
  async insert(table, data, tenantId) {
    if (!tenantId) {
      throw new Error("tenantId é obrigatório");
    }

    // Adicionar tenant_id automaticamente
    data.tenant_id = tenantId;

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");

    const sql = `
      INSERT INTO ${table} (${keys.join(", ")})
      VALUES (${placeholders})
      RETURNING *
    `;

    return pool.query(sql, values);
  }

  /**
   * UPDATE com tenant automático
   * @param {string} table - Nome da tabela
   * @param {object} data - Dados a atualizar
   * @param {object} where - Condições (deve incluir id)
   * @param {number} tenantId - ID do tenant
   */
  async update(table, data, where, tenantId) {
    if (!tenantId) {
      throw new Error("tenantId é obrigatório");
    }

    // Garantir que tenant_id está no WHERE para segurança
    where.tenant_id = tenantId;

    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);

    const setClause = dataKeys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");

    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereKeys
      .map((key, index) => `${key} = $${index + 1 + dataKeys.length}`)
      .join(" AND ");

    const sql = `
      UPDATE ${table}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING *
    `;

    return pool.query(sql, [...dataValues, ...whereValues]);
  }

  /**
   * DELETE com tenant automático
   * @param {string} table - Nome da tabela
   * @param {object} where - Condições
   * @param {number} tenantId - ID do tenant
   */
  async delete(table, where, tenantId) {
    if (!tenantId) {
      throw new Error("tenantId é obrigatório");
    }

    // Garantir tenant_id no WHERE
    where.tenant_id = tenantId;

    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereKeys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(" AND ");

    const sql = `DELETE FROM ${table} WHERE ${whereClause} RETURNING *`;

    return pool.query(sql, whereValues);
  }

  /**
   * COUNT com tenant automático
   */
  async count(table, where = {}, tenantId) {
    if (!tenantId) {
      throw new Error("tenantId é obrigatório");
    }

    where.tenant_id = tenantId;

    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereKeys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(" AND ");

    const sql = `SELECT COUNT(*) as total FROM ${table} WHERE ${whereClause}`;

    const result = await pool.query(sql, whereValues);
    return parseInt(result.rows[0].total);
  }

  /**
   * Verifica se um registro pertence ao tenant
   */
  async belongsToTenant(table, id, tenantId) {
    const result = await pool.query(
      `SELECT 1 FROM ${table} WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    return result.rows.length > 0;
  }

  /**
   * Transaction com tenant context
   */
  async transaction(callback, tenantId) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Passar client com tenant context
      const result = await callback(client, tenantId);

      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new TenantQuery();
