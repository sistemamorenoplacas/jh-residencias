import { AppShell } from "@/components/shell/AppShell";

export default function Loading() {
  return (
    <AppShell title="Perfil">
      <div className="flex max-w-lg flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-card bg-surface border border-line" />
        ))}
      </div>
    </AppShell>
  );
}
