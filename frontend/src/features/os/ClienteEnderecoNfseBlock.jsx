import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import BuscaCEP from "../../components/BuscaCEP";
import Input from "../../components/Input";
import { mascaraCEP, removerMascara } from "../../utils/masks";

function osParaForm(os) {
  return {
    cep: os?.cliente_cep ? mascaraCEP(os.cliente_cep) : "",
    endereco: os?.cliente_endereco || "",
    numero: os?.cliente_numero || "",
    complemento: os?.cliente_complemento || "",
    bairro: os?.cliente_bairro || "",
    cidade: os?.cliente_cidade || "",
    estado: os?.cliente_estado || "",
  };
}

export default function ClienteEnderecoNfseBlock({
  os,
  motivo = "cep_ausente",
  onSalvo,
}) {
  const [form, setForm] = useState(() => osParaForm(os));
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setForm(osParaForm(os));
  }, [
    os?.cliente_cep,
    os?.cliente_endereco,
    os?.cliente_numero,
    os?.cliente_complemento,
    os?.cliente_bairro,
    os?.cliente_cidade,
    os?.cliente_estado,
  ]);

  if (os?.status !== "Finalizada") return null;

  const cepOk = String(os?.cliente_cep || "").replace(/\D/g, "").length === 8;
  if (cepOk && motivo !== "cep_invalido") return null;

  const titulo =
    motivo === "cep_invalido"
      ? "CEP ou município do cliente rejeitado pela Nuvem Fiscal"
      : "CEP do cliente obrigatório para NFS-e";

  const descricao =
    motivo === "cep_invalido"
      ? "Corrija o CEP e confira se cidade e bairro batem com o endereço. Use Buscar no CEP para preencher automaticamente."
      : "Informe o CEP completo (8 dígitos) e o endereço do tomador no cadastro do cliente.";

  const handleSalvar = async () => {
    const cep = removerMascara(form.cep);
    if (cep.length !== 8) {
      toast.error("Informe um CEP com 8 dígitos.");
      return;
    }
    if (!form.cidade?.trim()) {
      toast.error("Informe a cidade (use Buscar no CEP).");
      return;
    }
    if (!os?.cliente_id) {
      toast.error("OS sem cliente vinculado.");
      return;
    }

    try {
      setSalvando(true);
      const { data: c } = await api.get(`/clientes/${os.cliente_id}`);
      await api.put(`/clientes/${os.cliente_id}`, {
        nome: c.nome,
        telefone: c.telefone,
        cpf_cnpj: c.cpf_cnpj,
        email: c.email ?? "",
        endereco: form.endereco,
        cep,
        numero: form.numero,
        complemento: form.complemento,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
      });
      toast.success("Endereço do cliente atualizado. Tente emitir a NFS-e novamente.");
      onSalvo?.();
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Erro ao salvar endereço",
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <div>
        <p className="text-sm text-amber-950 dark:text-amber-100 font-semibold">
          {titulo}
        </p>
        <p className="text-sm text-amber-900/80 dark:text-amber-200/80 mt-1">
          Cliente: <span className="font-medium">{os.cliente_nome}</span>.{" "}
          {descricao}
        </p>
        <Link
          to={`/clientes?edit=${os.cliente_id}`}
          className="inline-block mt-2 text-sm font-semibold text-amber-800 dark:text-amber-200 underline"
        >
          Abrir cadastro completo do cliente
        </Link>
      </div>

      <BuscaCEP
        value={form.cep}
        onChange={(cep) => setForm((f) => ({ ...f, cep }))}
        onEnderecoEncontrado={(end) => {
          setForm((f) => ({
            ...f,
            cep: mascaraCEP(end.cep || ""),
            endereco: end.logradouro || f.endereco,
            bairro: end.bairro || f.bairro,
            cidade: end.cidade || f.cidade,
            estado: end.estado || f.estado,
            complemento: end.complemento || f.complemento,
          }));
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Endereço"
          value={form.endereco}
          onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
        />
        <Input
          label="Número"
          value={form.numero}
          onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
        />
        <Input
          label="Bairro"
          value={form.bairro}
          onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
        />
        <Input
          label="Cidade"
          value={form.cidade}
          onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
        />
        <Input
          label="Estado"
          value={form.estado}
          onChange={(e) =>
            setForm((f) => ({ ...f, estado: e.target.value.toUpperCase() }))
          }
          maxLength={2}
        />
      </div>

      <button
        type="button"
        onClick={handleSalvar}
        disabled={salvando}
        className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50"
      >
        {salvando ? "Salvando…" : "Salvar endereço do cliente"}
      </button>
    </div>
  );
}
