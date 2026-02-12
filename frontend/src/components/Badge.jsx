const Badge = ({
  children,
  variant = "default",
  size = "md",
  rounded = "full",
  className = "",
}) => {
  const variants = {
    default:
      "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
    primary:
      "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
    success:
      "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
    warning:
      "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700",
    danger:
      "bg-red-100 text-red-900 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700",
    info: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm font-medium",
    lg: "px-3 py-1.5 text-base font-semibold",
  };

  const roundedOptions = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  };

  return (
    <span
      className={`inline-flex items-center font-semibold border ${variants[variant]} ${sizes[size]} ${roundedOptions[rounded]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
