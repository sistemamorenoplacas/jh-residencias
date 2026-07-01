import { AppShell } from "@/components/shell/AppShell";

export default function Loading() {
  return (
    <AppShell title="Configurações">
      <div className="space-y-4 max-w-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-card bg-surface border border-line" />
        ))}
      </div>
    </AppShell>
  );
}
