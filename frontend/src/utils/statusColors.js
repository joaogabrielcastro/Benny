export const orcamentoStatusClass = (status) => {
  const map = {
    Pendente:
      "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
    Aprovado:
      "bg-green-100 text-green-800 border border-green-300 dark:bg-green-950/40 dark:text-green-300",
    Reprovado:
      "bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/40 dark:text-red-300",
  };
  return (
    map[status] ||
    "bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300"
  );
};

export const osStatusClass = (status) => {
  const map = {
    Aberta:
      "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-300",
    "Em andamento":
      "bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300",
    Finalizada:
      "bg-green-100 text-green-800 border border-green-300 dark:bg-green-950/40 dark:text-green-300",
    Cancelada:
      "bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/40 dark:text-red-300",
  };
  return (
    map[status] ||
    "bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300"
  );
};
