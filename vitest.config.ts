import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Configuração da suíte de testes unitários (camada PURA).
 *
 * - `environment: "node"` — as funções sob teste são puras (sem DOM); usam
 *   apenas `node:crypto`/`Intl`, então o ambiente Node é o mais rápido e fiel.
 * - `globals: true` — habilita `describe`/`it`/`expect` sem import explícito.
 * - alias `@/` → `src/` — espelha o `paths` do tsconfig para os imports do domínio.
 * - alias `server-only` → stub vazio — em produção o Next.js 16 faz o alias
 *   deste import em build time; no Vitest ele não existe, então apontamos para
 *   um módulo vazio para que `mercadopago.ts`/`whatsapp.ts` possam ser
 *   importados e suas funções PURAS testadas sem I/O de rede.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./src/test/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
