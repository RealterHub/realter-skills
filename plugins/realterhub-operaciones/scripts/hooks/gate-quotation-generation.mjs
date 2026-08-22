#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { validatePacket } from "../../skills/cotizacion-proyecto-propiedad/scripts/lib/engine.mjs";

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

try {
  const input = await readStdin();
  const command = String(input?.tool_input?.command ?? "");
  if (!/quotation\.mjs\b/.test(command) || !/\bgenerate\b/.test(command)) exit(null);
  const match = command.match(/--(?:state|input)(?:=|\s+)(?:"([^"]+)"|'([^']+)'|([^\s]+))/);
  if (!match) deny("La generación requiere --state con un paquete JSON validable.");
  const file = path.resolve(input?.cwd || process.cwd(), match[1] || match[2] || match[3]);
  const packet = JSON.parse(await readFile(file, "utf8"));
  const validation = validatePacket(packet);
  if (!validation.valid) {
    deny(`No se puede generar una cotización inválida:\n${validation.errors.slice(0, 10).map((item) => `- ${item.path}: ${item.message}`).join("\n")}`);
  }
  exit(null);
} catch (error) {
  deny(`No se pudo validar el paquete antes de generar: ${error.message}`);
}
