import { useState } from "react";
import api from "../../services/api";

const MATCH_LABEL = {
  MATCH_EXATO: "✓ Encontrado no cadastro",
  MATCH_PROVAVEL: "? Possível correspondência",
  NAO_ENCONTRADO: "! Não encontrado no cadastro",
};

const ESTOQUE_LABEL = {
  DISPONIVEL: "✓ Em estoque",
  ESTOQUE_INSUFICIENTE: "⚠ Estoque insuficiente",
  SEM_ESTOQUE: "! Sem estoque",
};

function moeda(valor) {
  return `R$ ${Number(valor || 0).toFixed(2)}`;
}

function formatarData(iso) {
  if (!iso) return "Data não informada";
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

function chaveItem(prefixo, item, index) {
  return `${prefixo}-${index}-${item.descricao}`;
}

export default function AssistenteOrcamento({
  clienteId,
  veiculoId,
  km,
  itensProdutos,
  itensServicos,
  onAplicar,
}) {
  const [descricao, setDescricao] = useState("");
  const [respostas, setRespostas] = useState([]);
  const [rascunhoRespostas, setRascunhoRespostas] = useState({});
  const [estado, setEstado] = useState("idle");
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState(null);
  const [marcados, setMarcados] = useState({});
  const [escolhas, setEscolhas] = useState({});
  const [avisos, setAvisos] = useState([]);

  const pronto = Boolean(clienteId && veiculoId);

  const alternar = (chave) => {
    setMarcados((atual) => ({ ...atual, [chave]: !atual[chave] }));
  };

  const gerar = async (respostasEnvio = respostas) => {
    if (!pronto) {
      setErro("Selecione o cliente e o veículo antes de gerar sugestões.");
      setEstado("error");
      return;
    }
    setEstado("loading");
    setErro("");
    setAvisos([]);
    try {
      const payload = {
        cliente_id: Number(clienteId),
        veiculo_id: Number(veiculoId),
        descricao: descricao.trim(),
        respostas: respostasEnvio,
      };
      if (km !== "" && km != null) payload.km = Number(km);
      const { data } = await api.post("/orcamentos/assistente/sugerir", payload);
      setResultado(data);
      setMarcados({});
      setEscolhas({});
      setEstado("success");
    } catch (err) {
      setEstado("error");
      setErro(
        err.response?.data?.error ||
          "Não foi possível gerar sugestões agora. Você pode continuar criando o orçamento manualmente.",
      );
    }
  };

  const atualizarComRespostas = () => {
    if (!resultado?.perguntas?.length) return;
    const novas = resultado.perguntas
      .map((pergunta) => ({
        pergunta,
        resposta: String(rascunhoRespostas[pergunta] || "").trim(),
      }))
      .filter((item) => item.resposta);
    setRespostas(novas);
    gerar(novas);
  };

  const adicionarSelecionados = () => {
    if (!resultado) return;
    const selecionados = [];
    (resultado.pecas || []).forEach((item, index) => {
      const chave = chaveItem("peca", item, index);
      const produto = item.ambiguo
        ? item.candidatos?.[escolhas[chave]]?.produto
        : item.produto;
      if (marcados[chave] && item.match !== "NAO_ENCONTRADO" && produto) {
        selecionados.push({ ...item, produto });
      }
    });
    (resultado.servicos || []).forEach((item, index) => {
      const chave = chaveItem("servico", item, index);
      const servico = item.ambiguo
        ? item.candidatos?.[escolhas[chave]]?.servico
        : item.servico;
      if (marcados[chave] && item.match !== "NAO_ENCONTRADO" && servico) {
        selecionados.push({ ...item, servico });
      }
    });
    (resultado.itens_condicionais || []).forEach((item, index) => {
      const chave = chaveItem("cond", item, index);
      if (marcados[chave] && item.produto) {
        selecionados.push({ ...item, tipo: "produto" });
      }
    });

    const aplicado = onAplicar({
      itensProdutos,
      itensServicos,
      selecionados,
    });
    setAvisos(aplicado?.avisos || []);
    setMarcados({});
    setEscolhas({});
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-1">
        Assistente de Orçamento
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        A sugestão não grava o orçamento. Você revisa e escolhe o que entra.
      </p>

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Descreva o problema ou o serviço
      </label>
      <textarea
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Ex.: Jetta está esquentando, baixando água e fica uma poça embaixo"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="mt-3">
        <button
          type="button"
          disabled={estado === "loading" || !descricao.trim()}
          onClick={() => gerar(respostas)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {estado === "loading" ? "Gerando..." : "✨ Gerar sugestões"}
        </button>
      </div>

      {estado === "error" && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{erro}</p>
      )}

      {resultado && estado !== "loading" && (
        <div className="mt-6 space-y-5">
          {resultado.titulo && (
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">
                {resultado.titulo}
              </h3>
              {resultado.resumo && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {resultado.resumo}
                </p>
              )}
            </div>
          )}

          {(resultado.historico_considerado?.length > 0 ||
            resultado.observacoes_historico?.length > 0) && (
            <details className="text-sm text-gray-700 dark:text-gray-300">
              <summary className="cursor-pointer font-medium text-gray-800 dark:text-white">
                Histórico deste veículo
              </summary>
              <ul className="mt-2 space-y-1 pl-1">
                {(resultado.historico_considerado || []).map((os) => (
                  <li key={`${os.data}-${os.km}`}>
                    • {formatarData(os.data)}
                    {os.itens?.length ? ` — ${os.itens.join(", ")}` : ""}
                    {os.km != null ? ` — ${Number(os.km).toLocaleString("pt-BR")} km` : ""}
                  </li>
                ))}
              </ul>
              {resultado.observacoes_historico?.length > 0 && (
                <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                  {resultado.observacoes_historico.map((obs) => (
                    <li key={obs.texto}>{obs.texto}</li>
                  ))}
                </ul>
              )}
            </details>
          )}

          {(resultado.casos_semelhantes?.length > 0 ||
            resultado.observacoes_casos_semelhantes?.length > 0) && (
            <details className="text-sm text-gray-700 dark:text-gray-300">
              <summary className="cursor-pointer font-medium text-gray-800 dark:text-white">
                Casos semelhantes da oficina
                {resultado.casos_semelhantes?.length
                  ? ` (${resultado.casos_semelhantes.length})`
                  : ""}
              </summary>
              <ul className="mt-2 space-y-2 pl-1">
                {(resultado.casos_semelhantes || []).map((caso) => (
                  <li key={`${caso.data}-${caso.km}-${caso.modelo}`}>
                    <span className="font-medium">
                      {[caso.marca, caso.modelo].filter(Boolean).join(" ") || "Veículo"}
                    </span>
                    {[caso.motor, caso.combustivel, caso.ano].filter(Boolean).length > 0 && (
                      <span className="block text-gray-600 dark:text-gray-400">
                        {[caso.motor, caso.combustivel, caso.ano].filter(Boolean).join(" • ")}
                      </span>
                    )}
                    <span className="block text-gray-600 dark:text-gray-400">
                      {[...(caso.servicos || []), ...(caso.pecas || [])].join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
              {resultado.observacoes_casos_semelhantes?.length > 0 && (
                <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                  {resultado.observacoes_casos_semelhantes.map((obs) => (
                    <li key={obs.texto}>{obs.texto}</li>
                  ))}
                </ul>
              )}
            </details>
          )}

          {resultado.diagnosticos_sugeridos?.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-800 dark:text-white mb-2">
                Diagnósticos sugeridos
              </h3>
              <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {resultado.diagnosticos_sugeridos.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          <ListaRevisao
            titulo="Serviços sugeridos"
            itens={resultado.servicos}
            prefixo="servico"
            marcados={marcados}
            escolhas={escolhas}
            onAlternar={alternar}
            onEscolher={(chave, indice) =>
              setEscolhas((atual) => ({ ...atual, [chave]: indice }))
            }
          />
          <ListaRevisao
            titulo="Peças sugeridas"
            itens={resultado.pecas}
            prefixo="peca"
            marcados={marcados}
            escolhas={escolhas}
            onAlternar={alternar}
            onEscolher={(chave, indice) =>
              setEscolhas((atual) => ({ ...atual, [chave]: indice }))
            }
          />

          {resultado.itens_condicionais?.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-800 dark:text-white mb-2">
                Itens condicionais
              </h3>
              <ul className="space-y-2">
                {resultado.itens_condicionais.map((item, index) => {
                  const chave = chaveItem("cond", item, index);
                  return (
                    <li
                      key={chave}
                      className="border border-amber-300 dark:border-amber-700 rounded-md p-3 text-sm"
                    >
                      <label className="flex gap-2 items-start">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={Boolean(marcados[chave])}
                          disabled={!item.produto}
                          onChange={() => alternar(chave)}
                        />
                        <span>
                          <span className="font-medium text-gray-800 dark:text-white">
                            ⚠ {item.descricao}
                          </span>
                          <span className="block text-gray-600 dark:text-gray-300">
                            {item.motivo || "Adicionar somente após confirmação do mecânico."}
                          </span>
                          <span className="block mt-1">{MATCH_LABEL[item.match]}</span>
                          {item.produto && (
                            <span className="block">
                              {item.produto.nome} · {moeda(item.produto.valor_unitario)} ·{" "}
                              {ESTOQUE_LABEL[item.estoque_status]}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {resultado.perguntas?.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-800 dark:text-white mb-2">
                Antes de refinar a sugestão
              </h3>
              <div className="space-y-2">
                {resultado.perguntas.map((pergunta) => (
                  <label key={pergunta} className="block text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{pergunta}</span>
                    <input
                      type="text"
                      value={rascunhoRespostas[pergunta] || ""}
                      onChange={(e) =>
                        setRascunhoRespostas((atual) => ({
                          ...atual,
                          [pergunta]: e.target.value,
                        }))
                      }
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={atualizarComRespostas}
                className="mt-3 px-4 py-2 border border-blue-600 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-50 dark:hover:bg-gray-700"
              >
                Atualizar sugestão
              </button>
            </div>
          )}

          {avisos.map((aviso) => (
            <p key={aviso} className="text-sm text-amber-700 dark:text-amber-300">
              {aviso}
            </p>
          ))}

          <button
            type="button"
            onClick={adicionarSelecionados}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Adicionar selecionados ao orçamento
          </button>
        </div>
      )}
    </div>
  );
}

function ListaRevisao({ titulo, itens = [], prefixo, marcados, escolhas, onAlternar, onEscolher }) {
  if (!itens.length) return null;
  return (
    <div>
      <h3 className="font-medium text-gray-800 dark:text-white mb-2">{titulo}</h3>
      <ul className="space-y-2">
        {itens.map((item, index) => {
          const chave = chaveItem(prefixo, item, index);
          const indiceEscolha = escolhas?.[chave];
          const candidato = item.ambiguo ? item.candidatos?.[indiceEscolha] : null;
          const cadastro = item.ambiguo
            ? candidato?.produto || candidato?.servico
            : item.produto || item.servico;
          const podeMarcar = item.match !== "NAO_ENCONTRADO" && Boolean(cadastro);
          return (
            <li
              key={chave}
              className="border border-gray-200 dark:border-gray-700 rounded-md p-3 text-sm"
            >
              <label className="flex gap-2 items-start">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(marcados[chave])}
                  disabled={!podeMarcar}
                  onChange={() => onAlternar(chave)}
                />
                <span className="text-gray-800 dark:text-gray-100">
                  <span className="font-medium">{item.descricao}</span>
                  <span className="block">{MATCH_LABEL[item.match] || item.match}</span>
                  {item.ambiguo && item.candidatos?.length > 1 && (
                    <span className="block mt-2">
                      <span className="font-medium">Possíveis correspondências</span>
                      {item.candidatos.map((opcao, indice) => {
                        const nome = opcao.produto?.nome || opcao.servico?.nome;
                        return (
                          <label key={nome} className="mt-1 flex items-center gap-2">
                            <input
                              type="radio"
                              name={chave}
                              checked={indiceEscolha === indice}
                              onChange={() => onEscolher(chave, indice)}
                            />
                            <span>{nome}</span>
                          </label>
                        );
                      })}
                    </span>
                  )}
                  {cadastro && !item.ambiguo && (
                    <span className="block">
                      {cadastro.nome} · {moeda(cadastro.valor_unitario)} · qtd{" "}
                      {item.quantidade_sugerida}
                      {item.produto
                        ? ` · estoque ${item.produto.estoque} · ${ESTOQUE_LABEL[item.estoque_status]}`
                        : ""}
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
