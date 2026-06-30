import { AppShell } from "@/components/shell/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import type { DbProperty } from "@/lib/db-types";
import { PropertyList } from "@/components/imoveis/PropertyList";
import { NovoImovelButton } from "@/components/imoveis/NovoImovelButton";

/**
 * Lista de imóveis do proprietário.
 *
 * Server Component: busca via `createServerClient` (RESPEITA RLS, então só
 * retorna `properties` com `owner_id = auth.uid()`). O layout `(painel)` já
 * exige sessão (`requireUser`), portanto aqui há sempre um usuário válido.
 */

export default async function ImoveisPage() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  const properties = (data ?? []) as DbProperty[];

  return (
    <AppShell
      title="Imóveis"
      subtitle={
        properties.length > 0
          ? `${properties.length} ${properties.length === 1 ? "imóvel" : "imóveis"}`
          : undefined
      }
      actions={<NovoImovelButton />}
    >
      {error ? (
        <div className="card-surface px-5 py-6 text-sm text-vencido" role="alert">
          Não foi possível carregar os imóveis. Recarregue a página.
        </div>
      ) : (
        <PropertyList properties={properties} />
      )}
    </AppShell>
  );
}
