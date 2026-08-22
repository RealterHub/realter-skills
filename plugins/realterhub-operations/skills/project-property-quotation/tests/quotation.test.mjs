import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { calculateQuotation, nextStep, validatePacket } from "../scripts/lib/engine.mjs";
import { QUOTATION_DISCLAIMER, renderQuotation } from "../scripts/lib/render.mjs";
import { deterministicNext, ingestResource, initializeState, loadState, recordAnswer } from "../scripts/lib/workflow.mjs";

const ids = {
  contact: "10000000-0000-4000-8000-000000000001",
  project: "20000000-0000-4000-8000-000000000002",
  unit: "30000000-0000-4000-8000-000000000003",
  plan: "40000000-0000-4000-8000-000000000004",
  property: "50000000-0000-4000-8000-000000000005",
  offering: "60000000-0000-4000-8000-000000000006",
};

const common = () => ({
  schemaVersion: 1,
  document: { date: "2026-01-15", locale: "es-DO", title: "Cotización" },
  organization: { name: "Organización Demo", logoUrl: null },
  collaborator: { fullName: "Asesor Demo" },
  contact: { id: ids.contact, fullName: "Cliente Demo" },
  paymentConfiguration: { reservationApplication: "creditAgainstSigning", constructionMethod: "monthlyUntilTarget" },
});

const projectPacket = () => ({
  ...common(),
  quotationType: "projectUnit",
  project: { id: ids.project, name: "Proyecto Demo", code: "PD", currency: "USD", estimatedHandoverDate: "2026-11-20" },
  projectUnit: { id: ids.unit, code: "A-101", basePrice: "100000.00", status: "available", unitType: "Apartamento", totalArea: "88", measurementUnit: "m²" },
  projectPaymentPlan: {
    id: ids.plan,
    name: "Plan estándar",
    currency: "USD",
    status: "active",
    installments: [
      { position: 1, milestoneType: "reservation", amountType: "fixed", amountValue: "3000.00" },
      { position: 2, milestoneType: "contractSigning", amountType: "percentage", amountValue: "20.00" },
      { position: 3, milestoneType: "constructionPayment", amountType: "percentage", amountValue: "30.00" },
      { position: 4, milestoneType: "closing", amountType: "percentage", amountValue: "50.00" },
    ],
  },
});

const propertyPacket = () => ({
  ...common(),
  quotationType: "readyProperty",
  property: { id: ids.property, name: "Residencia Demo", code: "RD-1", propertyType: "house", propertySubtype: "detached", areas: "total:240 m2 | built:180 m2 | carpet:165 m2 | superBuilt:195 m2 | lot:320 m2", availability: "available" },
  propertyOffering: { id: ids.offering, offeringType: "sale", status: "active", price: "100000.00", currency: "USD", isNegotiable: true },
  paymentConfiguration: {
    ...common().paymentConfiguration,
    reservationAmount: "3000.00",
    signingPercentage: "20.00",
    constructionPercentage: "30.00",
    closingPercentage: "50.00",
    targetDate: "2026-11-20",
  },
});

test("projects monthly payments and credits the reservation when configured", () => {
  const result = calculateQuotation(projectPacket());
  assert.equal(result.kind, "projectUnit");
  assert.equal(result.constructionCount, 8);
  assert.equal(result.constructionPaymentMinor, 375000n);
  assert.equal(result.installments[1].amountMinor, 1700000n);
  assert.equal(result.scheduledMinor, result.priceMinor);
});

test("uses the active sale offering for a ready-property quotation", () => {
  const result = calculateQuotation(propertyPacket());
  assert.equal(result.kind, "readyProperty");
  assert.equal(result.subjectCode, "RD-1");
  assert.equal(result.scheduledMinor, result.priceMinor);
});

test("uses the property name as the quotation heading and never its title", async () => {
  const packet = propertyPacket();
  packet.property.title = "Título promocional que no corresponde";
  const html = await renderQuotation(packet);

  assert.match(html, /<h2>Residencia Demo<\/h2>/);
  assert.match(html, /<dt>Superficie<\/dt><dd>240 m²<\/dd>/);
  assert.doesNotMatch(html, /Título promocional que no corresponde/);
});

