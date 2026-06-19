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
    ref,
  ) => {
    const baseClasses =
      "font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2";

    const variants = {
      primary:
        "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500 shadow-sm",
      secondary:
        "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-slate-400 shadow-sm",
      success:
        "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm",
      danger:
        "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm",
      warning:
        "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500 shadow-sm",
      outline:
        "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:ring-slate-400",
      ghost:
        "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-400",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2.5 text-sm",
      lg: "px-5 py-3 text-base",
    };

    const { icon, ...restProps } = props;
    const IconLeft = leftIcon || icon;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        onClick={onClick}
        className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${
          fullWidth ? "w-full" : ""
        } ${className}`}
        {...restProps}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Processando...</span>
          </>
        ) : (
          <>
            {IconLeft && (
              <span className="shrink-0 opacity-90">
                {React.createElement(IconLeft, { size: 18 })}
              </span>
            )}
            {children}
            {rightIcon && (
              <span className="shrink-0 opacity-90">
                {React.createElement(rightIcon, { size: 18 })}
              </span>
            )}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
