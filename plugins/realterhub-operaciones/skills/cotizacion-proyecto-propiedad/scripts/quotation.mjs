#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { serialize, validatePacket } from "./lib/engine.mjs";
import { renderQuotation } from "./lib/render.mjs";
import { deterministicNext, ingestResource, initializeState, loadState, recordAnswer } from "./lib/workflow.mjs";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (!value.startsWith("--")) throw new Error(`Argumento inesperado: ${value}`);
    const [key, inline] = value.slice(2).split("=", 2);
    if (inline !== undefined) options[key] = inline;
    else if (rest[index + 1] && !rest[index + 1].startsWith("--")) options[key] = rest[++index];
    else options[key] = true;
  }
  return { command, options };
}

async function loadPacket(file) {
  if (!file) throw new Error("Falta --state <cotizacion.json>.");
  return JSON.parse(await readFile(path.resolve(file), "utf8"));
}

function slug(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function findBrowser(explicit) {
  const candidates = [explicit, process.env.REALTERHUB_BROWSER, "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge"].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function createPdf(browser, htmlPath, pdfPath) {
  const result = spawnSync(browser, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ], { encoding: "utf8", timeout: 120000 });
  if (result.error || result.status !== 0 || !existsSync(pdfPath)) {
    throw new Error(`No se pudo generar el PDF con ${browser}: ${result.error?.message || result.stderr || `código ${result.status}`}`);
  }
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!["init", "next", "ingest", "answer", "validate", "generate"].includes(command)) {
    throw new Error("Uso: quotation.mjs <init|next|ingest|answer|validate|generate> --state cotizacion.json");
  }
  if (command === "init") {
    process.stdout.write(`${serialize(await initializeState(options.state, options.date))}\n`);
    return;
  }
  if (command === "ingest") {
    process.stdout.write(`${serialize(await ingestResource(options.state, options.resource, options.input, options.select))}\n`);
    return;
  }
  if (command === "answer") {
    process.stdout.write(`${serialize(await recordAnswer(options.state, options.question, options.value))}\n`);
    return;
  }
  const packet = options.state ? await loadState(options.state) : await loadPacket(options.input);
  if (command === "next") {
    process.stdout.write(`${serialize(deterministicNext(packet))}\n`);
    return;
  }
  const validation = validatePacket(packet);
  if (command === "validate") {
    process.stdout.write(`${serialize(validation)}\n`);
    process.exitCode = validation.valid ? 0 : 2;
    return;
  }
  if (!validation.valid) {
    process.stderr.write(`${serialize(validation)}\n`);
    process.exitCode = 2;
    return;
  }

  const outputDir = path.resolve(options["output-dir"] || process.cwd());
  await mkdir(outputDir, { recursive: true });
  const subjectCode = packet.quotationType === "projectUnit" ? packet.projectUnit.code : packet.property.code;
  const basename = slug(`cotizacion-${packet.contact.fullName}-${subjectCode}`) || "cotizacion";
  const htmlPath = path.join(outputDir, `${basename}.html`);
  const html = await renderQuotation(packet);
  await writeFile(htmlPath, html, "utf8");
  const result = { html: htmlPath };
  if (!options["html-only"]) {
    const browser = findBrowser(options.browser);
    if (!browser) throw new Error("No se encontró Chrome, Chromium o Edge. Usa --html-only o define REALTERHUB_BROWSER.");
    const pdfPath = path.join(outputDir, `${basename}.pdf`);
    createPdf(browser, htmlPath, pdfPath);
    result.pdf = pdfPath;
  }
  process.stdout.write(`${serialize(result)}\n`);
}

main().catch((error) => {
  if (error.validation) process.stderr.write(`${serialize(error.validation)}\n`);
  else process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
