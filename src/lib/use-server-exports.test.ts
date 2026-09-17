import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Next ≥ 16.3: um módulo `"use server"` só pode exportar funções async.
 * Exportar `const`/`class`/objeto derruba o módulo em runtime e todas as
 * Server Actions dele passam a cair na tela de erro. Este teste impede a
 * regressão (aconteceu com CONVITE_INITIAL_STATE em set/2026).
 */
function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(ts|tsx)$/.test(nome) && !/\.test\./.test(nome) ? [caminho] : [];
  });
}

describe("arquivos 'use server'", () => {
  it("exportam somente funções (e tipos)", () => {
    const raiz = join(process.cwd(), "src");
    const ofensores: string[] = [];
    for (const arquivo of arquivos(raiz)) {
      const src = readFileSync(arquivo, "utf8");
      if (!/^\s*["']use server["']/m.test(src.slice(0, 200))) continue;
      const ruins = src.match(/^export (const|let|var|class|default)\b.*$/gm) ?? [];
      for (const linha of ruins) ofensores.push(`${arquivo.replace(raiz, "src")}: ${linha.trim()}`);
    }
    expect(ofensores).toEqual([]);
  });
});
