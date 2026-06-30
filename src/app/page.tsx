import { redirect } from "next/navigation";

export default function Home() {
  // MVP single-tenant: raiz vai direto ao painel. Auth entra na Fase 1 (login).
  redirect("/painel");
}
