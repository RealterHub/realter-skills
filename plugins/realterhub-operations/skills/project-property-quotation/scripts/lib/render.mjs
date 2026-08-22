import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { calculateQuotation } from "./engine.mjs";

const templateUrl = new URL("../../templates/quotation.html", import.meta.url);
export const QUOTATION_DISCLAIMER = "Esta cotización es una estimación de la proyección de pagos. No representa un acuerdo formal ni genera obligaciones entre las partes; su finalidad es ofrecer una referencia de cómo podrían distribuirse las cuotas.";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

/** Logos embebidos: hasta 512 KB de base64, suficiente para un logo real. */
const MAX_DATA_URL_LENGTH = 512 * 1024;

function safeImageUrl(value) {
  if (!value) return null;
  const raw = String(value);
  // El `data:` se decide por su propia forma. Antes vivía en el `catch` de
  // `new URL()`, que para un `data:` válido NUNCA lanza — así que la rama era
  // inalcanzable y todo logo en base64 caía a las iniciales.
  if (/^data:/i.test(raw)) {
    if (raw.length > MAX_DATA_URL_LENGTH) return null;
    return /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/]+=*$/i.test(raw) ? raw : null;
  }
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function initials(name) {
  return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function decimalSeparator(locale) {
  return new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === "decimal")?.value ?? ".";
}

export function formatMoney(minor, currency, fractionDigits, locale) {
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const divisor = 10n ** BigInt(fractionDigits);
  const whole = absolute / divisor;
  const fraction = (absolute % divisor).toString().padStart(fractionDigits, "0");
  const grouped = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(whole);
  return `${negative ? "−" : ""}${currency} ${grouped}${fractionDigits ? `${decimalSeparator(locale)}${fraction}` : ""}`;
}

