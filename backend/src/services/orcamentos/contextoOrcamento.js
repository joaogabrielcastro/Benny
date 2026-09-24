import { notFound } from "../../lib/AppError.js";

/**
 * Confirma cliente e veículo no tenant antes de qualquer chamada de IA.
 * Não seleciona placa, chassi nem dados pessoais.
 */
export async function carregarContexto(query, tenantId, { cliente_id, veiculo_id, km }) {
  const cliente = await query(
    "SELECT id FROM clientes WHERE id = $1 AND tenant_id = $2",
    [cliente_id, tenantId],
  );
  if (!cliente.rows[0]) {
    throw notFound("Cliente não encontrado");
  }

  const veiculo = await query(
    `SELECT id, marca, modelo, ano, cor, versao, motor, combustivel
     FROM veiculos
     WHERE id = $1 AND cliente_id = $2 AND tenant_id = $3`,
    [veiculo_id, cliente_id, tenantId],
  );
  if (!veiculo.rows[0]) {
    throw notFound("Veículo não encontrado");
  }

  const v = veiculo.rows[0];
  const campos = {
    marca: v.marca || "",
    modelo: v.modelo || "",
    versao: v.versao || "",
    ano: v.ano != null ? String(v.ano) : "",
    motor: v.motor || "",
    combustivel: v.combustivel || "",
    cor: v.cor || "",
  };
  return {
    veiculo: Object.fromEntries(
      Object.entries(campos).filter(([, valor]) => String(valor).trim() !== ""),
    ),
    km: km ?? null,
  };
}
