export default function Button({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    dark: "bg-slate-900 text-white hover:bg-blue-600",
    danger: "bg-red-500 text-white hover:bg-red-600",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white",
    soft: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white hover:bg-slate-200",
  };

  return (
    <button
      className={`px-5 py-3 rounded-2xl font-bold transition ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}