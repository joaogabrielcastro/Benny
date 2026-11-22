import { FiAlertTriangle, FiHelpCircle } from "react-icons/fi";
import Modal from "./Modal";

/**
 * Diálogo de confirmação.
 * Aceita `open` ou `isOpen`, e `onCancel` ou `onClose` (compatibilidade).
 */
export default function ConfirmDialog({
  open,
  isOpen,
  title = "Confirmar",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  onClose,
  variant = "danger",
  loading = false,
}) {
  const visible = open ?? isOpen ?? false;
  const handleCancel = onCancel ?? onClose;

  if (!visible) return null;

  const danger = variant === "danger";
  const Icon = danger ? FiAlertTriangle : FiHelpCircle;

  return (
    <Modal
      isOpen
      onClose={handleCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" onClick={handleCancel} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={danger ? "btn-danger" : "btn-brand"}
            autoFocus
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            danger
              ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
              : "bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-sm text-ink-600 dark:text-ink-300 whitespace-pre-line pt-1.5">{message}</p>
      </div>
    </Modal>
  );
}
