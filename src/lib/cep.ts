/** CEP — parte pura: normalização, máscara e montagem do endereço. */

export function somenteDigitosCep(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 8);
}

/** "01001000" -> "01001-000" (parcial enquanto digita). */
export function formatCep(raw: string): string {
  const d = somenteDigitosCep(raw);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function isCepCompleto(raw: string): boolean {
  return somenteDigitosCep(raw).length === 8;
}

export interface EnderecoCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/** "Rua Inajá, 152, Tabajara, Olinda - PE" (omite partes vazias). */
export function montarEndereco(e: EnderecoCep, numero: string, complemento = ""): string {
  const rua = [e.logradouro.trim(), numero.trim()].filter(Boolean).join(", ");
  const comp = complemento.trim();
  const cidadeUf = [e.cidade.trim(), e.uf.trim()].filter(Boolean).join(" - ");
  return [rua, comp, e.bairro.trim(), cidadeUf].filter(Boolean).join(", ");
}

/** Mapeia a resposta do ViaCEP (ou BrasilAPI) para `EnderecoCep`; `null` se não achou. */
export function mapearRespostaCep(json: unknown): EnderecoCep | null {
  if (typeof json !== "object" || json === null) return null;
  const o = json as Record<string, unknown>;
  if (o.erro === true || o.erro === "true") return null;
  const texto = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  const cidade = texto("localidade") || texto("city");
  const uf = texto("uf") || texto("state");
  if (!cidade || !uf) return null;
  return {
    logradouro: texto("logradouro") || texto("street"),
    bairro: texto("bairro") || texto("neighborhood"),
    cidade,
    uf,
  };
}
