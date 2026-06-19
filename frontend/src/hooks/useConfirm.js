import { useCallback, useState } from "react";

/**
 * Confirmação assíncrona (substitui window.confirm em fluxos críticos).
 */
export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback(
    ({ title, message, confirmLabel = "Confirmar", cancelLabel = "Cancelar" }) =>
      new Promise((resolve) => {
        setState({
          title,
          message,
          confirmLabel,
          cancelLabel,
          resolve,
        });
      }),
    [],
  );

  const handleClose = useCallback((result) => {
    state?.resolve(result);
    setState(null);
  }, [state]);

  return { confirm, dialogState: state, handleClose };
}
