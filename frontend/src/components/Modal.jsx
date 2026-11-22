import { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";

const SIZES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  full: "sm:max-w-6xl",
};

/**
 * Modal padrão: folha inferior no mobile, diálogo centralizado no desktop.
 * Fecha com Esc e (opcionalmente) clique fora.
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  footer,
}) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink-950/50 backdrop-blur-[2px] sm:p-4 animate-fade-in"
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={`bg-white dark:bg-ink-900 w-full ${SIZES[size] || SIZES.md} max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-xl shadow-pop border border-ink-200/70 dark:border-ink-800 animate-slide-up`}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-ink-100 dark:border-ink-800">
            <div className="min-w-0">
              {title && (
                <h3 className="text-base font-semibold text-ink-900 dark:text-white">{title}</h3>
              )}
              {description && (
                <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost !min-h-0 !p-1.5 -mr-1.5"
                aria-label="Fechar modal"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 px-5 py-3 border-t border-ink-100 dark:border-ink-800 bg-ink-50/60 dark:bg-ink-850/50 rounded-b-xl safe-bottom">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
