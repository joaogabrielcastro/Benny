import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import PageHeader from "../components/layout/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ConfiguracaoFiscal() {
  const [opcoes, setOpcoes] = useState([]);
  const [regime, setRegime] = useState("");
  const [codigo, setCodigo] = useState("");
  const [uf, setUf] = useState("");
  const [cfopInterno, setCfopInterno] = useState("");
  const [cfopFora, setCfopFora] = useState("");
  const [crt, setCrt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    api
      .get("/configuracao-fiscal")
      .then(({ data }) => {
        if (!vivo) return;
        setOpcoes(data.opcoes || []);
        setRegime(data.regimeTributario || "");
        setCodigo(data.icms?.codigo || "");
        setUf(data.ufEmitente || "");
        setCfopInterno(data.cfop?.vendaInterna || "");
        setCfopFora(data.cfop?.vendaInterestadual || "");
        setCrt(data.crt);
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || "Erro ao carregar a configuração fiscal");
      })
      .finally(() => {
        if (vivo) setLoading(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const salvar = async (e) => {
    e.preventDefault();
    if (!regime || !codigo || !uf || !/^\d{4}$/.test(cfopInterno) || !/^\d{4}$/.test(cfopFora)) {
      toast.error("Informe o regime, a situação tributária, a UF e os dois CFOP com 4 dígitos.");
      return;
    }
    setSalvando(true);
    try {
      const { data } = await api.put("/configuracao-fiscal", {
        regime_tributario: regime,
        icms_codigo: codigo,
        uf,
        cfop_interno: cfopInterno,
        cfop_interestadual: cfopFora,
      });
      setCrt(data.crt);
      setCodigo(data.icms?.codigo || codigo);
      toast.success("Configuração fiscal salva.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <LoadingSpinner size="xl" />;

  return (
    <div className="page-enter">
      <PageHeader
        title="Configuração fiscal"
        subtitle="Regime desta oficina e a situação de ICMS padrão da NF-e de peças."
      />
      <form onSubmit={salvar} className="pro-card p-6 max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="regime-tributario">
            Regime tributário
          </label>
          <select
            id="regime-tributario"
            value={regime}
            onChange={(e) => {
              const id = e.target.value;
              setRegime(id);
              const item = opcoes.find((o) => o.id === id);
              setCrt(item ? item.crt : null);
              const ainda = item?.codigos?.some((c) => c.codigo === codigo);
              if (!ainda) setCodigo("");
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
          >
            <option value="">Não informado</option>
            {opcoes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.rotulo}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-slate-500">
            CRT: {crt || "—"}. Ele acompanha o regime e não é um segundo cadastro.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="situacao-icms">
            {opcoes.find((o) => o.id === regime)?.familia === "CST"
              ? "CST padrão"
              : "Situação ICMS padrão"}
          </label>
          <select
            id="situacao-icms"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            disabled={!regime}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
          >
            <option value="">Não informado</option>
            {(opcoes.find((o) => o.id === regime)?.codigos || []).map((item) => (
              <option key={item.codigo} value={item.codigo}>
                {item.codigo} — {item.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-sm font-medium mb-2">CFOP da venda de peças</p>
          <label className="block text-sm mb-1" htmlFor="uf-oficina">UF da oficina</label>
          <input id="uf-oficina" value={uf} maxLength={2} onChange={(e) => setUf(e.target.value.toUpperCase())} className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md" />
          <label className="block text-sm mt-3 mb-1" htmlFor="cfop-interno">Venda dentro do estado</label>
          <input id="cfop-interno" value={cfopInterno} maxLength={4} onChange={(e) => setCfopInterno(e.target.value.replace(/\D/g, ""))} className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md" />
          <label className="block text-sm mt-3 mb-1" htmlFor="cfop-fora">Venda para outro estado</label>
          <input id="cfop-fora" value={cfopFora} maxLength={4} onChange={(e) => setCfopFora(e.target.value.replace(/\D/g, ""))} className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md" />
        </div>
        <button type="submit" className="btn-brand" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
