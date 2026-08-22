#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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

function slug(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function findBrowser(explicit) {
  const candidates = [
    explicit,
    process.env.REALTERHUB_BROWSER,
    // Linux
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge",
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    // Windows
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);
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
    throw new Error("Uso: quotation.mjs <init|next|ingest|answer|validate|generate> --state quotation.json");
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
  // validate/generate SOLO aceptan el estado sellado (--state): un paquete
  // arbitrario vía --input saltaría el sello de integridad y permitiría
  // generar cotizaciones con datos que nunca pasaron por ingest/answer.
  const packet = await loadState(options.state);
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
  // El sufijo distingue dos cotizaciones de la MISMA unidad para el MISMO
  // cliente con planes de pago distintos — el caso de "te muestro dos opciones".
  // Sin él la segunda pisaba la primera sin decir nada. Regenerar la misma
  // cotización sí sobrescribe, que es lo que uno espera.
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ terms: packet.projectPaymentPlan?.installments ?? null, config: packet.paymentConfiguration, date: packet.document.date }))
    .digest("hex").slice(0, 6);
  const basename = `${slug(`quotation-${packet.contact.fullName}-${subjectCode}`) || "quotation"}-${fingerprint}`;
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
