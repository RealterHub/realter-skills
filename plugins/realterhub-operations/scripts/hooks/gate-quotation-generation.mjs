#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { validatePacket } from "../../skills/project-property-quotation/scripts/lib/engine.mjs";

async function readStdin() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function exit(payload) {
  if (payload) process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}

function deny(reason) {
  exit({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } });
}

function unquote(match) {
  return match[1] || match[2] || match[3];
}

const input = await readStdin();
const command = String(input?.tool_input?.command ?? "");
if (!/quotation\.mjs\b/.test(command) || !/\bgenerate\b/.test(command)) exit(null);
const stateMatch = command.match(/--state(?:=|\s+)(?:"([^"]+)"|'([^']+)'|([^\s]+))/);
if (!stateMatch) deny("La generación requiere --state con el estado sellado de la cotización.");
// Un `cd <dir> &&` inicial cambia el directorio contra el que resolver --state.
const cdMatch = command.match(/^\s*cd\s+(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))\s*(?:&&|;)/);
const base = cdMatch
  ? path.resolve(input?.cwd || process.cwd(), unquote(cdMatch))
  : input?.cwd || process.cwd();
const file = path.resolve(base, unquote(stateMatch));

let packet;
try {
  packet = JSON.parse(await readFile(file, "utf8"));
} catch {
  // No se pudo localizar/leer el estado desde el hook (cwd distinto, ruta
  // relativa compleja). NO bloquear: quotation.mjs generate re-valida el
  // paquete y verifica el sello de integridad por sí mismo — este gate solo
  // existe para ahorrar una ejecución fallida cuando el paquete es legible
  // e inválido.
  exit(null);
}
try {
  const validation = validatePacket(packet);
  if (!validation.valid) {
    deny(`No se puede generar una cotización inválida:\n${validation.errors.slice(0, 10).map((item) => `- ${item.path}: ${item.message}`).join("\n")}`);
  }
  exit(null);
} catch (error) {
  deny(`No se pudo validar el paquete antes de generar: ${error.message}`);
}
