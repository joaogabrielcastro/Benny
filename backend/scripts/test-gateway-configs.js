import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3001/api",
  timeout: 10000,
});

function toBase64(str) {
  return Buffer.from(str, "utf8").toString("base64");
}

async function run() {
  try {
    console.log("Creating empresa...");
    const emp = await api.post("/empresas", {
      nome: "Empresa Teste",
      cnpj: "12345678000199",
      inscricao_municipal: "12345",
      endereco: "Rua Teste, 1",
      cidade: "Cidade",
      estado: "SP",
      telefone: "11999999999",
      email: "teste@empresa.com",
    });
    console.log("empresa created:", emp.status, emp.data);
    const empresaId = emp.data.id;

    console.log("Creating gateway config...");
    const certBase64 = toBase64("dummy-cert-content");
    const gw = await api.post("/gateway-configs", {
      empresa_id: empresaId,
      provider: "plugnotas",
      api_key: "TEST_KEY_123",
      api_secret: null,
      certificado_a1: certBase64,
      certificado_senha: "senha123",
      ativo: true,
    });
    console.log("gateway created:", gw.status, gw.data);
    const gwId = gw.data.id;

    console.log("Listing gateway configs...");
    const list = await api.get("/gateway-configs");
    console.log("list:", list.status, list.data);

    console.log("Fetching gateway by id:", gwId);
    const get = await api.get(`/gateway-configs/${gwId}`);
    console.log("get:", get.status, get.data);

    console.log("Deleting gateway config:", gwId);
    const del = await api.delete(`/gateway-configs/${gwId}`);
    console.log("delete:", del.status, del.data);

    console.log("Final list after delete:");
    const final = await api.get("/gateway-configs");
    console.log("final list:", final.status, final.data);

    console.log("Gateway-configs API test completed successfully.");
  } catch (err) {
    console.error("Test error:");
    if (err.response) {
      console.error("status:", err.response.status);
      console.error("data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message || err);
    }
    process.exit(1);
  }
}

run();
