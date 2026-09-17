import { AppShell } from "@/components/shell/AppShell";

export default function Loading() {
  return (
    <AppShell title="Carregando visão geral" variant="dashboard">
      <div
        role="status"
        aria-label="Carregando dashboard"
        className="motion-safe:animate-pulse"
      >
        <div className="mb-5 h-72 rounded-[30px] bg-white/40" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-[30px] bg-white/70" />
          ))}
        </div>
        <div className="mt-4 h-72 rounded-[30px] bg-white/70" />
      </div>
    </AppShell>
  );
}
