import pool from "../database.js";

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Inserir cliente
    const clienteRes = await client.query(
      `INSERT INTO clientes (nome, telefone, email, endereco, cidade, estado)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      ["Cliente Teste", "(11) 99999-9999", "teste@example.com", "Rua Exemplo, 123", "São Paulo", "SP"]
    );

    const cliente = clienteRes.rows[0];

    // Inserir veículo
    const veiculoRes = await client.query(
      `INSERT INTO veiculos (cliente_id, modelo, placa, ano)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [cliente.id, "Fiat Uno", "ABC1D23", "2015"]
    );

    const veiculo = veiculoRes.rows[0];

    // Inserir ordem de serviço
    const numero = `OS-${Date.now()}`;
    const osRes = await client.query(
      `INSERT INTO ordens_servico (numero, cliente_id, veiculo_id, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [numero, cliente.id, veiculo.id, "Aberta"]
    );

    const os = osRes.rows[0];

    await client.query("COMMIT");

    console.log("Seed concluído:", { cliente, veiculo, os });
    process.exit(0);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro no seed:", err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed();
