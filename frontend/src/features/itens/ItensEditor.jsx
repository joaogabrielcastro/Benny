import { FiTrash2, FiAlertTriangle, FiTool, FiPackage } from "react-icons/fi";
import CatalogoPicker from "./CatalogoPicker";
import { formatarMoeda } from "../../utils/formatters";

const num = (v) => {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function linhaDeProduto(p) {
  const vu = num(p.valor_venda);
  return {
    produto_id: p.id,
    codigo: p.codigo || "",
    descricao: p.nome,
    ncm: p.ncm || "",
    quantidade: 1,
    valor_unitario: vu,
    valor_total: vu,
    _estoque: num(p.quantidade),
    _reservado: 0,
  };
}

export function linhaDeServico(s) {
  const vu = num(s.valor_unitario);
  return {
    codigo: s.codigo || "",
    descricao: s.nome,
    quantidade: 1,
    valor_unitario: vu,
    valor_total: vu,
    _tempo: s.tempo_estimado_min || null,
  };
}

export function totaisItens(produtos = [], servicos = []) {
  const vp = produtos.reduce((s, i) => s + num(i.valor_total), 0);
  const vs = servicos.reduce((s, i) => s + num(i.valor_total), 0);
  return { valor_produtos: vp, valor_servicos: vs, valor_total: vp + vs };
}

/** Remove campos de UI (prefixo _) antes de enviar à API. */
export function limparLinha(l) {
  const out = {};
  for (const [k, v] of Object.entries(l)) if (!k.startsWith("_")) out[k] = v;
  out.quantidade = num(out.quantidade);
  out.valor_unitario = num(out.valor_unitario);
  out.valor_total = Math.round(num(out.quantidade) * num(out.valor_unitario) * 100) / 100;
  if (out.produto_id === "") out.produto_id = null;
  return out;
}

export function faltaEstoque(l) {
  if (!l.produto_id || l._estoque == null) return false;
  return num(l.quantidade) > num(l._estoque) + num(l._reservado);
}

function Linha({ l, tipo, onChange, onRemover, desabilitado }) {
  const set = (campo, valor) => {
    const novo = { ...l, [campo]: valor };
    if (campo === "quantidade" || campo === "valor_unitario") {
      novo.valor_total = Math.round(num(novo.quantidade) * num(novo.valor_unitario) * 100) / 100;
    }
    onChange(novo);
  };
  const avulso = tipo === "produto" ? !l.produto_id : !l.codigo;
  const falta = tipo === "produto" && faltaEstoque(l);
  const Icon = tipo === "produto" ? FiPackage : FiTool;

  return (
    <li className={`grid grid-cols-12 gap-2 items-center px-3 py-2.5 ${falta ? "bg-red-50/70 dark:bg-red-950/20" : ""}`}>
      <div className="col-span-12 sm:col-span-6 flex items-start gap-2 min-w-0">
        <Icon className="h-4 w-4 text-ink-400 mt-2.5 shrink-0 hidden sm:block" />
        <div className="min-w-0 flex-1">
          {avulso ? (
            <input
              className="input-pro !min-h-[2.25rem]"
              value={l.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              placeholder={tipo === "produto" ? "Descrição da peça" : "Descrição do serviço"}
              aria-label="Descrição"
              disabled={desabilitado}
              required
            />
          ) : (
            <p className="text-sm font-medium text-ink-900 dark:text-ink-100 pt-1.5 truncate" title={l.descricao}>
              {l.descricao}
            </p>
          )}
          <p className="text-2xs text-ink-500 mt-0.5">
            {l.codigo || (avulso ? "avulso" : "")}
            {tipo === "produto" && l._estoque != null && l.produto_id && (
              <span className={falta ? "text-red-600 font-semibold" : ""}>
                {" "}· disponível {num(l._estoque) + num(l._reservado)}
              </span>
            )}
            {l._tempo ? ` · ~${l._tempo} min` : ""}
          </p>
          {tipo === "produto" && !desabilitado && (
            <input
              className="input-pro !min-h-0 !py-0.5 !text-2xs w-32 mt-1 font-mono"
              value={l.ncm || ""}
              onChange={(e) => set("ncm", e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="NCM (8 dígitos)"
              aria-label="NCM"
              inputMode="numeric"
            />
          )}
          {falta && (
            <p className="text-2xs text-red-600 flex items-center gap-1 mt-0.5">
              <FiAlertTriangle className="h-3 w-3" /> Estoque insuficiente — o salvamento será recusado.
            </p>
          )}
        </div>
      </div>
      <div className="col-span-3 sm:col-span-2">
        <label className="sr-only">Quantidade</label>
        <input
          type="number"
          min={tipo === "produto" ? 1 : 0.01}
          step={tipo === "produto" ? 1 : 0.01}
          inputMode={tipo === "produto" ? "numeric" : "decimal"}
          className="input-pro !min-h-[2.25rem] text-right num"
          value={l.quantidade}
          onChange={(e) => set("quantidade", e.target.value)}
          aria-label="Quantidade"
          disabled={desabilitado}
          required
        />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <input
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          className="input-pro !min-h-[2.25rem] text-right num"
          value={l.valor_unitario}
          onChange={(e) => set("valor_unitario", e.target.value)}
          aria-label="Valor unitário"
          disabled={desabilitado}
          required
        />
      </div>
      <div className="col-span-4 sm:col-span-1 text-right text-sm font-semibold num text-ink-900 dark:text-ink-100">
        {formatarMoeda(l.valor_total)}
      </div>
      <div className="col-span-1 text-right">
        {!desabilitado && (
          <button type="button" onClick={onRemover} className="btn-ghost btn-sm !px-1.5 text-ink-400 hover:!text-red-600" aria-label="Remover item">
            <FiTrash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  );
}

function Grupo({ titulo, tipo, linhas, setLinhas, desabilitado }) {
  const adicionar = (item) => {
    if (tipo === "produto") {
      const existente = linhas.findIndex((l) => l.produto_id && Number(l.produto_id) === Number(item.id));
      if (existente >= 0) {
        const c = [...linhas];
        const l = { ...c[existente] };
        l.quantidade = num(l.quantidade) + 1;
        l.valor_total = Math.round(num(l.quantidade) * num(l.valor_unitario) * 100) / 100;
        l._estoque = num(item.quantidade);
        c[existente] = l;
        setLinhas(c);
        return;
      }
      setLinhas([...linhas, linhaDeProduto(item)]);
    } else {
      setLinhas([...linhas, linhaDeServico(item)]);
    }
  };
  const avulso = (descricao) =>
    setLinhas([
      ...linhas,
      tipo === "produto"
        ? { produto_id: null, codigo: "", descricao: descricao || "", ncm: "", quantidade: 1, valor_unitario: 0, valor_total: 0 }
        : { codigo: "", descricao: descricao || "", quantidade: 1, valor_unitario: 0, valor_total: 0 },
    ]);

  const subtotal = linhas.reduce((s, l) => s + num(l.valor_total), 0);

  return (
    <div>
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <p className="eyebrow">{titulo}</p>
        <p className="text-xs text-ink-500 num">
          {linhas.length} {linhas.length === 1 ? "item" : "itens"} · {formatarMoeda(subtotal)}
        </p>
      </div>
      {linhas.length > 0 && (
        <>
          <div className="hidden sm:grid grid-cols-12 gap-2 px-3 pb-1 text-2xs uppercase tracking-wider text-ink-400">
            <span className="col-span-6">Descrição</span>
            <span className="col-span-2 text-right">Qtd</span>
            <span className="col-span-2 text-right">Unitário (R$)</span>
            <span className="col-span-1 text-right">Total</span>
          </div>
          <ul className="divide-y divide-ink-100 dark:divide-ink-800 border-y border-ink-100 dark:border-ink-800">
            {linhas.map((l, i) => (
              <Linha
                key={l.id || l._key || i}
                l={l}
                tipo={tipo}
                desabilitado={desabilitado}
                onChange={(novo) => setLinhas(linhas.map((x, j) => (j === i ? novo : x)))}
                onRemover={() => setLinhas(linhas.filter((_, j) => j !== i))}
              />
            ))}
          </ul>
        </>
      )}
      {!desabilitado && (
        <div className="p-3">
          <CatalogoPicker tipo={tipo} onSelecionar={adicionar} onAvulso={avulso} />
        </div>
      )}
    </div>
  );
}

/**
 * Editor de serviços e peças (OS e orçamentos).
 */
export default function ItensEditor({ produtos, servicos, onChangeProdutos, onChangeServicos, desabilitado = false }) {
  const t = totaisItens(produtos, servicos);
  return (
    <div className="pro-card">
      <div className="card-header">
        <h2 className="card-title">Serviços e peças</h2>
        <span className="text-sm font-semibold num text-ink-900 dark:text-white">{formatarMoeda(t.valor_total)}</span>
      </div>
      <Grupo titulo="Serviços · mão de obra" tipo="servico" linhas={servicos} setLinhas={onChangeServicos} desabilitado={desabilitado} />
      <div className="border-t border-ink-100 dark:border-ink-800" />
      <Grupo titulo="Peças" tipo="produto" linhas={produtos} setLinhas={onChangeProdutos} desabilitado={desabilitado} />
      <dl className="border-t border-ink-200 dark:border-ink-700 px-4 py-3 text-sm space-y-1 bg-ink-50/60 dark:bg-ink-850/40 rounded-b-xl">
        <div className="flex justify-between text-ink-600 dark:text-ink-300">
          <dt>Serviços</dt>
          <dd className="num">{formatarMoeda(t.valor_servicos)}</dd>
        </div>
        <div className="flex justify-between text-ink-600 dark:text-ink-300">
          <dt>Peças</dt>
          <dd className="num">{formatarMoeda(t.valor_produtos)}</dd>
        </div>
        <div className="flex justify-between pt-1 text-base font-semibold text-ink-900 dark:text-white">
          <dt>Total</dt>
          <dd className="num">{formatarMoeda(t.valor_total)}</dd>
        </div>
      </dl>
    </div>
  );
}
