import React, { forwardRef } from "react";

const Button = forwardRef(
  (
    {
      children,
      type = "button",
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      onClick,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2";

    const variants = {
      primary:
        "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600",
      secondary:
        "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 dark:bg-gray-500 dark:hover:bg-gray-600",
      success:
        "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 dark:bg-green-500 dark:hover:bg-green-600",
      danger:
        "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600",
      warning:
        "bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600",
      outline:
        "border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 dark:border-gray-500 dark:text-white dark:hover:bg-gray-800",
      ghost:
        "text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-200 dark:hover:bg-gray-800",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    const widthClass = fullWidth ? "w-full" : "";

    // Não repassar a prop 'icon' para o DOM
    const { icon, ...restProps } = props;

    const isIconOnly =
      React.Children.count(children) === 0 && (leftIcon || rightIcon || icon);
    const iconOnlyBase =
      "inline-flex items-center justify-center rounded-full h-8 w-8 p-1 shadow-sm";

    const iconVariantStyles = {
      primary:
        "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
      secondary:
        "bg-gray-700 text-white hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500",
      success: "bg-green-500 text-white hover:bg-green-600",
      danger: "bg-red-500 text-white hover:bg-red-600",
      warning: "bg-yellow-500 text-white hover:bg-yellow-600",
      outline:
        "bg-transparent border-2 border-gray-600 text-gray-200 hover:bg-gray-700 dark:border-gray-500",
      ghost: "bg-gray-800 text-gray-200 hover:bg-gray-700",
    };

    // Emoji/fallback text para botões somente-ícone — melhora contraste e legibilidade
    const getIconName = (ic) => {
      if (!ic) return "";
      return ic.displayName || ic.name || "";
    };

    const iconCandidate = leftIcon || icon || null;
    const iconName = getIconName(iconCandidate).toLowerCase();

    const emojiMap = {
      trash: "🗑️",
      delete: "🗑️",
      check: "✔️",
      plus: "➕",
      add: "➕",
      edit: "✏️",
      pencil: "✏️",
      search: "🔍",
      calendar: "📅",
      clock: "🕒",
      dollar: "💲",
    };

    let emoji = "";
    for (const key in emojiMap) {
      if (iconName.includes(key)) {
        emoji = emojiMap[key];
        break;
      }
    }
    if (!emoji) {
      if (variant === "success") emoji = "✅";
      else if (variant === "danger") emoji = "❌";
      else if (variant === "warning") emoji = "⚠️";
      else emoji = "";
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        onClick={onClick}
        className={`${baseClasses} ${
          isIconOnly
            ? `${iconOnlyBase} ${
                iconVariantStyles[variant] || variants[variant]
              }`
            : `${variants[variant]} ${sizes[size]}`
        } ${widthClass} ${className}`}
        {...restProps}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Processando...</span>
          </>
        ) : (
          <>
            {isIconOnly ? (
              <span aria-hidden className="text-sm">
                {emoji || (leftIcon || icon)}
              </span>
            ) : (
              (leftIcon || icon) && <span>{leftIcon || icon}</span>
            )}
            {children}
            {rightIcon && <span>{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
