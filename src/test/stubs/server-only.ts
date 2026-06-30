/**
 * Stub vazio de `server-only` para o ambiente de testes.
 *
 * Em produção, `import "server-only"` é resolvido pelo Next.js 16 (build time)
 * e lança se importado por código de client. No Vitest esse pacote não existe;
 * como testamos apenas funções PURAS (sem rede/banco), substituímos por um
 * módulo vazio via alias em `vitest.config.ts`.
 */
export {};
