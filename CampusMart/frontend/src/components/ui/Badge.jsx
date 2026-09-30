export default function Badge({ children, variant = "blue" }) {
  const styles = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    gray: "bg-slate-100 text-slate-700",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[variant]}`}>
      {children}
    </span>
  );
}