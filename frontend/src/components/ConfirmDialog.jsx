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
}) {
  const visible = open ?? isOpen ?? false;
  const handleCancel = onCancel ?? onClose;

  if (!visible) return null;

  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white";

  return (
    <Modal isOpen onClose={handleCancel} title={title}>
      <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line mb-6">
        {message}
      </p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`px-4 py-2 rounded-lg ${confirmClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
