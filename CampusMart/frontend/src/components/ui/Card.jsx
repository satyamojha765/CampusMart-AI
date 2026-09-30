export default function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-xl transition ${className}`}
    >
      {children}
    </div>
  );
}