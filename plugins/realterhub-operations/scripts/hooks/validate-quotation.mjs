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

try {
  const input = await readStdin();
  const file = input?.tool_input?.file_path;
  if (typeof file !== "string" || !/(^|\/)(quotation|.+\.quotation)\.json$/i.test(file)) exit(null);
  const packet = JSON.parse(await readFile(path.resolve(file), "utf8"));
  const validation = validatePacket(packet, { final: false });
  const incompleteCodes = new Set(["required", "terms_required", "unsupported_terms_shape"]);
  const getPath = (object, dotted) => dotted.split(".").reduce((value, key) => value?.[key], object);
  const actionableErrors = validation.errors.filter((item) => {
    if (incompleteCodes.has(item.code)) return false;
    if (item.code === "invalid_decimal") {
      const value = getPath(packet, item.path);
      return value !== undefined && value !== null && value !== "";
    }
    return true;
  });
  if (actionableErrors.length) {
    exit({
      decision: "block",
      reason: `El paquete de la cotización contiene datos inválidos:\n${actionableErrors.slice(0, 10).map((item) => `- ${item.path}: ${item.message}`).join("\n")}`,
    });
  }
  exit(null);
} catch {
  process.exit(0);
}