test("ingests the compact property areas from get_property and discards title", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "realterhub-property-ingest-"));
  const state = path.join(directory, "quotation.json");
  const context = path.join(directory, "context.json");
  const contact = path.join(directory, "contact.json");
  const property = path.join(directory, "property.json");

  try {
    await writeFile(context, JSON.stringify({ organization: { name: "Organización Demo" }, collaborator: { fullName: "Asesor Demo" } }));
    await writeFile(contact, JSON.stringify({ id: ids.contact, name: "Cliente Demo" }));
    await writeFile(property, JSON.stringify({
      id: ids.property,
      name: "Residencia desde name",
      title: "Título promocional descartado",
      code: "RD-1",
      propertyType: "house",
      propertySubtype: "detached",
      areas: "total:240 m2 | built:180 m2 | carpet:165 m2 | superBuilt:195 m2 | lot:320 m2",
    }));

    await initializeState(state, "2026-01-15");
    await ingestResource(state, "connectionContext", context);
    await ingestResource(state, "contact", contact);
    await recordAnswer(state, "select_quotation_type", "readyProperty");
    await ingestResource(state, "property", property);

    const packet = await loadState(state);
    assert.deepEqual(packet.property, {
      id: ids.property,
      name: "Residencia desde name",
      code: "RD-1",
      propertyType: "house",
      propertySubtype: "detached",
      areas: "total:240 m2 | built:180 m2 | carpet:165 m2 | superBuilt:195 m2 | lot:320 m2",
    });
    assert.equal(packet.property.title, undefined);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("distributes residual cents across installments without exposing a variance", async () => {
  const packet = projectPacket();
  packet.projectUnit.basePrice = "175000.00";
  packet.project.estimatedHandoverDate = "2026-12-20";
  const result = calculateQuotation(packet);
  const construction = result.installments.filter((item) => item.kind === "construction");
  assert.equal(result.constructionCount, 9);
  assert.equal(result.constructionPaymentMinor, 583333n);
  assert.equal(result.constructionRemainderMinor, 3n);
  assert.deepEqual(construction.map((item) => item.amountMinor), [583334n, 583334n, 583334n, 583333n, 583333n, 583333n, 583333n, 583333n, 583333n]);
  assert.equal(result.scheduledMinor, result.priceMinor);
  assert.equal(result.varianceMinor, 0n);

  const html = await renderQuotation(packet);
  assert.doesNotMatch(html, /Coincide con el precio cotizado/);
  assert.doesNotMatch(html, /Redondeo:/);
});

test("keeps a reservation separate only when the percentages reconcile", () => {
  const packet = propertyPacket();
  packet.paymentConfiguration.reservationApplication = "standalone";
  packet.paymentConfiguration.closingPercentage = "47.00";
  const result = calculateQuotation(packet);
  assert.equal(result.installments[1].amountMinor, 2000000n);
  assert.equal(result.scheduledMinor, result.priceMinor);
});

test("rejects a separate reservation when it would exceed the quoted price", () => {
  const packet = propertyPacket();
  packet.paymentConfiguration.reservationApplication = "standalone";
  const validation = validatePacket(packet);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.code === "unreconciled_configuration"));
});

test("asks how to apply the fixed reservation", () => {
  const packet = projectPacket();
  delete packet.paymentConfiguration.reservationApplication;
  const next = nextStep(packet);
  assert.equal(next.readyForValidation, false);
  assert.ok(next.questions.some((item) => item.code === "configure_reservation_application"));
});

test("programmatically asks for reventa payment inputs", () => {
  const packet = propertyPacket();
  delete packet.paymentConfiguration.signingPercentage;
  delete packet.paymentConfiguration.targetDate;
  const next = nextStep(packet);
  assert.deepEqual(next.questions.map((item) => item.code).slice(0, 2), ["signing_percentage", "target_date"]);
});

