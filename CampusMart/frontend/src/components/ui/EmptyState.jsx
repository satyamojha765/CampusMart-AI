export default function EmptyState({
  icon = "🔍",
  title = "Nothing found",
  message = "Try again with different filters.",
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="text-slate-500 mt-2">{message}</p>
    </div>
  );
}