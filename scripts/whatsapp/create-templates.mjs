#!/usr/bin/env node
/**
 * Provisiona os templates de mensagem do WhatsApp na Meta
 * (WhatsApp Business Management API). Sem dependências — usa `fetch` nativo
 * (Node >= 18).
 *
 * Uso:
 *   node scripts/whatsapp/create-templates.mjs            # cria todos
 *   node scripts/whatsapp/create-templates.mjs --list     # lista os existentes
 *   node scripts/whatsapp/create-templates.mjs --dry-run  # imprime os payloads
 *
 * Variáveis (do ambiente ou de .env.local na raiz do projeto):
 *   WHATSAPP_TOKEN    token do system user com permissão whatsapp_business_management
 *   WHATSAPP_WABA_ID  id da WhatsApp Business Account (NÃO é o phone number id)
 *
 * Os templates ficam em PENDING até a Meta aprovar (UTILITY costuma ser rápido).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GRAPH_VERSION = "v21.0";
const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, "..", "..");

/** Carrega .env.local (KEY=VALUE por linha) sem sobrescrever o ambiente. */
function carregarEnvLocal() {
  try {
    const txt = readFileSync(join(projectRoot, ".env.local"), "utf8");
    for (const linha of txt.split("\n")) {
      const t = linha.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim();
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    // sem .env.local — segue só com o ambiente
  }
}

function lerTemplates() {
  return JSON.parse(readFileSync(join(here, "templates.json"), "utf8"));
}

async function listar(token, waba) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${waba}/message_templates?fields=name,status,category,language&limit=100`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Erro ao listar:", JSON.stringify(json, null, 2));
    process.exit(1);
  }
  const data = json.data ?? [];
  if (data.length === 0) {
    console.log("Nenhum template encontrado nesta WABA.");
    return;
  }
  console.log(`Templates na WABA (${data.length}):`);
  for (const t of data) {
    console.log(`  - ${t.name}  [${t.language}]  ${t.category}  -> ${t.status}`);
  }
}

async function criar(token, waba, template) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${waba}/message_templates`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(template),
  });
  const json = await res.json().catch(() => ({}));

  if (res.ok) {
    console.log(
      `  OK  ${template.name}: criado (id ${json.id ?? "?"}, status ${json.status ?? "PENDING"})`,
    );
    return "ok";
  }

  const err = json.error ?? {};
  const msg = String(err.message ?? "").toLowerCase();
  if (
    err.code === 100 &&
    (msg.includes("already exists") || err.error_subcode === 2388023)
  ) {
    console.log(`  ··  ${template.name}: já existe — pulando`);
    return "skip";
  }

  console.error(`  ERRO ${template.name}: ${err.message ?? res.status}`);
  console.error("       detalhe:", JSON.stringify(json, null, 2));
  return "fail";
}

async function main() {
  carregarEnvLocal();
  const args = new Set(process.argv.slice(2));
  const templates = lerTemplates();

  if (args.has("--dry-run")) {
    console.log(JSON.stringify(templates, null, 2));
    return;
  }

  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!token || !waba) {
    console.error(
      "Faltam variáveis: defina WHATSAPP_TOKEN e WHATSAPP_WABA_ID (em .env.local ou no ambiente).",
    );
    process.exit(1);
  }

  if (args.has("--list")) {
    await listar(token, waba);
    return;
  }

  console.log(`Criando ${templates.length} templates na WABA ${waba}...\n`);
  const resultados = [];
  for (const t of templates) {
    resultados.push(await criar(token, waba, t));
  }
  const ok = resultados.filter((r) => r === "ok").length;
  const skip = resultados.filter((r) => r === "skip").length;
  const fail = resultados.filter((r) => r === "fail").length;
  console.log(
    `\nResumo: ${ok} criados, ${skip} já existiam, ${fail} falharam.`,
  );
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
