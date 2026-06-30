import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "ghost";
  icon?: ReactNode;
}

export function PrimaryButton({
  variant = "solid",
  icon,
  children,
  className = "",
  ...rest
}: PrimaryButtonProps) {
  const base =
    "inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50";
  const styles =
    variant === "solid"
      ? "bg-brand text-white hover:bg-brand-dark"
      : "border border-line bg-surface text-ink hover:bg-canvas";
  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}
