import { createHash } from "node:crypto";
import { access, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { isRealDate, nextStep } from "./engine.mjs";

const ANSWERS = {
  select_quotation_type: { path: ["quotationType"], type: "enum", values: ["projectUnit", "readyProperty"] },
  reservation_amount: { path: ["paymentConfiguration", "reservationAmount"], type: "decimal" },
  signing_percentage: { path: ["paymentConfiguration", "signingPercentage"], type: "percentage" },
  construction_percentage: { path: ["paymentConfiguration", "constructionPercentage"], type: "percentage", allowZero: true },
  closing_percentage: { path: ["paymentConfiguration", "closingPercentage"], type: "percentage" },
  target_date: { path: ["paymentConfiguration", "targetDate"], type: "date" },
  configure_reservation_application: { path: ["paymentConfiguration", "reservationApplication"], type: "enum", values: ["creditAgainstSigning", "standalone"] },
  confirm_monthly_projection: { path: ["paymentConfiguration", "constructionMethod"], type: "enum", values: ["monthlyUntilTarget", "unsupported"] },
  post_delivery_months: { path: ["paymentConfiguration", "postDeliveryMonths"], type: "integer" },
  construction_payment_date: { path: ["paymentConfiguration", "constructionPaymentDate"], type: "date" },
  payment_day: { path: ["paymentConfiguration", "paymentDay"], type: "integer" },
  construction_first_payment_date: { path: ["paymentConfiguration", "constructionFirstPaymentDate"], type: "date" },
  construction_installment_count: { path: ["paymentConfiguration", "constructionInstallmentCount"], type: "integer" },
};

const RESOURCE_TARGETS = {
  connectionContext: null,
  contact: "contact",
  project: "project",
  projectUnit: "projectUnit",
  projectPaymentPlan: "projectPaymentPlan",
  property: "property",
  propertyOffering: "propertyOffering",
};

const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");
const string = (value) => value === undefined || value === null ? undefined : String(value);
const money = (value) => value === undefined || value === null ? undefined : String(value);

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

function unwrap(raw) {
  let value = raw;
  for (let depth = 0; depth < 6; depth += 1) {
    if (Array.isArray(value?.content)) {
      const text = value.content.find((item) => item?.type === "text" && typeof item.text === "string")?.text;
      if (text) {
        try { value = JSON.parse(text); continue; } catch { /* use the structured wrapper */ }
      }
    }
    const nested = first(value?.structuredContent, value?.data, value?.result, value?.item);
    if (nested !== undefined && nested !== value) { value = nested; continue; }
    break;
  }
  return value;
}

function candidateArray(value, resource) {
  if (Array.isArray(value)) return value;
  const resourceKeys = {
    contact: ["contacts"],
    project: ["projects", "developmentProjects"],
    projectUnit: ["units", "projectUnits"],
    projectPaymentPlan: ["paymentPlans"],
    property: ["properties"],
    propertyOffering: ["offerings", "propertyOfferings"],
  }[resource] ?? [];
  const keys = [...resourceKeys, "items", "results", "records"];
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  return [value];
}

function normalize(resource, item) {
  const source = item ?? {};
  if (resource === "connectionContext") {
    const organization = first(source.organization, source.workspace?.organization, source.account?.organization, {});
    // `me` es el contrato real de get_current_context (RealterHub); el resto son
    // lecturas equivalentes de compatibilidad.
    const collaborator = first(source.me, source.collaborator, source.user, source.member, source.authenticatedUser, {});
    // Locale del documento, resuelto aquí (no por el LLM): idioma del usuario
    // vinculado, luego el de la organización. Solo formatos BCP-47 simples; un
    // null significa el default de la plataforma y se conserva el del init.
    const localeCandidate = first(collaborator.language, collaborator.preferredLanguage, organization.preferredLanguage);
    const locale = /^[a-z]{2}(-[A-Z]{2})?$/.test(String(localeCandidate ?? "")) ? localeCandidate : undefined;
    return {
      organization: compact({
        name: first(organization.name, source.organizationName),
        logoUrl: first(organization.logoUrl, organization.logo?.publicUrl, organization.logo?.url, null),
      }),
      collaborator: compact({ fullName: first(collaborator.fullName, collaborator.name, source.collaboratorName) }),
      ...(locale ? { locale } : {}),
    };
  }
  if (resource === "contact") return compact({
    id: source.id,
    fullName: first(source.fullName, source.name, [source.firstName, source.lastName].filter(Boolean).join(" ") || undefined),
    email: first(source.mainEmail, source.email, source.primaryEmail, null),
    phone: first(source.phoneNumber, source.phone, source.mobilePhone, source.primaryPhone, null),
  });
  if (resource === "project") return compact({
    id: source.id,
    name: source.name,
    code: first(source.code, null),
    currency: first(source.currency, source.defaultCurrency),
    estimatedHandoverDate: first(source.estimatedHandoverDate, source.handoverDate, source.deliveryDate),
  });
  if (resource === "projectUnit") return compact({
    id: source.id,
    code: first(source.code, source.unitCode, source.name),
    basePrice: money(first(source.basePrice, source.price)),
    status: first(source.status, null),
    unitType: first(source.unitType, source.type, null),
    totalArea: first(source.totalArea, source.area, null),
    measurementUnit: first(source.measurementUnit, source.areaUnit, null),
  });
  if (resource === "projectPaymentPlan") return compact({
    id: source.id,
    name: source.name,
    currency: source.currency,
    status: source.status,
    installments: (source.installments ?? []).map((entry, index) => compact({
      position: Number(first(entry.position, index + 1)),
      milestoneType: first(entry.milestoneType, entry.type),
      amountType: first(entry.amountType, entry.valueType),
      amountValue: money(first(entry.amountValue, entry.value)),
    })),
  });
  if (resource === "property") return compact({
    id: source.id,
    name: source.name,
    code: first(source.code, source.referenceCode),
    propertyType: first(source.propertyType, source.type, null),
    propertySubtype: first(source.propertySubtype, source.subtype, null),
    areas: first(source.areas, null),
  });
  if (resource === "propertyOffering") return compact({
    id: source.id,
    offeringType: first(source.offeringType, source.type),
    status: source.status,
    price: money(source.price),
    currency: source.currency,
    isNegotiable: Boolean(first(source.isNegotiable, false)),
  });
  throw new Error(`Recurso no soportado: ${resource}`);
}

function candidateLabel(resource, item) {
  if (resource === "contact") return first(item.fullName, item.name, item.id);
  if (resource === "project") return [item.name, item.code].filter(Boolean).join(" · ");
  if (resource === "projectUnit") return [first(item.code, item.unitCode, item.name), first(item.basePrice, item.price)].filter(Boolean).join(" · ");
  if (resource === "projectPaymentPlan") return [item.name, item.currency, item.status].filter(Boolean).join(" · ");
  if (resource === "property") return [item.name, first(item.code, item.referenceCode)].filter(Boolean).join(" · ");
  if (resource === "propertyOffering") return [first(item.offeringType, item.type), item.price, item.currency].filter(Boolean).join(" · ");
  return item.id;
}

function validateNormalized(resource, value) {
  if (resource === "connectionContext") {
    if (!value.organization?.name || !value.collaborator?.fullName) throw new Error("El contexto no contiene organization.name y collaborator.fullName verificables.");
    return;
  }
  if (!value?.id) throw new Error(`La respuesta seleccionada para ${resource} no contiene id.`);
  const required = {
    contact: ["fullName"], project: ["name"], projectUnit: ["code", "basePrice"],
    projectPaymentPlan: ["name", "currency", "status", "installments"], property: ["name", "code"],
    propertyOffering: ["offeringType", "status", "price", "currency"],
  }[resource] ?? [];
  const missing = required.filter((key) => value[key] === undefined || value[key] === null || value[key] === "");
  if (missing.length) throw new Error(`La respuesta de ${resource} está incompleta. Faltan: ${missing.join(", ")}. Usa la tool de detalle y vuelve a ingerirla.`);
}

function stateDigest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function integrityFile(file) {
  return `${path.resolve(file)}.realterhub-integrity`;
}

async function atomicWrite(file, value) {
  const target = path.resolve(file);
  const temporary = `${target}.${process.pid}.tmp`;
  const integrity = integrityFile(target);
  const integrityTemporary = `${integrity}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await writeFile(integrityTemporary, `${stateDigest(value)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, target);
  await rename(integrityTemporary, integrity);
}

export async function loadState(file) {
  if (!file) throw new Error("Falta --state <quotation.json>.");
  const target = path.resolve(file);
  const packet = JSON.parse(await readFile(target, "utf8"));
  let expected;
  try {
    expected = (await readFile(integrityFile(target), "utf8")).trim();
  } catch (error) {
    if (error.code === "ENOENT") throw new Error("El estado no tiene sello de integridad. Créalo con quotation.mjs init; no escribas el JSON directamente.");
    throw error;
  }
  if (expected !== stateDigest(packet)) throw new Error("El estado de la cotización fue modificado fuera del flujo permitido.");
  return packet;
}

export async function initializeState(file, date) {
  if (!file) throw new Error("Falta --state <quotation.json>.");
  // Mismo criterio que el validador del motor. Antes era sólo la regex, así que
  // "2026-13-99" se sellaba sin chistar y recién saltaba en el `validate` final,
  // después de que el operador hizo toda la ingesta.
  if (!isRealDate(String(date ?? ""))) throw new Error("Falta --date YYYY-MM-DD o la fecha no es una fecha real.");
  try {
    await access(path.resolve(file));
    throw new Error("El estado ya existe. Usa otro archivo; init no sobrescribe cotizaciones.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const packet = { schemaVersion: 1, document: { date, locale: "es-DO", title: "Cotización" }, paymentConfiguration: {} };
  await atomicWrite(file, packet);
  return { status: "initialized", state: path.resolve(file) };
}

export function deterministicNext(packet) {
  const result = nextStep(packet);
  if (result.actions.length) return { status: "tool_required", action: result.actions[0] };
  if (result.questions.length) return { status: "answer_required", question: result.questions[0] };
  if (result.blockers.length) return { status: "blocked", blocker: result.blockers[0] };
  return { status: "ready_to_validate" };
}

export async function ingestResource(stateFile, resource, rawFile, selectedId) {
  if (!(resource in RESOURCE_TARGETS)) throw new Error(`--resource debe ser uno de: ${Object.keys(RESOURCE_TARGETS).join(", ")}.`);
  if (!rawFile) throw new Error("Falta --input <respuesta-mcp.json>.");
  const packet = await loadState(stateFile);
  const currentStep = deterministicNext(packet);
  if (currentStep.status !== "tool_required" || currentStep.action.resource !== resource) {
    const expected = currentStep.status === "tool_required" ? currentStep.action.resource : currentStep.status;
    throw new Error(`No se puede ingerir ${resource} ahora. La siguiente transición permitida es ${expected}.`);
  }
  const raw = unwrap(JSON.parse(await readFile(path.resolve(rawFile), "utf8")));

  if (resource === "connectionContext") {
    const normalized = normalize(resource, raw);
    validateNormalized(resource, normalized);
    packet.organization = normalized.organization;
    packet.collaborator = normalized.collaborator;
    if (normalized.locale) packet.document.locale = normalized.locale;
    await atomicWrite(stateFile, packet);
    return { status: "ingested", resource };
  }

  let source = raw;
  if (resource === "projectPaymentPlan" && Array.isArray(raw?.paymentPlans)) source = raw.paymentPlans;
  if (resource === "propertyOffering") {
    source = first(raw?.offerings, raw?.propertyOfferings, raw);
  }
  let candidates = candidateArray(source, resource);
  if (resource === "projectPaymentPlan") candidates = candidates.filter((item) => !item?.status || item.status === "active");
  if (resource === "propertyOffering") candidates = candidates.filter((item) => first(item?.offeringType, item?.type) === "sale" && (!item?.status || item.status === "active"));
  if (!candidates.length) throw new Error(`La respuesta no contiene candidatos válidos para ${resource}.`);
  if (candidates.length > 1 && !selectedId) {
    return {
      status: "selection_required",
      resource,
      prompt: `Selecciona un registro para ${resource}.`,
      options: candidates.map((item) => ({ label: candidateLabel(resource, item), value: string(item.id) })),
      nextCommand: `ingest --resource ${resource} --input ${rawFile} --select <id>`,
    };
  }
  const chosen = selectedId ? candidates.find((item) => String(item?.id) === String(selectedId)) : candidates[0];
  if (!chosen) throw new Error(`--select ${selectedId} no coincide con ningún candidato devuelto por el MCP.`);
  const normalized = normalize(resource, chosen);
  validateNormalized(resource, normalized);
  packet[RESOURCE_TARGETS[resource]] = normalized;
  await atomicWrite(stateFile, packet);
  return { status: "ingested", resource, id: normalized.id };
}

function normalizeAnswer(definition, value) {
  const raw = String(value ?? "").trim();
  if (definition.type === "enum") {
    if (!definition.values.includes(raw)) throw new Error(`Valor inválido. Opciones permitidas: ${definition.values.join(", ")}.`);
    return raw;
  }
  if (definition.type === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) throw new Error("La fecha debe usar YYYY-MM-DD.");
    return raw;
  }
  if (definition.type === "integer") {
    if (!/^\d+$/.test(raw) || Number(raw) < 1) throw new Error("Debe ser un número entero de meses mayor que cero.");
    return raw;
  }
  if (!/^\d+(?:\.\d+)?$/.test(raw)) throw new Error("El valor debe ser un decimal sin símbolos ni separadores de miles.");
  if (Number(raw) <= 0 && !definition.allowZero) throw new Error("El valor debe ser mayor que cero.");
  if (definition.type === "percentage" && Number(raw) > 100) throw new Error("El porcentaje no puede exceder 100.");
  return raw;
}

export async function recordAnswer(stateFile, code, value) {
  const definition = ANSWERS[code];
  if (!definition) throw new Error(`Pregunta no soportada: ${code}.`);
  const packet = await loadState(stateFile);
  const currentStep = deterministicNext(packet);
  const current = currentStep.status === "answer_required" ? currentStep.question : null;
  // Se admite responder la pregunta actual o CORREGIR una ya respondida. Sin
  // esto, un porcentaje mal tecleado dejaba el estado sin salida: el flujo no
  // vuelve a preguntar, el sello impide editar el JSON e `init` no sobrescribe.
  const answered = definition.path.reduce((node, segment) => (node == null ? undefined : node[segment]), packet) !== undefined;
  if ((!current || current.code !== code) && !answered) {
    throw new Error(`La respuesta ${code} no es la siguiente pregunta permitida por el flujo.`);
  }
  const normalized = normalizeAnswer(definition, value);
  // Cambiar el tipo de cotización descarta lo del tipo anterior. Sin esto, el
  // proyecto/unidad/plan ingeridos quedaban de basura huérfana para siempre, y
  // peor: `reservationApplication` y `constructionMethod` contestadas para un
  // proyecto en obra se reaplicaban solas a una reventa sin volver a preguntar.
  if (code === "select_quotation_type" && packet.quotationType && packet.quotationType !== normalized) {
    for (const key of ["project", "projectUnit", "projectPaymentPlan", "property", "propertyOffering"]) delete packet[key];
    packet.paymentConfiguration = {};
  }
  let target = packet;
  for (const segment of definition.path.slice(0, -1)) target = target[segment] ??= {};
  target[definition.path.at(-1)] = normalized;
  await atomicWrite(stateFile, packet);
  return { status: "answered", code };
}
