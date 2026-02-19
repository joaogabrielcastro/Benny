/**
 * Service para gerenciar Tenants (Organizações)
 */

import pool from "../../database.js";
import bcrypt from "bcrypt";

class TenantsService {
  /**
   * Criar novo tenant (nova oficina/organização)
   */
  async criarTenant(data) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Criar tenant
      const tenantResult = await client.query(
        `INSERT INTO tenants (
          slug, nome, cnpj, email, telefone, status, plano, 
          max_usuarios, max_orcamentos_mes, configuracoes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          data.slug,
          data.nome,
          data.cnpj || null,
          data.email,
          data.telefone || null,
          data.status || "active",
          data.plano || "basic",
          data.max_usuarios || 5,
          data.max_orcamentos_mes || 100,
          data.configuracoes || {},
        ],
      );

      const tenant = tenantResult.rows[0];

      // 2. Criar usuário admin inicial (se fornecido)
      if (data.admin_email && data.admin_senha) {
        const senhaHash = await bcrypt.hash(data.admin_senha, 10);

        await client.query(
          `INSERT INTO usuarios (tenant_id, nome, email, senha_hash, role, ativo)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            tenant.id,
            data.admin_nome || "Administrador",
            data.admin_email,
            senhaHash,
            "admin",
            true,
          ],
        );
      }

      // 3. Criar empresa padrão para o tenant
      if (data.empresa_nome) {
        await client.query(
          `INSERT INTO empresas (tenant_id, nome, cnpj, email, telefone)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            tenant.id,
            data.empresa_nome,
            data.cnpj || null,
            data.email,
            data.telefone || null,
          ],
        );
      }

      await client.query("COMMIT");

      return tenant;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Listar todos os tenants (apenas admin global)
   */
  async listarTenants(filters = {}) {
    let query = "SELECT * FROM tenants WHERE 1=1";
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.plano) {
      query += ` AND plano = $${paramCount}`;
      params.push(filters.plano);
      paramCount++;
    }

    if (filters.busca) {
      query += ` AND (nome ILIKE $${paramCount} OR slug ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${filters.busca}%`);
      paramCount++;
    }

    query += " ORDER BY criado_em DESC";

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Buscar tenant por ID
   */
  async buscarPorId(id) {
    const result = await pool.query("SELECT * FROM tenants WHERE id = $1", [
      id,
    ]);
    return result.rows[0];
  }

  /**
   * Buscar tenant por slug
   */
  async buscarPorSlug(slug) {
    const result = await pool.query("SELECT * FROM tenants WHERE slug = $1", [
      slug,
    ]);
    return result.rows[0];
  }

  /**
   * Atualizar tenant
   */
  async atualizarTenant(id, data) {
    const campos = [];
    const valores = [];
    let paramCount = 1;

    const camposPermitidos = [
      "nome",
      "cnpj",
      "email",
      "telefone",
      "status",
      "plano",
      "data_expiracao",
      "max_usuarios",
      "max_orcamentos_mes",
      "configuracoes",
    ];

    camposPermitidos.forEach((campo) => {
      if (data[campo] !== undefined) {
        campos.push(`${campo} = $${paramCount}`);
        valores.push(data[campo]);
        paramCount++;
      }
    });

    if (campos.length === 0) {
      throw new Error("Nenhum campo para atualizar");
    }

    campos.push(`atualizado_em = CURRENT_TIMESTAMP`);
    valores.push(id);

    const query = `
      UPDATE tenants 
      SET ${campos.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, valores);
    return result.rows[0];
  }

  /**
   * Suspender tenant
   */
  async suspenderTenant(id, motivo = null) {
    const result = await pool.query(
      `UPDATE tenants 
       SET status = 'suspended', 
           configuracoes = jsonb_set(configuracoes, '{motivo_suspensao}', $2::jsonb)
       WHERE id = $1 
       RETURNING *`,
      [id, JSON.stringify(motivo)],
    );
    return result.rows[0];
  }

  /**
   * Reativar tenant
   */
  async reativarTenant(id) {
    const result = await pool.query(
      `UPDATE tenants 
       SET status = 'active'
       WHERE id = $1 
       RETURNING *`,
      [id],
    );
    return result.rows[0];
  }

  /**
   * Deletar tenant (cuidado!)
   */
  async deletarTenant(id) {
    // Soft delete - apenas marca como cancelado
    const result = await pool.query(
      `UPDATE tenants 
       SET status = 'canceled'
       WHERE id = $1 
       RETURNING *`,
      [id],
    );
    return result.rows[0];
  }

  /**
   * Obter estatísticas do tenant
   */
  async obterEstatisticas(tenantId) {
    const stats = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM clientes WHERE tenant_id = $1) as total_clientes,
        (SELECT COUNT(*) FROM veiculos WHERE tenant_id = $1) as total_veiculos,
        (SELECT COUNT(*) FROM orcamentos WHERE tenant_id = $1) as total_orcamentos,
        (SELECT COUNT(*) FROM ordens_servico WHERE tenant_id = $1) as total_os,
        (SELECT COUNT(*) FROM produtos WHERE tenant_id = $1) as total_produtos,
        (SELECT COUNT(*) FROM usuarios WHERE tenant_id = $1) as total_usuarios,
        (SELECT COUNT(*) FROM orcamentos 
         WHERE tenant_id = $1 
         AND EXTRACT(MONTH FROM criado_em) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM criado_em) = EXTRACT(YEAR FROM CURRENT_DATE)
        ) as orcamentos_mes_atual,
        (SELECT SUM(valor_total) FROM ordens_servico 
         WHERE tenant_id = $1 AND status = 'Finalizada'
        ) as receita_total
      `,
      [tenantId],
    );

    return stats.rows[0];
  }

  /**
   * Validar slug disponível
   */
  async slugDisponivel(slug) {
    const result = await pool.query(
      "SELECT COUNT(*) as total FROM tenants WHERE slug = $1",
      [slug],
    );
    return parseInt(result.rows[0].total) === 0;
  }
}

export default new TenantsService();