test("rejects a payment structure that cannot use the verified formula", () => {
  const packet = projectPacket();
  packet.projectPaymentPlan.installments.push({ position: 5, milestoneType: "postDelivery", amountType: "fixed", amountValue: "500.00" });
  const validation = validatePacket(packet);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.code === "unsupported_terms_shape"));
});

test("ingests the real get_current_context payload (me + MCP envelope)", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "realterhub-quotation-"));
  const state = path.join(directory, "quotation.json");
  const rawContext = path.join(directory, "context.json");
  try {
    await initializeState(state, "2026-01-15");
    // Respuesta MCP completa y sin modificar, con el contrato embarcado por
    // RealterHub: content de texto + structuredContent, colaborador en `me`.
    const payload = {
      organization: {
        name: "Inmobiliaria Aurora",
        legalName: "Aurora SRL",
        logoUrl: "https://cdn.example.com/aurora.png",
        preferredLanguage: "es-CO",
      },
      me: {
        id: "70000000-0000-4000-8000-000000000007",
        fullName: "Ana Gómez",
        collaboratorType: "agent",
        avatarUrl: null,
        language: null,
      },
    };
    await writeFile(rawContext, JSON.stringify({
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    }));
    await ingestResource(state, "connectionContext", rawContext);
    const saved = JSON.parse(await readFile(state, "utf8"));
    assert.equal(saved.organization.name, "Inmobiliaria Aurora");
    assert.equal(saved.organization.logoUrl, "https://cdn.example.com/aurora.png");
    assert.equal(saved.collaborator.fullName, "Ana Gómez");
    // me.language null → cae al preferredLanguage de la organización, resuelto
    // por el script (jamás por el LLM); el formato de fechas/números lo sigue.
    assert.equal(saved.document.locale, "es-CO");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("exposes only one deterministic transition at a time", () => {
  const next = deterministicNext({ schemaVersion: 1, document: { date: "2026-01-15" }, paymentConfiguration: {} });
  assert.equal(next.status, "tool_required");
  assert.equal(next.action.resource, "connectionContext");
  assert.equal(Object.hasOwn(next, "question"), false);
});

test("the workflow owns state changes and rejects out-of-order answers", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "realterhub-quotation-"));
  const state = path.join(directory, "quotation.json");
  const rawContext = path.join(directory, "context.json");
  const rawContact = path.join(directory, "contact.json");
  try {
    await initializeState(state, "2026-01-15");
    await assert.rejects(() => recordAnswer(state, "select_quotation_type", "projectUnit"), /no es la siguiente pregunta/);
    await writeFile(rawContext, JSON.stringify({ organization: { name: "Organización Demo" }, collaborator: { fullName: "Asesor Demo" } }));
    await ingestResource(state, "connectionContext", rawContext);
    const saved = JSON.parse(await readFile(state, "utf8"));
    assert.equal(saved.organization.name, "Organización Demo");
    assert.equal(deterministicNext(saved).action.resource, "contact");
    await writeFile(rawContact, JSON.stringify({
      id: ids.contact,
      fullName: "Diana Peralta",
      mainEmail: "diana.peralta.e2e@example.com",
      phoneNumber: "+573219242697",
    }));
    await ingestResource(state, "contact", rawContact);
    const withContact = JSON.parse(await readFile(state, "utf8"));
    assert.equal(withContact.contact.email, "diana.peralta.e2e@example.com");
    assert.equal(withContact.contact.phone, "+573219242697");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects direct changes to a sealed quotation state", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "realterhub-quotation-integrity-"));
  const state = path.join(directory, "quotation.json");
  try {
    await initializeState(state, "2026-01-15");
    const packet = JSON.parse(await readFile(state, "utf8"));
    packet.organization = { name: "Editada directamente" };
    await writeFile(state, JSON.stringify(packet));
    await assert.rejects(() => loadState(state), /modificado fuera del flujo permitido/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("renders a secondary browser canvas, centered porcelain sheet and full porcelain print", async () => {
  const packet = projectPacket();
  packet.projectPaymentPlan.name = "Nombre interno del plan";
  packet.projectPaymentPlan.description = "Descripción redundante del plan";
  const html = await renderQuotation(packet);
  assert.match(html, /--porcelain: #FFFDF9/);
  assert.match(html, /--navy: #061B2D/);
  assert.match(html, /--green: #A1CE82/);
  assert.match(html, /--warning: oklch\(0\.58 0\.17 56\.63\)/);
  assert.match(html, /--info: oklch\(0\.5366 0\.2575 262\.47\)/);
  assert.match(html, /--white: oklch\(100% 0 0\)/);
  assert.match(html, /--neutral-elevated: oklch\(0\.966 0 0\)/);
  assert.match(html, /--radius-sm: 12px/);
  assert.match(html, /--shadow-xs: 0 1px 2px rgb\(0 0 0 \/ 0\.05\)/);
  assert.match(html, /Schibsted Grotesk/);
  assert.match(html, /html, body \{ background: var\(--navy\); \}/);
  assert.match(html, /\.page \{ width: 210mm; min-height: 297mm; margin: 18px auto;[^}]+background: var\(--porcelain\)/);
  assert.match(html, /@page \{ size: A4; margin: 0; background: #FFFDF9; \}/);
  assert.match(html, /html, body, \.page \{ background: var\(--porcelain\) !important; \}/);
  assert.ok(html.includes(QUOTATION_DISCLAIMER));
  assert.match(html, /Generado con Tecnología <a class="realterhub-link" href="https:\/\/realterhub\.com"[^>]*><span class="realterhub-realter">Realter<\/span><span class="realterhub-hub">Hub<\/span><\/a>/);
  assert.match(html, /\.realterhub-link \{ font-weight: 650;/);
  assert.match(html, /\.realterhub-realter \{ color: var\(--navy\); \}/);
  assert.match(html, /\.realterhub-hub \{ color: var\(--green\); \}/);
  assert.match(html, /Vender más\. Operar menos\. Cobrar antes\./);
  assert.match(html, /<span>Pagos a realizar<\/span>/);
  assert.match(html, /<dl class="subject-facts"><dt>Tipo<\/dt><dd>Apartamento<\/dd><dt>Superficie<\/dt><dd>88 m²<\/dd><\/dl>/);
  assert.doesNotMatch(html, /class="details"|<h3>Cliente<\/h3>|Inmueble cotizado/);
  assert.match(html, /<a class="projection-link" href="#payment-projection">Ver proyección abajo<\/a>/);
  assert.match(html, /\.projection-link \{ color: var\(--info\); text-decoration: none; \}/);
  assert.doesNotMatch(html, /realterhub-logo/);
  assert.doesNotMatch(html, /subject-image/);
  assert.doesNotMatch(html, /linear-gradient/);
  assert.match(html, /<section><h2>Condiciones de pago<\/h2><table>/);
  assert.match(html, /table \{[^}]+background: var\(--white\);[^}]+border: 1px solid var\(--neutral-elevated\);[^}]+border-radius: var\(--radius-sm\);[^}]+box-shadow: var\(--shadow-xs\);/);
  assert.doesNotMatch(html, /Nombre interno del plan|Descripción redundante del plan/);
  assert.doesNotMatch(html, /Cuota \d+ de \d+|>Hito<|class="basis"/);
  assert.match(html, /\.disclaimer \{[^}]+background: var\(--warning\);[^}]+border-radius: 3mm;/);
  assert.doesNotMatch(html, /\.disclaimer \{[^}]+border-left:/);
  assert.match(html, /<section id="payment-projection" class="projection-section"><h2>Proyección de pagos<\/h2><table class="projection-table"><thead><tr><th>Concepto<\/th><th>Fecha<\/th><th>Monto<\/th><\/tr>/);
  assert.match(html, /\.projection-section \{ break-before: page; page-break-before: always;/);
  assert.doesNotMatch(html, /<th>#<\/th>|class="position"/);
});
