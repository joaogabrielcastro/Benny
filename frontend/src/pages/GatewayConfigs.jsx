import { useState, useEffect } from "react";
import api from "../services/api";

export default function GatewayConfigs() {
  const [empresas, setEmpresas] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [empresaForm, setEmpresaForm] = useState({
    nome: "",
    cnpj: "",
    cidade: "",
    estado: "",
  });
  const [gwForm, setGwForm] = useState({
    empresa_id: "",
    provider: "plugnotas",
    api_key: "",
    certificado_a1: null,
    certificado_senha: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [eRes, gRes] = await Promise.all([
        api.get("/empresas"),
        api.get("/gateway-configs"),
      ]);
      setEmpresas(eRes.data);
      setConfigs(gRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return setGwForm({ ...gwForm, certificado_a1: null });
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      setGwForm({ ...gwForm, certificado_a1: base64 });
    };
    reader.readAsDataURL(file);
  }

  async function handleCreateEmpresa(e) {
    e.preventDefault();
    try {
      const res = await api.post("/empresas", empresaForm);
      setEmpresas([res.data, ...empresas]);
      setEmpresaForm({ nome: "", cnpj: "", cidade: "", estado: "" });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateGateway(e) {
    e.preventDefault();
    try {
      if (!empresas[0]) return alert("Crie ou selecione uma empresa primeiro");
      const payload = {
        empresa_id: gwForm.empresa_id || (empresas[0] && empresas[0].id),
        provider: gwForm.provider,
        api_key: gwForm.api_key,
        certificado_a1: gwForm.certificado_a1,
        certificado_senha: gwForm.certificado_senha,
        ativo: true,
      };
      const res = await api.post("/gateway-configs", payload);
      setConfigs([res.data, ...configs]);
      setGwForm({
        empresa_id: "",
        provider: "plugnotas",
        api_key: "",
        certificado_a1: null,
        certificado_senha: "",
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDownloadCert(id) {
    try {
      const res = await api.get(`/gateway-configs/${id}/certificado`, {
        headers: { "x-audit-user": "frontend" },
      });
      const base64 = res.data.certificadoBase64;
      const blob = await (
        await fetch(`data:application/octet-stream;base64,${base64}`)
      ).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cert_${id}.pfx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao baixar certificado", err);
      alert("Erro ao baixar certificado");
    }
  }

  async function handleDeleteConfig(id) {
    if (!confirm("Remover configuração?")) return;
    try {
      await api.delete(`/gateway-configs/${id}`);
      setConfigs(configs.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erro ao deletar");
    }
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações de NF / Gateways</h1>

      <section className="bg-white shadow p-4 rounded">
        <h2 className="font-semibold">Criar Empresa (emitente)</h2>
        <form
          className="mt-2 grid grid-cols-2 gap-2"
          onSubmit={handleCreateEmpresa}
        >
          <input
            required
            placeholder="Nome"
            value={empresaForm.nome}
            onChange={(e) =>
              setEmpresaForm({ ...empresaForm, nome: e.target.value })
            }
            className="input"
          />
          <input
            required
            placeholder="CNPJ"
            value={empresaForm.cnpj}
            onChange={(e) =>
              setEmpresaForm({ ...empresaForm, cnpj: e.target.value })
            }
            className="input"
          />
          <input
            placeholder="Cidade"
            value={empresaForm.cidade}
            onChange={(e) =>
              setEmpresaForm({ ...empresaForm, cidade: e.target.value })
            }
            className="input"
          />
          <input
            placeholder="Estado"
            value={empresaForm.estado}
            onChange={(e) =>
              setEmpresaForm({ ...empresaForm, estado: e.target.value })
            }
            className="input"
          />
          <div className="col-span-2 flex justify-end">
            <button className="btn btn-primary">Criar Empresa</button>
          </div>
        </form>
      </section>

      <section className="bg-white shadow p-4 rounded">
        <h2 className="font-semibold">Criar Configuração de Gateway</h2>
        <form
          className="mt-2 grid grid-cols-2 gap-2"
          onSubmit={handleCreateGateway}
        >
          <select
            className="input"
            value={gwForm.empresa_id}
            onChange={(e) =>
              setGwForm({ ...gwForm, empresa_id: e.target.value })
            }
          >
            <option value="">-- Selecionar Empresa --</option>
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nome} ({emp.cnpj})
              </option>
            ))}
          </select>
          <select
            className="input"
            value={gwForm.provider}
            onChange={(e) => setGwForm({ ...gwForm, provider: e.target.value })}
          >
            <option value="plugnotas">PlugNotas</option>
            <option value="nuvemfiscal">NuvemFiscal</option>
          </select>
          <input
            placeholder="API Key"
            value={gwForm.api_key}
            onChange={(e) => setGwForm({ ...gwForm, api_key: e.target.value })}
            className="input"
          />
          <input
            type="password"
            placeholder="Senha certificado"
            value={gwForm.certificado_senha}
            onChange={(e) =>
              setGwForm({ ...gwForm, certificado_senha: e.target.value })
            }
            className="input"
          />
          <input
            type="file"
            accept=".pfx,.p12"
            onChange={handleFileChange}
            className="input"
          />
          <div className="col-span-2 flex justify-end">
            <button className="btn btn-primary">Criar Gateway</button>
          </div>
        </form>
      </section>

      <section className="bg-white shadow p-4 rounded">
        <h2 className="font-semibold">Gateways cadastrados</h2>
        <ul className="mt-2 space-y-2">
          {configs.map((c) => (
            <li
              key={c.id}
              className="p-2 border rounded flex justify-between items-center"
            >
              <div>
                <div className="font-semibold">{c.provider}</div>
                <div className="text-sm text-gray-600">
                  Empresa:{" "}
                  {empresas.find((e) => e.id === c.empresa_id)?.nome ||
                    c.empresa_id}{" "}
                  • Ativo: {String(c.ativo)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="text-sm text-blue-600"
                  onClick={() => handleDownloadCert(c.id)}
                >
                  Baixar Certificado
                </button>
                <button
                  className="text-sm text-red-600"
                  onClick={() => handleDeleteConfig(c.id)}
                >
                  Remover
                </button>
                <div className="text-sm text-gray-500">
                  {new Date(c.criado_em).toLocaleString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
