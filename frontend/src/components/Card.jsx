const Card = ({
  children,
  title,
  subtitle,
  footer,
  padding = "md",
  shadow = "md",
  hover = false,
  className = "",
}) => {
  const paddings = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const shadows = {
    none: "",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-xl",
  };

  const hoverEffect = hover
    ? "hover:shadow-lg transition-shadow duration-200"
    : "";

  return (
    <div
      className={`pro-card ${shadows[shadow] !== "" ? shadows[shadow] : ""} ${hoverEffect} ${className}`}
    >
      {(title || subtitle) && (
        <div
          className={`border-b border-slate-200/80 dark:border-slate-800 ${paddings[padding]}`}
        >
          {title && (
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className={paddings[padding]}>{children}</div>
      {footer && (
        <div
          className={`border-t border-slate-200/80 dark:border-slate-800 ${paddings[padding]} bg-slate-50/80 dark:bg-slate-900/50 rounded-b-xl`}
        >
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
