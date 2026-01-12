const EmptyState = ({ icon, title, description, action, className = "" }) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}
    >
      {icon && (
        <div className="text-6xl mb-4 text-gray-400 dark:text-gray-600">
          {icon}
        </div>
      )}
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
