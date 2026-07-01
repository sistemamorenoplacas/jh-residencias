import { AppShell } from "@/components/shell/AppShell";

export default function Loading() {
  return (
    <AppShell title="Visão geral">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-card bg-surface border border-line" />
        ))}
      </section>
      <section className="mt-8">
        <div className="mb-3 h-5 w-40 animate-pulse rounded bg-surface" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-card bg-surface border border-line" />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
