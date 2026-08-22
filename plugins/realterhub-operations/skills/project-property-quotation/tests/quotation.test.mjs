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

test("keeps every installment identical and leaves the truncated residue unassigned", async () => {
  const packet = projectPacket();
  packet.projectUnit.basePrice = "175000.00";
  packet.project.estimatedHandoverDate = "2026-12-20";
  const result = calculateQuotation(packet);
  const construction = result.installments.filter((item) => item.kind === "construction");
  assert.equal(result.constructionCount, 9);
  assert.equal(result.constructionPaymentMinor, 583333n);
  // Todas iguales, como en los contratos reales de RD: 52.500,00 / 9 deja
  // 3 centavos sin asignar en vez de inflar las tres primeras cuotas.
  assert.deepEqual(construction.map((item) => item.amountMinor), Array(9).fill(583333n));
  assert.equal(result.residueMinor, 3n);
  assert.equal(result.constructionRemainderMinor, 3n);
  assert.equal(result.scheduledMinor, result.priceMinor - 3n);
  // El residuo está acotado por construcción: 0 <= residuo < cantidad de cuotas.
  assert.ok(result.residueMinor < BigInt(result.constructionCount));
  assert.equal(result.varianceMinor, 0n);

  // El documento declara la diferencia: dos totales que no coinciden y sin
  // explicación es lo que hace que un cliente desconfíe de la cotización.
  const html = await renderQuotation(packet);
  assert.match(html, /<p class="reconciliation">/);
  assert.match(html, /la diferencia con el precio cotizado es de USD 0\.03\./);
  assert.doesNotMatch(html, /Coincide con el precio cotizado/);

  // Y cuando el tramo divide exacto, no hay nota que dar.
  const exact = await renderQuotation(projectPacket());
  assert.equal(calculateQuotation(projectPacket()).residueMinor, 0n);
  assert.doesNotMatch(exact, /<p class="reconciliation">/);
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

// Las cuatro formas siguientes existen en producción y la versión anterior las
// rechazaba con `unsupported_terms_shape`. El plan que llega manda: el motor no
// impone una estructura comercial.

test("quotes a plan with no construction tranche (10/90)", () => {
  const packet = projectPacket();
  packet.projectPaymentPlan.installments = [
    { position: 1, milestoneType: "reservation", amountType: "fixed", amountValue: "5000.00" },
    { position: 2, milestoneType: "contractSigning", amountType: "percentage", amountValue: "10.00" },
    { position: 3, milestoneType: "closing", amountType: "percentage", amountValue: "90.00" },
  ];
  const result = calculateQuotation(packet);
  assert.equal(result.constructionCount, 0);
  assert.deepEqual(result.installments.map((item) => item.kind), ["reservation", "contractSigning", "closing"]);
  assert.equal(result.installments[1].amountMinor, 500000n); // 10% menos la reserva acreditada
  assert.equal(result.scheduledMinor, result.priceMinor);
});

test("quotes a plan with no reservation at all", () => {
  const packet = projectPacket();
  packet.projectPaymentPlan.installments = [
    { position: 1, milestoneType: "promissoryAgreement", amountType: "percentage", amountValue: "20.00" },
    { position: 2, milestoneType: "constructionPayment", amountType: "percentage", amountValue: "30.00" },
    { position: 3, milestoneType: "closing", amountType: "percentage", amountValue: "50.00" },
  ];
  const result = calculateQuotation(packet);
  assert.equal(result.constructionCount, 8);
  assert.equal(result.installments[0].amountMinor, 2000000n); // firma completa: no hay reserva que descontar
  assert.equal(result.scheduledMinor, result.priceMinor);
  // Sin línea de reserva, el flujo no pregunta cómo aplicarla.
  assert.ok(!nextStep(packet).questions.some((item) => item.code === "configure_reservation_application"));
});

test("quotes a plan whose last milestone is postDelivery instead of closing", () => {
  const packet = projectPacket();
  packet.paymentConfiguration.postDeliveryMonths = "4";
  packet.projectPaymentPlan.installments = [
    { position: 1, milestoneType: "reservation", amountType: "fixed", amountValue: "3000.00" },
    { position: 2, milestoneType: "contractSigning", amountType: "percentage", amountValue: "20.00" },
    { position: 3, milestoneType: "constructionPayment", amountType: "percentage", amountValue: "30.00" },
    { position: 4, milestoneType: "postDelivery", amountType: "percentage", amountValue: "50.00" },
  ];
  const result = calculateQuotation(packet);
  const post = result.installments.filter((item) => item.kind === "postDelivery");
  assert.equal(post.length, 4);
  assert.equal(post[0].amountMinor, 1250000n); // 50.000,00 / 4
  assert.equal(post[0].dueDate, "2026-12-01"); // el mes siguiente a la entrega
  assert.equal(result.scheduledMinor, result.priceMinor);
});

test("resolves a percentage reservation as its own slice of the price", () => {
  const packet = projectPacket();
  packet.paymentConfiguration.reservationApplication = "standalone";
  packet.projectPaymentPlan.installments = [
    { position: 1, milestoneType: "reservation", amountType: "percentage", amountValue: "10.00" },
    { position: 2, milestoneType: "contractSigning", amountType: "percentage", amountValue: "20.00" },
    { position: 3, milestoneType: "constructionPayment", amountType: "percentage", amountValue: "40.00" },
    { position: 4, milestoneType: "closing", amountType: "percentage", amountValue: "30.00" },
  ];
  const result = calculateQuotation(packet);
  // Antes la reserva se leía SIEMPRE como monto: "10.00" valía 10 dólares.
  assert.equal(result.installments[0].amountMinor, 1000000n);
  assert.equal(result.scheduledMinor, result.priceMinor);
});

test("asks for the tranche date when no monthly installment fits, instead of choosing one", () => {
  const packet = projectPacket();
  packet.project.estimatedHandoverDate = "2026-02-20";

  // El motor no inventa ni la cantidad de pagos ni la fecha: la pide.
  const question = nextStep(packet).questions.find((item) => item.code === "construction_payment_date");
  assert.ok(question);
  assert.equal(question.writes, "paymentConfiguration.constructionPaymentDate");
  const validation = validatePacket(packet);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.path === "paymentConfiguration.constructionPaymentDate"));

  // Con la fecha que puso el asesor, la cotización sale.
  packet.paymentConfiguration.constructionPaymentDate = "2026-02-10";
  const result = calculateQuotation(packet);
  assert.equal(result.constructionCount, 1);
  assert.equal(result.installments.find((item) => item.kind === "construction").dueDate, "2026-02-10");
  assert.equal(result.scheduledMinor, result.priceMinor);
});