function formatDate(value, locale, monthOnly = false) {
  if (!value) return "Por definir";
  return new Intl.DateTimeFormat(locale, monthOnly
    ? { month: "2-digit", year: "numeric", timeZone: "UTC" }
    : { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

/**
 * Sustitución en UNA sola pasada. Con `replaceAll` encadenado, un valor que
 * contuviera `{{OTRA_CLAVE}}` sobrevivía hasta el turno de esa clave y se
 * sustituía: un contacto llamado `{{PROJECTION_ROWS}}` metía la tabla de pagos
 * dentro de su propio nombre, y `{{BASE_PRICE}}` filtraba el precio al título.
 * `escapeHtml` no escapa llaves, así que el ataque no necesita `<`, `>` ni `"`.
 * Una sola pasada nunca vuelve a mirar lo ya sustituido.
 */
function replaceTokens(template, tokens) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => (key in tokens ? String(tokens[key]) : match));
}

function subjectPresentation(packet) {
  if (packet.quotationType === "projectUnit") {
    const unit = packet.projectUnit;
    return {
      eyebrow: "Unidad de proyecto",
      title: packet.project.name,
      subtitle: `Unidad ${unit.code}`,
      facts: [
        ["Tipo", unit.unitType || "Unidad del proyecto"],
        ["Superficie", unit.totalArea ? `${unit.totalArea} ${unit.measurementUnit || ""}`.trim() : "No indicada"],
      ],
    };
  }
  const property = packet.property;
  const totalArea = String(property.areas || "").match(/(?:^|\s*\|\s*)total:([^|]+)/)?.[1]?.trim();
  const formattedTotalArea = totalArea?.replace(/\bm2\b/i, "m²").replace(/\bft2\b/i, "ft²") || "No indicada";
  return {
    eyebrow: "Propiedad lista",
    title: property.name,
    subtitle: property.code,
    facts: [
      ["Tipo", [property.propertyType, property.propertySubtype].filter(Boolean).join(" · ") || "Propiedad"],
      ["Superficie", formattedTotalArea],
    ],
  };
}

export async function renderQuotation(packet) {
  const calculation = calculateQuotation(packet);
  const locale = packet.document.locale || "es-DO";
  const logoUrl = safeImageUrl(packet.organization.logoUrl);
  const logo = logoUrl
    ? `<img class="organization-logo" src="${escapeHtml(logoUrl)}" alt="Logo de ${escapeHtml(packet.organization.name)}" onerror="this.style.display='none'" /><span class="organization-fallback">${escapeHtml(initials(packet.organization.name))}</span>`
    : `<span class="organization-fallback visible">${escapeHtml(initials(packet.organization.name))}</span>`;
  const subject = subjectPresentation(packet);
  const subjectFacts = subject.facts.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("");
  const contactDetails = [packet.contact.email, packet.contact.phone].filter(Boolean).map(escapeHtml).join(" · ") || "Sin datos adicionales";

  const summaryRows = calculation.summary.map((installment) => {
    const basis = installment.amountType === "percentage" ? `${escapeHtml(installment.amountValue)}%` : "Monto fijo";
    const dueDate = installment.milestoneType === "constructionPayment"
      ? '<a class="projection-link" href="#payment-projection">Ver proyección abajo</a>'
      : escapeHtml(formatDate(installment.dueDate, locale, installment.milestoneType !== "closing"));
    return `<tr><td><strong>${escapeHtml(installment.label)}</strong></td><td>${basis}</td><td class="money">${escapeHtml(formatMoney(installment.amountMinor, calculation.currency, calculation.fractionDigits, locale))}</td><td>${dueDate}</td></tr>`;
  }).join("\n");
  const projectionRows = calculation.installments.map((installment) => {
    return `<tr><td><strong>${escapeHtml(installment.label)}</strong></td><td>${escapeHtml(formatDate(installment.dueDate, locale, installment.kind !== "closing"))}</td><td class="money">${escapeHtml(formatMoney(installment.amountMinor, calculation.currency, calculation.fractionDigits, locale))}</td></tr>`;
  }).join("\n");
  const warnings = calculation.warnings.length ? `<div class="notice">${calculation.warnings.map((item) => escapeHtml(item.message)).join(" ")}</div>` : "";
  // Las cuotas se dejan iguales y el residuo truncado no se asigna a ninguna,
  // así que el total proyectado puede quedar unos centavos por debajo del
  // precio. El documento lo dice: dos totales distintos sin explicación es lo
  // que hace que un cliente desconfíe de la cotización.
  const roundingNote = calculation.differenceMinor > 0n
    ? `<p class="reconciliation">Las cuotas se muestran iguales y redondeadas al centavo; la diferencia con el precio cotizado es de ${escapeHtml(formatMoney(calculation.differenceMinor, calculation.currency, calculation.fractionDigits, locale))}.</p>`
    : "";
  const offeringLabel = packet.quotationType === "readyProperty" && packet.propertyOffering.isNegotiable ? "Precio negociable" : "Precio cotizado";

  const template = await readFile(fileURLToPath(templateUrl), "utf8");
  return replaceTokens(template, {
    DOCUMENT_TITLE: escapeHtml(packet.document.title || "Cotización"),
    DOCUMENT_DATE: escapeHtml(formatDate(packet.document.date, locale)),
    ORGANIZATION_NAME: escapeHtml(packet.organization.name),
    ORGANIZATION_LOGO: logo,
    COLLABORATOR_NAME: escapeHtml(packet.collaborator.fullName),
    CONTACT_NAME: escapeHtml(packet.contact.fullName),
    CONTACT_DETAILS: contactDetails,
    SUBJECT_EYEBROW: escapeHtml(subject.eyebrow),
    SUBJECT_TITLE: escapeHtml(subject.title),
    SUBJECT_SUBTITLE: escapeHtml(subject.subtitle),
    SUBJECT_FACTS: subjectFacts,
    OFFERING_LABEL: escapeHtml(offeringLabel),
    BASE_PRICE: escapeHtml(formatMoney(calculation.priceMinor, calculation.currency, calculation.fractionDigits, locale)),
    PROJECTED_TOTAL: escapeHtml(formatMoney(calculation.scheduledMinor, calculation.currency, calculation.fractionDigits, locale)),
    PAYMENT_COUNT: calculation.installments.length,
    SUMMARY_ROWS: summaryRows,
    PROJECTION_ROWS: projectionRows,
    WARNINGS: warnings,
    ROUNDING_NOTE: roundingNote,
    DISCLAIMER: escapeHtml(QUOTATION_DISCLAIMER),
  });
}
