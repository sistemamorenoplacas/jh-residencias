import { AppShell } from "@/components/shell/AppShell";

export default function Loading() {
  return (
    <AppShell title="Contratos">
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-card bg-surface border border-line" />
        ))}
      </div>
    </AppShell>
  );
}
