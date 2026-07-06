/**
 * Acesso validado a variáveis de ambiente via zod.
 *
 * Validação LAZY: os schemas só são avaliados na 1ª chamada de `serverEnv()` /
 * `publicEnv()` em runtime — NUNCA no import. Isso evita que `next build`
 * quebre em ambientes sem secrets (CI, build de preview).
 *
 * `serverEnv()` só pode ser chamado em código server-only (route handlers,
 * server actions, cron, webhooks). NUNCA importe a partir de um arquivo
 * `'use client'` — exporia secrets ao bundle do browser.
 */

import { z } from "zod";

const serverSchema = z.object({
  MP_ACCESS_TOKEN: z.string().min(1),
  MP_WEBHOOK_SECRET: z.string().min(1),
  WHATSAPP_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_APP_SECRET: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_BASE_URL: z.string().url(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

let serverCache: ServerEnv | null = null;
let publicCache: PublicEnv | null = null;
let serviceRoleKeyCache: string | null = null;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

/**
 * Variáveis server-only (secrets). Lança erro claro se faltar alguma.
 * Resultado é memoizado após a 1ª chamada.
 */
export function serverEnv(): ServerEnv {
  if (serverCache) return serverCache;

  const parsed = serverSchema.safeParse({
    MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN,
    MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET,
    WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
    WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_BASE_URL: process.env.APP_BASE_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente server inválidas/ausentes: ${formatIssues(parsed.error)}`,
    );
  }

  serverCache = parsed.data;
  return serverCache;
}

/**
 * Apenas a `SUPABASE_SERVICE_ROLE_KEY`, validada isoladamente.
 *
 * Ler o banco com service role NÃO deve exigir as secrets de MP/WhatsApp: uma
 * página pública (ex.: pagamento do inquilino) só precisa do Supabase. Usar
 * `serverEnv()` aqui acoplaria a página a secrets não relacionadas e a faria
 * quebrar se qualquer uma faltasse. Resultado memoizado após a 1ª chamada.
 */
export function supabaseServiceRoleKey(): string {
  if (serviceRoleKeyCache) return serviceRoleKeyCache;

  const parsed = z
    .object({ SUPABASE_SERVICE_ROLE_KEY: z.string().min(1) })
    .safeParse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

  if (!parsed.success) {
    throw new Error(
      `Variável de ambiente inválida/ausente: ${formatIssues(parsed.error)}`,
    );
  }

  serviceRoleKeyCache = parsed.data.SUPABASE_SERVICE_ROLE_KEY;
  return serviceRoleKeyCache;
}

/**
 * Variáveis públicas (expostas ao client via prefixo NEXT_PUBLIC_).
 * Resultado é memoizado após a 1ª chamada.
 */
export function publicEnv(): PublicEnv {
  if (publicCache) return publicCache;

  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente públicas inválidas/ausentes: ${formatIssues(parsed.error)}`,
    );
  }

  publicCache = parsed.data;
  return publicCache;
}
