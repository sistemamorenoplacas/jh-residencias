import { AppShell } from "@/components/shell/AppShell";

export default function Loading() {
  return (
    <AppShell title="Cobranças">
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-lg bg-surface border border-line" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-card bg-surface border border-line" />
        ))}
      </div>
    </AppShell>
  );
}
