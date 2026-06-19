export default function LoadingSpinner({ size = "md" }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  return (
    <div className="flex justify-center items-center p-8">
      <div
        className={`${sizes[size]} border-4 border-brand-200 dark:border-brand-900 border-t-brand-600 rounded-full animate-spin`}
      ></div>
    </div>
  );
}