test("refuses to place a milestone it has no date rule for", () => {
  const packet = projectPacket();
  packet.projectPaymentPlan.installments = [
    { position: 1, milestoneType: "contractSigning", amountType: "percentage", amountValue: "20.00" },
    { position: 2, milestoneType: "other", amountType: "percentage", amountValue: "30.00" },
    { position: 3, milestoneType: "closing", amountType: "percentage", amountValue: "50.00" },
  ];
  // Poner un `other` en la fecha de entrega sería inventar un plan que nadie pactó.
  assert.throws(() => calculateQuotation(packet), /No hay regla de fecha para el hito "other"/);
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

// ─── Regresiones del QA adversarial ────────────────────────────────────────
// Cada uno reproduce un hallazgo real. Varios se dispararon con datos de
// producción, no con casos de laboratorio.

test("credits the reservation against the next payment, not against a milestone named 'signing'", () => {
  // Plan real de producción (PR-038 "Paseo La Arboleda", 20/80): reserva fija,
  // tramo de obra y cierre, SIN hito de firma. Antes la reserva no se acreditaba
  // nunca y el total daba siempre precio + reserva: era incotizable.
  const packet = projectPacket();
  packet.projectPaymentPlan.installments = [
    { position: 1, milestoneType: "reservation", amountType: "fixed", amountValue: "200.00" },
    { position: 2, milestoneType: "constructionPayment", amountType: "percentage", amountValue: "20.00" },
    { position: 3, milestoneType: "closing", amountType: "percentage", amountValue: "80.00" },
  ];
  const result = calculateQuotation(packet);
  // Concilia: antes daba precio + 200.00 y validate rechazaba siempre.
  assert.equal(result.scheduledMinor + result.differenceMinor, result.priceMinor);
  // El destino del crédito acá es el tramo de obra (no hay firma), así que la
  // reserva se descuenta del total de ese tramo, repartido entre sus cuotas.
  const construction = result.installments.filter((item) => item.kind === "construction");
  const constructionTotal = construction.reduce((sum, item) => sum + item.amountMinor, 0n);
  assert.equal(constructionTotal + result.differenceMinor, 2000000n - 20000n); // 20% − reserva
  assert.equal(result.installments[0].amountMinor, 20000n); // la reserva sí se cobra
});

test("validate and calculate agree: no packet validates and then throws", () => {
  // 33.33+33.33+33.34 suman 100 pero el redondeo half-up por línea deja 1
  // centavo de deriva. Antes validate lo toleraba y calculate exigía cero.
  const packet = projectPacket();
  packet.projectUnit.basePrice = "100000.02";
  packet.projectPaymentPlan.installments = [
    { position: 1, milestoneType: "contractSigning", amountType: "percentage", amountValue: "33.33" },
    { position: 2, milestoneType: "constructionPayment", amountType: "percentage", amountValue: "33.33" },
    { position: 3, milestoneType: "closing", amountType: "percentage", amountValue: "33.34" },
  ];
  assert.equal(validatePacket(packet).valid, true);
  assert.doesNotThrow(() => calculateQuotation(packet));
});

test("rejects a handover date earlier than the quotation", () => {
  // Dato real: un proyecto en `delivery` con handover de hace dos años producía
  // un documento con el pago más grande fechado antes que los anteriores.
  const packet = projectPacket();
  packet.project.estimatedHandoverDate = "2024-08-30";
  packet.paymentConfiguration.constructionPaymentDate = "2024-08-01";
  assert.ok(validatePacket(packet).errors.some((error) => error.code === "target_before_quotation"));
});

test("rejects calendar dates that do not exist", () => {
  // Date.parse hace rollover silencioso: 2027 no es bisiesto.
  const packet = projectPacket();
  packet.project.estimatedHandoverDate = "2027-02-29";
  assert.ok(validatePacket(packet).errors.some((error) => error.code === "invalid_date"));
});

test("bounds postDeliveryMonths instead of crashing on absurd values", () => {
  const withPostDelivery = (months) => {
    const packet = projectPacket();
    packet.paymentConfiguration.postDeliveryMonths = months;
    packet.projectPaymentPlan.installments = [
      { position: 1, milestoneType: "contractSigning", amountType: "percentage", amountValue: "20.00" },
      { position: 2, milestoneType: "constructionPayment", amountType: "percentage", amountValue: "30.00" },
      { position: 3, milestoneType: "postDelivery", amountType: "percentage", amountValue: "50.00" },
    ];
    return packet;
  };
  // "0" daba `RangeError: Division by zero`; 20 dígitos, `Invalid time value`.
  // Ambos crudos, sin `.validation`, desde dentro de calculateQuotation.
  assert.equal(validatePacket(withPostDelivery("0")).valid, false);
  assert.equal(validatePacket(withPostDelivery("99999999999999999999")).valid, false);
  assert.equal(validatePacket(withPostDelivery("36")).valid, true);
});

test("orders the projection chronologically even when closing precedes postDelivery", () => {
  // "El cierre va último" es una regla de POSICIÓN comercial; temporalmente el
  // tramo post-entrega vence después. El cronograma salía desordenado.
  const packet = projectPacket();
  packet.paymentConfiguration.postDeliveryMonths = "3";
  packet.projectPaymentPlan.installments = [
    { position: 1, milestoneType: "reservation", amountType: "fixed", amountValue: "3000.00" },
    { position: 2, milestoneType: "contractSigning", amountType: "percentage", amountValue: "20.00" },
    { position: 3, milestoneType: "postDelivery", amountType: "percentage", amountValue: "30.00" },
    { position: 4, milestoneType: "closing", amountType: "percentage", amountValue: "50.00" },
  ];
  const dates = calculateQuotation(packet).installments.map((item) => item.dueDate);
  assert.deepEqual(dates, [...dates].sort());
});

test("refuses to emit installments worth nothing", () => {
  const packet = projectPacket();
  packet.projectUnit.basePrice = "1.00";
  packet.project.estimatedHandoverDate = "2056-11-20";
  packet.projectPaymentPlan.installments = [
    { position: 1, milestoneType: "contractSigning", amountType: "percentage", amountValue: "20.00" },
    { position: 2, milestoneType: "constructionPayment", amountType: "percentage", amountValue: "30.00" },
    { position: 3, milestoneType: "closing", amountType: "percentage", amountValue: "50.00" },
  ];
  assert.throws(() => calculateQuotation(packet), (error) => error.validation?.errors[0].code === "zero_installment");
});

test("never substitutes a template token that arrived inside external data", async () => {
  // `escapeHtml` no escapa llaves y `replaceTokens` sustituía en cascada: una
  // organización llamada "{{BASE_PRICE}}" terminaba mostrando el precio, y
  // "{{PROJECTION_ROWS}}" metía la tabla de pagos dentro del <h1>.
  const packet = projectPacket();
  packet.organization.name = "{{BASE_PRICE}}";
  packet.contact.fullName = "{{PROJECTION_ROWS}}";
  const html = await renderQuotation(packet);
  assert.match(html, /<h1>\{\{BASE_PRICE\}\}<\/h1>/);
  assert.doesNotMatch(html.match(/<h1>[\s\S]*?<\/h1>/)[0], /<tr>/);
});

test("accepts a real base64 logo instead of always falling back to initials", async () => {
  // La rama del `data:` vivía en el `catch` de `new URL()`, que para un `data:`
  // válido nunca lanza: era código inalcanzable.
  const packet = projectPacket();
  packet.organization.logoUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  assert.match(await renderQuotation(packet), /<img[^>]*class="organization-logo"/);
  packet.organization.logoUrl = "javascript:alert(1)";
  assert.doesNotMatch(await renderQuotation(packet), /<img[^>]*class="organization-logo"/);
});

test("asks for the delivery date instead of blocking when the project has none", () => {
  // 7 de 30 planes activos de producción viven en proyectos sin
  // `estimated_handover_date`. El motor lo trataba como una ACCIÓN
  // (`get_development_project`) que nunca podía resolverse porque el dato no
  // existe en la base: el flujo quedaba pidiendo el detalle en loop. Uno de esos
  // proyectos está en `underConstruction` — en obra y sin poder cotizarse.
  const packet = projectPacket();
  delete packet.project.estimatedHandoverDate;
  packet.paymentConfiguration = {};

  const step = nextStep(packet);
  assert.equal(step.actions.length, 0, "no debe quedar ninguna acción irresoluble");
  // Y no pide la FECHA: pide lo único que hace falta para proyectar, que es
  // cuántas cuotas. La fecha es una forma de deducirlo, no el dato en sí.
  const question = step.questions.find((item) => item.code === "construction_installments");
  assert.ok(question);
  assert.equal(question.writes, "paymentConfiguration.constructionInstallments");
  assert.ok(!step.questions.some((item) => item.code === "target_date"));

  packet.paymentConfiguration = { constructionInstallments: "24", reservationApplication: "creditAgainstSigning", constructionMethod: "monthlyUntilTarget" };
  assert.equal(validatePacket(packet).valid, true);
  const result = calculateQuotation(packet);
  assert.equal(result.constructionCount, 24);
  assert.equal(result.scheduledMinor + result.differenceMinor, result.priceMinor);
  // El cierre queda sin fecha, no inventada.
  assert.equal(result.installments.at(-1).dueDate, null);
});

test("quotes a plan with no monthly tranche and no delivery date at all", () => {
  // El caso más claro: sin tramo de obra la fecha sólo era el rótulo del cierre.
  // No hacía ninguna falta para calcular, y sin embargo bloqueaba.
  const packet = projectPacket();
  delete packet.project.estimatedHandoverDate;
  packet.paymentConfiguration = { reservationApplication: "creditAgainstSigning" };
  packet.projectPaymentPlan.installments = [
    { position: 1, milestoneType: "reservation", amountType: "fixed", amountValue: "5000.00" },
    { position: 2, milestoneType: "contractSigning", amountType: "percentage", amountValue: "10.00" },
    { position: 3, milestoneType: "closing", amountType: "percentage", amountValue: "90.00" },
  ];
  assert.deepEqual(nextStep(packet).questions.map((item) => item.code), []);
  assert.equal(validatePacket(packet).valid, true);
  const result = calculateQuotation(packet);
  assert.equal(result.installments.length, 3);
  assert.equal(result.scheduledMinor + result.differenceMinor, result.priceMinor);
});

test("still requires the delivery date when the plan has a postDelivery tranche", () => {
  // Ese hito se define RESPECTO de la entrega: sin esa fecha no existe.
  const packet = projectPacket();
  delete packet.project.estimatedHandoverDate;
  packet.paymentConfiguration = { reservationApplication: "creditAgainstSigning", constructionMethod: "monthlyUntilTarget", constructionInstallments: "12", postDeliveryMonths: "24" };
  packet.projectPaymentPlan.installments = [
    { position: 1, milestoneType: "contractSigning", amountType: "percentage", amountValue: "20.00" },
    { position: 2, milestoneType: "constructionPayment", amountType: "percentage", amountValue: "30.00" },
    { position: 3, milestoneType: "postDelivery", amountType: "percentage", amountValue: "50.00" },
  ];
  assert.ok(nextStep(packet).questions.some((item) => item.code === "target_date"));
  assert.ok(validatePacket(packet).errors.some((error) => error.code === "target_date_required"));
});

test("prefers the project's own handover date over the advisor's answer", () => {
  const packet = projectPacket();
  packet.paymentConfiguration.targetDate = "2030-01-01";
  // El sistema manda cuando tiene el dato: la respuesta del asesor sólo cubre el hueco.
  assert.equal(calculateQuotation(packet).targetDate, "2026-11-20");
});
