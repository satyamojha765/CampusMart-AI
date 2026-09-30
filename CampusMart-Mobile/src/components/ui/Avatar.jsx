export default function Avatar({ src, name = "User", size = "md" }) {
  const sizes = {
    sm: "h-10 w-10 text-lg",
    md: "h-14 w-14 text-2xl",
    lg: "h-24 w-24 text-5xl",
  };

  return (
    <div
      className={`${sizes[size]} rounded-full bg-blue-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden font-bold`}
    >
      {src ? (
        <img
  src={src}
  alt={name}
  referrerPolicy="no-referrer"
  className="h-full w-full object-cover"
/>
      ) : (
        "👤"
      )}
    </div>
  );
}