import { FiInbox } from "react-icons/fi";

export default function EmptyState({
  icon: Icon = FiInbox,
  title = "Nada por aqui",
  description,
  action,
  compact = false,
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-8 px-4" : "py-14 px-6"}`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-100 dark:bg-ink-800 text-ink-500 dark:text-ink-400">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-ink-900 dark:text-white">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
