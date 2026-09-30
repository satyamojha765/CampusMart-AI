export default function Input({ label, className = "", ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}

      <input
        className={`w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        {...props}
      />
    </div>
  );
}