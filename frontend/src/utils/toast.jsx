import toast from "react-hot-toast";

// Configuração padrão dos toasts
const toastConfig = {
  duration: 4000,
  position: "top-right",
  style: {
    borderRadius: "8px",
    padding: "16px",
  },
};

// Toast de sucesso
export const showSuccess = (message, options = {}) => {
  return toast.success(message, {
    ...toastConfig,
    icon: "✅",
    style: {
      ...toastConfig.style,
      background: "#10B981",
      color: "#fff",
    },
    ...options,
  });
};

// Toast de erro
export const showError = (message, options = {}) => {
  return toast.error(message, {
    ...toastConfig,
    icon: "❌",
    style: {
      ...toastConfig.style,
      background: "#EF4444",
      color: "#fff",
    },
    ...options,
  });
};

// Toast de aviso
export const showWarning = (message, options = {}) => {
  return toast(message, {
    ...toastConfig,
    icon: "⚠️",
    style: {
      ...toastConfig.style,
      background: "#F59E0B",
      color: "#fff",
    },
    ...options,
  });
};

// Toast de informação
export const showInfo = (message, options = {}) => {
  return toast(message, {
    ...toastConfig,
    icon: "ℹ️",
    style: {
      ...toastConfig.style,
      background: "#3B82F6",
      color: "#fff",
    },
    ...options,
  });
};

// Toast de loading
export const showLoading = (message = "Carregando...") => {
  return toast.loading(message, {
    ...toastConfig,
    duration: Infinity,
  });
};

// Atualizar toast de loading
export const updateLoading = (toastId, message, type = "success") => {
  const types = {
    success: {
      render: message,
      icon: "✅",
      style: {
        ...toastConfig.style,
        background: "#10B981",
        color: "#fff",
      },
    },
    error: {
      render: message,
      icon: "❌",
      style: {
        ...toastConfig.style,
        background: "#EF4444",
        color: "#fff",
      },
    },
  };

  toast.dismiss(toastId);

  if (type === "success") {
    showSuccess(message);
  } else {
    showError(message);
  }
};

// Toast com ação (promessa)
export const showPromise = (promise, messages) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading || "Carregando...",
      success: messages.success || "Sucesso!",
      error: messages.error || "Erro ao processar",
    },
    toastConfig
  );
};

// Toast customizado com componente
export const showCustom = (component, options = {}) => {
  return toast.custom(component, {
    ...toastConfig,
    ...options,
  });
};

// Limpar todos os toasts
export const dismissAll = () => {
  toast.dismiss();
};

// Toast de confirmação de ação
export const showActionToast = (message, onConfirm, onCancel) => {
  return toast(
    (t) => (
      <div className="flex flex-col gap-3">
        <p className="font-medium">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onConfirm();
              toast.dismiss(t.id);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Confirmar
          </button>
          <button
            onClick={() => {
              if (onCancel) onCancel();
              toast.dismiss(t.id);
            }}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    ),
    {
      duration: Infinity,
      position: "top-center",
    }
  );
};

export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  updateLoading,
  promise: showPromise,
  custom: showCustom,
  action: showActionToast,
  dismissAll,
};
