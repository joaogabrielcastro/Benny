import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../services/api";
import Modal from "./Modal";

const emptyForm = () => ({
  codigo: "",
  nome: "",
  descricao: "",
  valor_unitario: 0,
  categoria: "",
  tempo_estimado_min: "",
});

export function useCategorias(tipo) {
  return useQuery({
    queryKey: [tipo, "categorias"],
    queryFn: async () => (await api.get(`/${tipo}/categorias/lista`)).data,
    staleTime: 5 * 60_000,
  });
}

export function formatarDuracao(min) {
  const m = Number(min);
  if (!m) return null;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, "0")}` : `${h}h`;
}

export default function ServicoFormModal({ servico, isOpen = true, onClose, onSaved }) {
  const [formData, setFormData] = useState(emptyForm);
  const [salvando, setSalvando] = useState(false);
  const { data: categorias = [] } = useCategorias("servicos");

  useEffect(() => {
    if (!isOpen) return;
    if (servico) {
      setFormData({
        codigo: servico.codigo || "",
        nome: servico.nome || "",
        descricao: servico.descricao || "",
        valor_unitario: Number(servico.valor_unitario) || 0,
        categoria: servico.categoria || "",
        tempo_estimado_min: servico.tempo_estimado_min ?? "",
      });
    } else {
      setFormData(emptyForm());
    }
  }, [isOpen, servico]);

  if (!isOpen) return null;

  const set = (k, v) => setFormData((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      valor_unitario: parseFloat(String(formData.valor_unitario).replace(",", ".")) || 0,
      categoria: formData.categoria.trim() || null,
      tempo_estimado_min: formData.tempo_estimado_min === "" ? null : Number(formData.tempo_estimado_min),
    };
    try {
      setSalvando(true);
      let res;
      if (servico && servico.id) {
        res = await api.put(`/servicos/${servico.id}`, payload);
        toast.success("Serviço atualizado.");
      } else {
        res = await api.post("/servicos", payload);
        toast.success("Serviço cadastrado.");
      }
      onSaved && onSaved(res.data.servico || res.data);
      onClose && onClose();
    } catch (error) {
      toast.error("Erro ao salvar serviço: " + (error.response?.data?.error || error.message));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={servico ? "Editar serviço" : "Novo serviço"}
      description="Serviços do catálogo entram em orçamentos e OS com preço e tempo padrão."
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" form="form-servico" className="btn-brand" disabled={salvando}>
            {salvando ? "Salvando…" : servico ? "Salvar alterações" : "Cadastrar serviço"}
          </button>
        </>
      }
    >
      <form id="form-servico" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-6 gap-4">
        <div className="sm:col-span-4">
          <label className="label-pro" htmlFor="sv-nome">Nome *</label>
          <input id="sv-nome" className="input-pro" value={formData.nome} onChange={(e) => set("nome", e.target.value)} required autoFocus placeholder="Ex.: Troca de óleo e filtro" />
        </div>
        <div className="sm:col-span-2">
          <label className="label-pro" htmlFor="sv-codigo">Código</label>
          <input id="sv-codigo" className="input-pro font-mono" value={formData.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="Automático" />
        </div>
        <div className="sm:col-span-2">
          <label className="label-pro" htmlFor="sv-cat">Categoria</label>
          <input id="sv-cat" className="input-pro" list="sv-categorias" value={formData.categoria} onChange={(e) => set("categoria", e.target.value)} placeholder="Ex.: Freios" />
          <datalist id="sv-categorias">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="sm:col-span-2">
          <label className="label-pro" htmlFor="sv-valor">Preço (R$) *</label>
          <input id="sv-valor" type="number" min="0" step="0.01" inputMode="decimal" className="input-pro num" value={formData.valor_unitario} onChange={(e) => set("valor_unitario", e.target.value)} required />
        </div>
        <div className="sm:col-span-2">
          <label className="label-pro" htmlFor="sv-tempo">Tempo estimado (min)</label>
          <input id="sv-tempo" type="number" min="0" step="5" inputMode="numeric" className="input-pro num" value={formData.tempo_estimado_min} onChange={(e) => set("tempo_estimado_min", e.target.value)} placeholder="Ex.: 60" />
          {formatarDuracao(formData.tempo_estimado_min) && <p className="help-pro">≈ {formatarDuracao(formData.tempo_estimado_min)}</p>}
        </div>
        <div className="sm:col-span-6">
          <label className="label-pro" htmlFor="sv-desc">Descrição</label>
          <textarea id="sv-desc" rows={3} className="input-pro" value={formData.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="O que está incluído no serviço" />
        </div>
      </form>
    </Modal>
  );
}
