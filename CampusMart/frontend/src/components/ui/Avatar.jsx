import { useEffect, useMemo, useState } from "react";

const SIZE_CLASSES = {
  sm: "h-10 w-10 text-sm",
  md: "h-14 w-14 text-base",
  lg: "h-24 w-24 text-2xl",
  xl: "h-32 w-32 text-3xl",
};

export default function Avatar({
  src = "",
  name = "User",
  size = "md",
  className = "",
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const initials = useMemo(() => {
    const cleanedName = String(name || "User")
      .trim()
      .replace(/\s+/g, " ");

    if (!cleanedName) return "U";

    const parts = cleanedName.split(" ");

    if (parts.length === 1) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return `${parts[0][0] || ""}${
      parts[parts.length - 1][0] || ""
    }`.toUpperCase();
  }, [name]);

  const sizeClass =
    SIZE_CLASSES[size] || SIZE_CLASSES.md;

  const showImage =
    Boolean(src) && !imageFailed;

  return (
    <div
      className={`${sizeClass} ${className} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-200 bg-gradient-to-br from-blue-100 to-indigo-100 font-black text-blue-700 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 dark:text-blue-300`}
      title={name}
      aria-label={`${name} profile photo`}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">
          {initials}
        </span>
      )}
    </div>
  );
}