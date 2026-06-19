import { useEffect, useState } from "react";
import Modal from "./Modal";
import {
  carregarDefaultsImpressao,
  DEFAULTS_ORCAMENTO,
  DEFAULTS_OS,
} from "../utils/impressaoDefaults";

const CAMPOS = {
  orcamento: [
    {
      key: "validadeOrcamento",
      label: "Validade do orçamento",
      rows: 2,
    },
    {
      key: "garantia",
      label: "Garantia",
      rows: 2,
    },
    {
      key: "termosAdicionais",
      label: "Termos adicionais (opcional)",
      rows: 3,
      optional: true,
    },
  ],
  os: [
    {
      key: "garantia",
      label: "Garantia",
      rows: 2,
    },
    {
      key: "mensagemRodape",
      label: "Mensagem de rodapé",
      rows: 2,
    },
    {
      key: "termosAdicionais",
      label: "Termos adicionais (opcional)",
      rows: 3,
      optional: true,
    },
  ],
};

export default function PersonalizarImpressaoModal({
  isOpen,
  onClose,
  tipo,
  onConfirmar,
}) {
  const [valores, setValores] = useState(() => carregarDefaultsImpressao(tipo));

  useEffect(() => {
    if (isOpen) {
      setValores(carregarDefaultsImpressao(tipo));
    }
  }, [isOpen, tipo]);

  const campos = CAMPOS[tipo] || CAMPOS.orcamento;
  const padrao = tipo === "orcamento" ? DEFAULTS_ORCAMENTO : DEFAULTS_OS;

  const handleRestaurar = () => {
    setValores({ ...padrao });
  };

  const handleConfirmar = () => {
    onConfirmar(valores);
  };

  const titulo =
    tipo === "orcamento"
      ? "Personalizar impressão do orçamento"
      : "Personalizar impressão da OS";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titulo}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleRestaurar}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Restaurar padrão
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Imprimir
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Edite os textos que aparecerão no PDF. As alterações ficam salvas no
        navegador para as próximas impressões.
      </p>

      <div className="space-y-4">
        {campos.map((campo) => (
          <div key={campo.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {campo.label}
            </label>
            <textarea
              value={valores[campo.key] || ""}
              onChange={(e) =>
                setValores((prev) => ({ ...prev, [campo.key]: e.target.value }))
              }
              rows={campo.rows}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={campo.optional ? "Deixe em branco para não exibir" : ""}
            />
          </div>
        ))}
      </div>
    </Modal>
  );
}
