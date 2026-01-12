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
      className={`bg-white dark:bg-gray-800 rounded-lg ${shadows[shadow]} ${hoverEffect} ${className}`}
    >
      {(title || subtitle) && (
        <div
          className={`border-b border-gray-200 dark:border-gray-700 ${paddings[padding]}`}
        >
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className={paddings[padding]}>{children}</div>
      {footer && (
        <div
          className={`border-t border-gray-200 dark:border-gray-700 ${paddings[padding]} bg-gray-50 dark:bg-gray-900/50`}
        >
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
