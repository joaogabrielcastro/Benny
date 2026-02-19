/**
 * EXEMPLO: EmpresasService adaptado para Multi-Tenant
 * 
 * Este arquivo mostra como adaptar um service existente para usar tenant_id
 * Aplique o mesmo padrão para todos os outros services
 */

import pool from "../../database.js";
import tenantQuery from "../utils/tenantQuery.js";

class EmpresasService {
  /**
   * ANTES (sem multi-tenant):
   * async criarEmpresa(data) {
   *   const result = await pool.query(
   *     `INSERT INTO empresas (nome, cnpj, ...) VALUES ($1,$2,...) RETURNING *`,
   *     [data.nome, data.cnpj, ...]
   *   );
   *   return result.rows[0];
   * }
   * 
   * DEPOIS (com multi-tenant):
   */
  async criarEmpresa(data, tenantId) {
    // Validar tenantId
    if (!tenantId) {
      throw new Error("tenantId é obrigatório");
    }

    // Método 1: Query manual com tenant_id
    const result = await pool.query(
      `INSERT INTO empresas (tenant_id, nome, cnpj, inscricao_municipal, endereco, cidade, estado, telefone, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        tenantId, // <-- ADICIONAR tenant_id como primeiro parâmetro
        data.nome,
        data.cnpj,
        data.inscricao_municipal || null,
        data.endereco || null,
        data.cidade || null,
        data.estado || null,
        data.telefone || null,
        data.email || null,
      ],
    );

    // Método 2: Usar helper tenantQuery (mais seguro)
    // const result = await tenantQuery.insert('empresas', {
    //   nome: data.nome,
    //   cnpj: data.cnpj,
    //   inscricao_municipal: data.inscricao_municipal,
    //   endereco: data.endereco,
    //   cidade: data.cidade,
    //   estado: data.estado,
    //   telefone: data.telefone,
    //   email: data.email
    // }, tenantId);

    return result.rows[0];
  }

  /**
   * ANTES: async listar() {
   *   const result = await pool.query("SELECT * FROM empresas ORDER BY id DESC");
   *   return result.rows;
   * }
   * 
   * DEPOIS:
   */
  async listar(tenantId) {
    if (!tenantId) {
      throw new Error("tenantId é obrigatório");
    }

    // Método 1: Query manual com WHERE tenant_id
    const result = await pool.query(
      "SELECT * FROM empresas WHERE tenant_id = $1 ORDER BY id DESC",
      [tenantId],
    );

    // Método 2: Usar helper
    // const result = await tenantQuery.select('empresas', {
    //   tenantId,
    //   orderBy: 'id DESC'
    // });

    return result.rows;
  }

  /**
   * ANTES: async buscarPorId(id) {
   *   const result = await pool.query("SELECT * FROM empresas WHERE id = $1", [id]);
   *   return result.rows[0];
   * }
   * 
   * DEPOIS:
   */
  async buscarPorId(id, tenantId) {
    if (!tenantId) {
      throw new Error("tenantId é obrigatório");
    }

    // Método 1: IMPORTANTE - Incluir tenant_id no WHERE para segurança!
    const result = await pool.query(
      "SELECT * FROM empresas WHERE id = $1 AND tenant_id = $2",
      [id, tenantId],
    );

    // Método 2: Usar helper
    // const result = await tenantQuery.select('empresas', {
    //   tenantId,
    //   where: { id }
    // });

    return result.rows[0];
  }

  /**
   * Atualizar empresa
   */
  async atualizarEmpresa(id, data, tenantId) {
    if (!tenantId) {
      throw new Error("tenantId é obrigatório");
    }

    // IMPORTANTE: Sempre incluir tenant_id no WHERE!
    const result = await pool.query(
      `UPDATE empresas 
       SET nome = $1, cnpj = $2, inscricao_municipal = $3, 
           endereco = $4, cidade = $5, estado = $6, 
           telefone = $7, email = $8
       WHERE id = $9 AND tenant_id = $10
       RETURNING *`,
      [
        data.nome,
        data.cnpj,
        data.inscricao_municipal || null,
        data.endereco || null,
        data.cidade || null,
        data.estado || null,
        data.telefone || null,
        data.email || null,
        id,
        tenantId, // <-- SEMPRE no WHERE!
      ],
    );

    return result.rows[0];
  }

  /**
   * Deletar empresa
   */
  async deletarEmpresa(id, tenantId) {
    if (!tenantId) {
      throw new Error("tenantId é obrigatório");
    }

    // IMPORTANTE: tenant_id no WHERE previne deletar dados de outro tenant!
    const result = await pool.query(
      "DELETE FROM empresas WHERE id = $1 AND tenant_id = $2 RETURNING *",
      [id, tenantId],
    );

    return result.rows[0];
  }
}

export default new EmpresasService();

/**
 * CHECKLIST para adaptar outros services:
 * 
 * 1. ✅ Adicionar parâmetro tenantId em TODOS os métodos
 * 2. ✅ Validar tenantId no início de cada método
 * 3. ✅ Incluir tenant_id em todos os INSERTs
 * 4. ✅ Incluir WHERE tenant_id = $N em todos os SELECTs
 * 5. ✅ Incluir WHERE tenant_id = $N em todos os UPDATEs
 * 6. ✅ Incluir WHERE tenant_id = $N em todos os DELETEs
 * 7. ✅ Atualizar controllers para passar req.tenantId
 * 8. ✅ Testar isolamento de dados
 */
