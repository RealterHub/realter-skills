const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECIMAL = /^\d+(?:\.\d+)?$/;
const QUOTATION_KINDS = new Set(["projectUnit", "readyProperty"]);
const MILESTONES = new Set(["reservation", "promissoryAgreement", "contractSigning", "constructionPayment", "closing", "postDelivery", "other"]);
const milestoneLabels = {
  reservation: "Reserva",
  promissoryAgreement: "Promesa de compraventa",
  contractSigning: "Firma de contrato",
  constructionPayment: "Durante construcción",
  closing: "Contra entrega",
  postDelivery: "Posterior a la entrega",
  other: "Otro",
};

const power10 = (exponent) => 10n ** BigInt(exponent);
const divideHalfUp = (numerator, denominator) => (numerator + denominator / 2n) / denominator;

function decimalParts(value) {
  const raw = String(value ?? "").trim();
  if (!DECIMAL.test(raw)) return null;
  const [whole, fraction = ""] = raw.split(".");
  return { numerator: BigInt(`${whole}${fraction}`), scale: fraction.length };
}

export function decimalToMinor(value, fractionDigits = 2) {
  const parts = decimalParts(value);
  if (!parts) throw new Error(`Valor monetario inválido: ${value}`);
  if (parts.scale <= fractionDigits) return parts.numerator * power10(fractionDigits - parts.scale);
  return divideHalfUp(parts.numerator, power10(parts.scale - fractionDigits));
}

function percentageOfMinor(priceMinor, percentage) {
  const parts = decimalParts(percentage);
  if (!parts) throw new Error(`Porcentaje inválido: ${percentage}`);
  return divideHalfUp(priceMinor * parts.numerator, 100n * power10(parts.scale));
}

function monthIndex(date) {
  const [year, month] = date.slice(0, 7).split("-").map(Number);
  return year * 12 + month - 1;
}

function addMonths(date, count) {
  const [year, month] = date.slice(0, 7).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + count, 1)).toISOString().slice(0, 10);
}

function required(errors, value, path, label) {
  if (value === undefined || value === null || String(value).trim() === "") {
    errors.push({ code: "required", path, message: `${label} es obligatorio.` });
    return false;
  }
  return true;
}

function uuid(errors, value, path) {
  if (value && !UUID.test(String(value))) errors.push({ code: "invalid_uuid", path, message: `${path} debe ser un UUID válido.` });
}

/**
 * `Date.parse` acepta fechas que no existen: "2027-02-29" (año no bisiesto) y
 * "2026-04-31" devuelven timestamp válido por rollover silencioso, y salían
 * impresas tal cual en el documento. Se compara la fecha reconstruida contra
 * la original para atrapar el rollover.
 */
export function isRealDate(value) {
  const raw = String(value);
  if (!ISO_DATE.test(raw)) return false;
  const time = Date.parse(`${raw}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === raw;
}

function validDate(errors, value, path, label) {
  if (value && !isRealDate(value)) {
    errors.push({ code: "invalid_date", path, message: `${label} debe ser una fecha real en formato YYYY-MM-DD.` });
  }
}

function positiveDecimal(errors, value, path, label) {
  const parts = decimalParts(value);
  if (!parts || parts.numerator <= 0n) {
    errors.push({ code: "invalid_decimal", path, message: `${label} debe ser un decimal mayor que cero.` });
    return false;
  }
  return true;
}

function action(actions, resource, tools, instruction, input = {}) {
  actions.push({ resource, tools, input, instruction });
}

function question(questions, code, prompt, writes, options, extra = {}) {
  questions.push({ code, prompt, writes, ...(options ? { options } : {}), ...extra });
}

function projectTerms(packet) {
  return packet.projectPaymentPlan?.installments ?? [];
}

function propertyTerms(packet) {
  const terms = packet.paymentConfiguration ?? {};
  const values = [terms.reservationAmount, terms.signingPercentage, terms.constructionPercentage, terms.closingPercentage];
  if (!values.every((value) => value !== undefined && value !== null && value !== "")) return [];
  const lines = [
    { milestoneType: "reservation", amountType: "fixed", amountValue: String(terms.reservationAmount) },
    { milestoneType: "contractSigning", amountType: "percentage", amountValue: String(terms.signingPercentage) },
  ];
  // Una propiedad terminada no tiene obra que financiar: lo normal es reserva →
  // inicial → cierre. Un 0 acá significa "sin cuotas", y entonces la línea no
  // existe, en vez de inventarle un tramo de construcción a una casa hecha.
  if ((decimalParts(String(terms.constructionPercentage))?.numerator ?? 0n) > 0n) {
    lines.push({ milestoneType: "constructionPayment", amountType: "percentage", amountValue: String(terms.constructionPercentage) });
  }
  lines.push({ milestoneType: "closing", amountType: "percentage", amountValue: String(terms.closingPercentage) });
  return lines.map((line, index) => ({ ...line, position: index + 1 }));
}

export function resolveQuotation(packet) {
  if (packet.quotationType === "projectUnit") {
    return {
      kind: "projectUnit",
      subjectName: packet.project?.name,
      subjectCode: packet.projectUnit?.code,
      price: packet.projectUnit?.basePrice,
      currency: packet.projectPaymentPlan?.currency,
      // El sistema manda cuando tiene el dato. Cuando no lo tiene, vale la fecha
      // que puso el asesor: que RealterHub no la haya cargado no es motivo para
      // dejar a un proyecto en obra sin poder cotizarse.
      targetDate: packet.project?.estimatedHandoverDate || packet.paymentConfiguration?.targetDate,
      sourceId: packet.projectPaymentPlan?.id,
      installments: projectTerms(packet),
    };
  }
  if (packet.quotationType === "readyProperty") {
    return {
      kind: "readyProperty",
      subjectName: packet.property?.name,
      subjectCode: packet.property?.code,
      price: packet.propertyOffering?.price,
      currency: packet.propertyOffering?.currency,
      targetDate: packet.paymentConfiguration?.targetDate,
      sourceId: null,
      installments: propertyTerms(packet),
    };
  }
  return { kind: packet.quotationType, installments: [] };
}

export function nextStep(packet = {}) {
  const actions = [];
  const blockers = [];
  const questions = [];

  if (!packet.organization?.name || !packet.collaborator?.fullName) {
    action(actions, "connectionContext", ["get_current_context"], "Obtén la organización, su logo opcional y el colaborador autenticado. No los infieras ni los pidas como texto libre.");
    blockers.push({ code: "connection_context_required", message: "La conexión debe exponer la organización y el colaborador autenticado." });
  }
  if (!packet.contact?.id) action(actions, "contact", ["list_contacts", "get_contact"], "Busca al cliente, resuelve cualquier ambigüedad y carga el contacto elegido.");
  if (!QUOTATION_KINDS.has(packet.quotationType)) {
    question(questions, "select_quotation_type", "¿La cotización es para una unidad de un proyecto o para una propiedad lista/reventa?", "quotationType", [
      { label: "Unidad de proyecto", value: "projectUnit" },
      { label: "Propiedad lista", value: "readyProperty" },
    ]);
  }

  if (packet.quotationType === "projectUnit") {
    if (!packet.project?.id) action(actions, "project", ["list_development_projects"], "Busca proyectos y entrega la respuesta completa al comando ingest.");
    else if (!packet.project.currency) action(actions, "project", ["get_development_project"], "Carga el detalle del proyecto seleccionado.", { id: packet.project.id });
    // La fecha de entrega faltante era una ACCIÓN irresoluble: el flujo pedía el
    // detalle del proyecto una y otra vez aunque el dato no exista en la base.
    // 7 de 30 planes de producción quedaban colgados ahí, uno de ellos en obra.
    if (packet.project?.id && packet.project?.currency && !packet.project?.estimatedHandoverDate && !packet.paymentConfiguration?.targetDate) {
      question(questions, "target_date", `El proyecto no tiene fecha estimada de entrega cargada. ¿Cuál es la fecha prevista de entrega de "${packet.project.name}"?`, "paymentConfiguration.targetDate", null, { valueType: "date" });
    }
    const projectDated = packet.project?.currency && (packet.project?.estimatedHandoverDate || packet.paymentConfiguration?.targetDate);
    if (packet.project?.id && projectDated && !packet.projectUnit?.id) action(actions, "projectUnit", ["list_project_units", "get_project_unit"], "Lista las unidades del proyecto; usa get_project_unit solo si la lista no contiene precio y código.", { projectId: packet.project.id });
    if (packet.project?.id && projectDated && !packet.projectPaymentPlan?.id) action(actions, "projectPaymentPlan", ["get_project_payment_plan", "get_development_project"], "Carga el plan elegido. Si get_project_payment_plan no existe, ingiere paymentPlans del detalle del proyecto.", { projectId: packet.project.id });
  }

  if (packet.quotationType === "readyProperty") {
    if (!packet.property?.id) action(actions, "property", ["list_properties"], "Busca propiedades y entrega la respuesta completa al comando ingest.");
    if (packet.property?.id && !packet.propertyOffering?.id) action(actions, "propertyOffering", ["get_property"], "Carga el detalle; ingest filtrará únicamente ofertas activas de venta.", { id: packet.property.id });
    const configuration = packet.paymentConfiguration ?? {};
    if (packet.propertyOffering?.id) {
      const scalarQuestions = [
        ["reservation_amount", "¿Cuál es el monto fijo de la reserva?", "reservationAmount", "money"],
        ["signing_percentage", "¿Qué porcentaje del precio corresponde a la firma?", "signingPercentage", "percentage"],
        ["construction_percentage", "¿Qué porcentaje se distribuirá en cuotas mensuales antes del cierre? Responde 0 si se paga sin cuotas.", "constructionPercentage", "percentage"],
        ["closing_percentage", "¿Qué porcentaje corresponde al pago de cierre o entrega?", "closingPercentage", "percentage"],
        ["target_date", "¿Cuál es la fecha prevista de cierre o entrega?", "targetDate", "date"],
      ];
      for (const [code, prompt, key, valueType] of scalarQuestions) {
        if (configuration[key] === undefined || configuration[key] === null || configuration[key] === "") {
          question(questions, code, prompt, `paymentConfiguration.${key}`, null, { valueType });
        }
      }
    }
  }

  const resolved = resolveQuotation(packet);
  // La forma del plan se juzga ACÁ, no recién en `validate`: antes el flujo
  // respondía "listo" y el validador rechazaba, sin ninguna transición que
  // reparara el estado. Un plan inválido ahora es un bloqueo explícito.
  if (resolved.installments.length > 0) {
    const shapeErrors = [];
    validateInstallments(shapeErrors, resolved.installments);
    for (const item of shapeErrors) blockers.push({ code: item.code, message: item.message });
  }
  const reservationLine = resolved.installments.find((item) => item.milestoneType === "reservation");
  const creditTarget = creditTargetOf(resolved.installments);
  // Acreditar la reserva sólo tiene sentido si hay un pago siguiente al que
  // descontársela — no hace falta que ese pago se llame "firma".
  if (reservationLine && creditTarget && !["creditAgainstSigning", "standalone"].includes(packet.paymentConfiguration?.reservationApplication)) {
    const amount = reservationLine.amountType === "percentage" ? `${reservationLine.amountValue}%` : `${reservationLine.amountValue} ${resolved.currency || ""}`.trim();
    question(questions, "configure_reservation_application", `¿Cómo debe aplicarse la reserva de ${amount}?`, "paymentConfiguration.reservationApplication", [
      { label: `Descontar de "${milestoneLabels[creditTarget.milestoneType]}"`, value: "creditAgainstSigning" },
      { label: "Mantener como pago separado", value: "standalone" },
    ]);
  }
  if (resolved.installments.some((item) => item.milestoneType === "postDelivery") && !packet.paymentConfiguration?.postDeliveryMonths) {
    question(questions, "post_delivery_months", "¿En cuántos meses se paga el tramo posterior a la entrega?", "paymentConfiguration.postDeliveryMonths", null, { valueType: "integer" });
  }
  const constructionLine = resolved.installments.find((item) => item.milestoneType === "constructionPayment");
  if (constructionLine && packet.document?.date && resolved.targetDate
      && constructionWindow(packet.document.date, resolved.targetDate) < 1
      && !packet.paymentConfiguration?.constructionPaymentDate) {
    const amount = constructionLine.amountType === "percentage" ? `${constructionLine.amountValue}%` : `${constructionLine.amountValue} ${resolved.currency || ""}`.trim();
    question(questions, "construction_payment_date", `Entre la cotización y la entrega (${resolved.targetDate}) no entra ninguna cuota mensual. ¿En qué fecha se paga el tramo de ${amount}?`, "paymentConfiguration.constructionPaymentDate", null, { valueType: "date" });
  }
  if (resolved.installments.some((item) => SERIES_MILESTONES.has(item.milestoneType)) && !packet.paymentConfiguration?.constructionMethod) {
    question(questions, "confirm_monthly_projection", "¿Confirmas cuotas mensuales iguales, comenzando dos meses después de la fecha de cotización y terminando el mes anterior al cierre o entrega?", "paymentConfiguration.constructionMethod", [
      { label: "Sí, aplicar esta metodología", value: "monthlyUntilTarget" },
      { label: "No, usa otra metodología", value: "unsupported" },
    ]);
  }
  if (packet.paymentConfiguration?.constructionMethod === "unsupported") {
    blockers.push({
      code: "unsupported_construction_method",
      message: "Esta versión solo genera la proyección mensual validada. No adaptes otra metodología con cálculos del LLM.",
    });
  }

  return { readyForValidation: actions.length === 0 && blockers.length === 0 && questions.length === 0, actions, blockers, questions };
}

function validateInstallments(errors, installments) {
  if (!Array.isArray(installments) || installments.length === 0) {
    errors.push({ code: "terms_required", path: "paymentTerms", message: "La cotización requiere condiciones de pago." });
    return;
  }
  const positions = new Set();
  let closingPosition = null;
  let percentageNumerator = 0n;
  let percentageScale = 0;
  for (const [index, installment] of installments.entries()) {
    const basePath = `paymentTerms[${index}]`;
    if (!Number.isInteger(installment.position) || installment.position < 1) errors.push({ code: "invalid_position", path: `${basePath}.position`, message: "La posición debe ser un entero positivo." });
    else if (positions.has(installment.position)) errors.push({ code: "duplicate_position", path: `${basePath}.position`, message: "Las posiciones no pueden repetirse." });
    else positions.add(installment.position);
    if (!MILESTONES.has(installment.milestoneType)) errors.push({ code: "invalid_milestone", path: `${basePath}.milestoneType`, message: "El hito no es válido." });
    if (!["percentage", "fixed"].includes(installment.amountType)) errors.push({ code: "invalid_amount_type", path: `${basePath}.amountType`, message: "El tipo debe ser percentage o fixed." });
    const amount = decimalParts(installment.amountValue);
    if (!amount || amount.numerator <= 0n) errors.push({ code: "invalid_amount", path: `${basePath}.amountValue`, message: "El valor debe ser mayor que cero." });
    else if (installment.amountType === "percentage") {
      if (amount.numerator > 100n * power10(amount.scale)) errors.push({ code: "percentage_over_100", path: `${basePath}.amountValue`, message: "Un porcentaje no puede exceder 100." });
      const targetScale = Math.max(percentageScale, amount.scale);
      percentageNumerator = percentageNumerator * power10(targetScale - percentageScale) + amount.numerator * power10(targetScale - amount.scale);
      percentageScale = targetScale;
    }
    if (installment.milestoneType === "closing") {
      if (closingPosition !== null) errors.push({ code: "multiple_closing", path: basePath, message: "Solo puede existir un cierre." });
      closingPosition = installment.position;
    }
  }
  [...positions].sort((a, b) => a - b).forEach((position, index) => {
    if (position !== index + 1) errors.push({ code: "non_consecutive_positions", path: "paymentTerms", message: "Las posiciones deben ser consecutivas desde 1." });
  });
  if (closingPosition !== null && closingPosition !== Math.max(...positions)) errors.push({ code: "closing_not_last", path: "paymentTerms", message: "El cierre debe ser el último hito." });
  const fixedCount = installments.filter((item) => item.amountType === "fixed").length;
  const hundred = 100n * power10(percentageScale);
  if (fixedCount === 0 && percentageNumerator !== hundred) errors.push({ code: "percentage_total", path: "paymentTerms", message: "Los porcentajes deben sumar exactamente 100%." });
  if (fixedCount > 0 && percentageNumerator > hundred) errors.push({ code: "mixed_percentage_total", path: "paymentTerms", message: "Los porcentajes de un plan mixto no pueden superar 100%." });
  // No hay supuesto de forma: el plan que llega de RealterHub manda. Las
  // únicas reglas son las de arriba, que protegen la aritmética (posiciones,
  // un solo cierre y al final, porcentajes que no superen 100).
}

/**
 * Hitos que se reparten en cuotas mensuales; el resto es un pago único.
 * `constructionPayment` se reparte entre la cotización y la entrega;
 * `postDelivery` arranca después de la entrega (financiamiento del vendedor).
 */
const SERIES_MILESTONES = new Set(["constructionPayment", "postDelivery"]);

/** Techo de una serie mensual: 50 años. Más que eso no es un plan de pago. */
const MAX_SERIES_MONTHS = 600;

const SIGNING_MILESTONES = new Set(["promissoryAgreement", "contractSigning"]);

/**
 * La reserva es un adelanto del PAGO SIGUIENTE, sea cual sea. Antes se buscaba
 * un hito llamado "firma" y, si el plan no tenía uno, la reserva no se
 * acreditaba nunca y el total quedaba siempre por encima del precio: el plan
 * real "20/80" de producción (reserva fija → obra → cierre) era incotizable.
 */
function creditTargetOf(installments) {
  return [...installments]
    .filter((item) => item.milestoneType !== "reservation")
    .sort((a, b) => a.position - b.position)[0] ?? null;
}

/** Monto de una línea según SU propio tipo — nunca según su hito. */
function lineAmountMinor(line, priceMinor, fractionDigits) {
  return line.amountType === "percentage"
    ? percentageOfMinor(priceMinor, line.amountValue)
    : decimalToMinor(line.amountValue, fractionDigits);
}

/**
 * Cuántas cuotas mensuales entran entre la cotización y la entrega. La primera
 * cae dos meses después de la cotización (30 días reserva→firma, 30 más
 * firma→primera cuota) y la última el mes anterior a la entrega.
 *
 * Puede dar cero o negativo: eso NO es un error ni un pago único. Significa que
 * la fecha de ese tramo es un dato que el plan no trae, y hay que preguntarlo
 * en vez de que el motor elija.
 */
function constructionWindow(quoteDate, targetDate) {
  return monthIndex(targetDate) - monthIndex(quoteDate) - 2;
}

/**
 * Reparto elegido por el dueño (contrastado con contratos reales de RD): todas
 * las cuotas iguales, truncadas al centavo, y el residuo queda sin asignar en
 * vez de inflar algunas cuotas. El residuo está acotado por construcción:
 * `0 <= residuo < cantidad`, y se reporta para que sea visible, no silencioso.
 */
function splitEqually(totalMinor, count) {
  const divisor = BigInt(count);
  const each = totalMinor / divisor;
  return { each, residue: totalMinor - each * divisor };
}

export function validatePacket(packet = {}, { final = true } = {}) {
  const errors = [];
  const warnings = [];
  required(errors, packet.schemaVersion, "schemaVersion", "schemaVersion");
  if (packet.schemaVersion !== undefined && packet.schemaVersion !== 1) errors.push({ code: "unsupported_schema", path: "schemaVersion", message: "schemaVersion debe ser 1." });
  required(errors, packet.document?.date, "document.date", "La fecha de la cotización");
  validDate(errors, packet.document?.date, "document.date", "La fecha de la cotización");
  required(errors, packet.organization?.name, "organization.name", "El nombre de la organización");
  required(errors, packet.collaborator?.fullName, "collaborator.fullName", "El nombre del colaborador");
  required(errors, packet.contact?.id, "contact.id", "El contacto");
  required(errors, packet.contact?.fullName, "contact.fullName", "El nombre del contacto");
  uuid(errors, packet.contact?.id, "contact.id");
  required(errors, packet.quotationType, "quotationType", "El tipo de cotización");
  if (packet.quotationType && !QUOTATION_KINDS.has(packet.quotationType)) errors.push({ code: "invalid_quotation_type", path: "quotationType", message: "quotationType debe ser projectUnit o readyProperty." });

  if (packet.quotationType === "projectUnit") {
    required(errors, packet.project?.id, "project.id", "El proyecto");
    required(errors, packet.project?.name, "project.name", "El nombre del proyecto");
    required(errors, packet.project?.currency, "project.currency", "La moneda del proyecto");
    required(errors, packet.projectUnit?.id, "projectUnit.id", "La unidad");
    required(errors, packet.projectUnit?.code, "projectUnit.code", "El código de la unidad");
    positiveDecimal(errors, packet.projectUnit?.basePrice, "projectUnit.basePrice", "El precio base");
    required(errors, packet.projectPaymentPlan?.id, "projectPaymentPlan.id", "El plan de pago del proyecto");
    required(errors, packet.projectPaymentPlan?.name, "projectPaymentPlan.name", "El nombre del plan");
    required(errors, packet.projectPaymentPlan?.currency, "projectPaymentPlan.currency", "La moneda del plan");
    uuid(errors, packet.project?.id, "project.id");
    uuid(errors, packet.projectUnit?.id, "projectUnit.id");
    uuid(errors, packet.projectPaymentPlan?.id, "projectPaymentPlan.id");
    validDate(errors, packet.project?.estimatedHandoverDate, "project.estimatedHandoverDate", "La fecha estimada de entrega");
    validDate(errors, packet.paymentConfiguration?.targetDate, "paymentConfiguration.targetDate", "La fecha prevista de entrega");
    // Exigimos la fecha RESUELTA: la del proyecto o, si no está, la del asesor.
    required(errors, resolveQuotation(packet).targetDate, "targetDate", "La fecha de entrega (del proyecto o indicada por el asesor)");
    if (packet.projectPaymentPlan?.status && packet.projectPaymentPlan.status !== "active") errors.push({ code: "inactive_plan", path: "projectPaymentPlan.status", message: "El plan del proyecto debe estar activo." });
    if (packet.project?.currency && packet.projectPaymentPlan?.currency && packet.project.currency !== packet.projectPaymentPlan.currency) errors.push({ code: "currency_mismatch", path: "projectPaymentPlan.currency", message: "La moneda del proyecto no coincide con la del plan." });
    if (packet.projectUnit?.status && !["available", "reserved"].includes(packet.projectUnit.status)) warnings.push({ code: "unit_status", path: "projectUnit.status", message: `La unidad tiene estado ${packet.projectUnit.status}.` });
  }

  if (packet.quotationType === "readyProperty") {
    required(errors, packet.property?.id, "property.id", "La propiedad");
    required(errors, packet.property?.name, "property.name", "El nombre de la propiedad");
    required(errors, packet.property?.code, "property.code", "El código de la propiedad");
    required(errors, packet.propertyOffering?.id, "propertyOffering.id", "La oferta de venta");
    positiveDecimal(errors, packet.propertyOffering?.price, "propertyOffering.price", "El precio de la oferta");
    required(errors, packet.propertyOffering?.currency, "propertyOffering.currency", "La moneda de la oferta");
    uuid(errors, packet.property?.id, "property.id");
    uuid(errors, packet.propertyOffering?.id, "propertyOffering.id");
    if (packet.propertyOffering?.offeringType && packet.propertyOffering.offeringType !== "sale") errors.push({ code: "not_sale_offering", path: "propertyOffering.offeringType", message: "La reventa debe usar una oferta de tipo sale." });
    if (packet.propertyOffering?.status && packet.propertyOffering.status !== "active") errors.push({ code: "inactive_offering", path: "propertyOffering.status", message: "La oferta de venta debe estar activa." });
    for (const [key, label] of [["reservationAmount", "La reserva"], ["signingPercentage", "El porcentaje de firma"], ["closingPercentage", "El porcentaje de cierre"]]) positiveDecimal(errors, packet.paymentConfiguration?.[key], `paymentConfiguration.${key}`, label);
    // El tramo de cuotas admite 0: una propiedad lista se paga sin mensualidades.
    const constructionParts = decimalParts(String(packet.paymentConfiguration?.constructionPercentage ?? ""));
    if (!constructionParts) errors.push({ code: "invalid_decimal", path: "paymentConfiguration.constructionPercentage", message: "El porcentaje de cuotas debe ser un decimal (0 si no hay cuotas)." });
    required(errors, packet.paymentConfiguration?.targetDate, "paymentConfiguration.targetDate", "La fecha de cierre o entrega");
    validDate(errors, packet.paymentConfiguration?.targetDate, "paymentConfiguration.targetDate", "La fecha de cierre o entrega");
  }

  const resolved = resolveQuotation(packet);
  if (resolved.currency && !/^[A-Z]{3}$/.test(resolved.currency)) errors.push({ code: "invalid_currency", path: "currency", message: "La moneda debe ser un código ISO 4217 de tres letras." });
  validateInstallments(errors, resolved.installments);
  // Estas dos solo se exigen cuando el plan tiene la línea que les da sentido:
  // antes se pedían siempre y el flujo nunca las preguntaba, así que un plan
  // sin reserva o sin tramo de obra quedaba en un rechazo sin salida.
  const hasReservation = resolved.installments.some((item) => item.milestoneType === "reservation");
  const hasCreditTarget = creditTargetOf(resolved.installments) !== null;
  const hasSeries = resolved.installments.some((item) => SERIES_MILESTONES.has(item.milestoneType));
  if (final && hasReservation && hasCreditTarget && !["creditAgainstSigning", "standalone"].includes(packet.paymentConfiguration?.reservationApplication)) {
    errors.push({ code: "reservation_application_required", path: "paymentConfiguration.reservationApplication", message: "Debe confirmarse cómo se aplica la reserva." });
  }
  if (final && hasSeries && packet.paymentConfiguration?.constructionMethod !== "monthlyUntilTarget") {
    errors.push({ code: "construction_method_required", path: "paymentConfiguration.constructionMethod", message: "Debe confirmarse la metodología mensual de proyección." });
  }
  // Cuántos meses dura el tramo post-entrega no está en RealterHub ni se puede
  // derivar del plan. Sin respuesta explícita no se proyecta: un default
  // silencioso convertiría el tramo en un pago único que nadie pactó.
  if (final && resolved.installments.some((item) => item.milestoneType === "postDelivery")) {
    const months = String(packet.paymentConfiguration?.postDeliveryMonths ?? "");
    // Acotado: sin techo, un número de 20 dígitos desbordaba `Date` y tiraba un
    // RangeError crudo, sin `.validation`, desde dentro de calculateQuotation.
    if (!/^\d{1,3}$/.test(months) || Number(months) < 1 || Number(months) > MAX_SERIES_MONTHS) {
      errors.push({ code: "post_delivery_months_required", path: "paymentConfiguration.postDeliveryMonths", message: `Debe indicarse en cuántos meses se paga el tramo posterior a la entrega (entre 1 y ${MAX_SERIES_MONTHS}).` });
    }
  }
  // Una entrega anterior a la cotización producía un documento con el pago más
  // grande fechado ANTES que los anteriores. Pasó con datos reales: un proyecto
  // en `delivery` con handover de hace dos años.
  if (final && packet.document?.date && resolved.targetDate && isRealDate(packet.document.date) && isRealDate(resolved.targetDate)
      && monthIndex(resolved.targetDate) < monthIndex(packet.document.date)) {
    errors.push({ code: "target_before_quotation", path: "targetDate", message: `La fecha de cierre o entrega (${resolved.targetDate}) es anterior al mes de la cotización (${packet.document.date}).` });
  }
  // Ídem cuando el tramo de obra no tiene ventana mensual: la fecha es un dato
  // del negocio, no algo que el motor pueda derivar del plan.
  if (final && packet.document?.date && resolved.targetDate
      && resolved.installments.some((item) => item.milestoneType === "constructionPayment")
      && constructionWindow(packet.document.date, resolved.targetDate) < 1) {
    required(errors, packet.paymentConfiguration?.constructionPaymentDate, "paymentConfiguration.constructionPaymentDate", "La fecha del tramo de cuotas");
    validDate(errors, packet.paymentConfiguration?.constructionPaymentDate, "paymentConfiguration.constructionPaymentDate", "La fecha del tramo de cuotas");
  }
  if (final && (!packet.organization?.name || !packet.collaborator?.fullName)) errors.push({ code: "unverified_identity", path: "organization", message: "No se puede generar sin la identidad de la organización y del colaborador de la conexión." });

  if (final && errors.length === 0) {
    const priceMinor = decimalToMinor(resolved.price);
    // Cada línea vale lo que dice SU amountType. Nada se deriva del hito.
    const linesTotal = resolved.installments.reduce((sum, line) => sum + lineAmountMinor(line, priceMinor, 2), 0n);
    const reservation = resolved.installments.find((item) => item.milestoneType === "reservation");
    const target = creditTargetOf(resolved.installments);
    const credits = hasReservation && hasCreditTarget && packet.paymentConfiguration?.reservationApplication === "creditAgainstSigning";
    const reservationMinor = reservation ? lineAmountMinor(reservation, priceMinor, 2) : 0n;
    // Acreditar la reserva contra la firma no agrega dinero: lo descuenta una vez.
    const effectiveTotal = linesTotal - (credits ? reservationMinor : 0n);
    const difference = effectiveTotal - priceMinor;
    // Cada línea puede desviarse a lo sumo media unidad menor por el redondeo
    // half-up; con N líneas la deriva acumulada no puede pasar de N.
    const tolerance = BigInt(resolved.installments.length);
    if ((difference < 0n ? -difference : difference) > tolerance) {
      errors.push({ code: "unreconciled_configuration", path: "paymentConfiguration", message: `La configuración no concilia con el precio cotizado. Diferencia antes de proyectar cuotas: ${difference} unidades menores.` });
    }
    if (credits && reservationMinor > lineAmountMinor(target, priceMinor, 2)) {
      errors.push({ code: "reservation_exceeds_signing", path: "paymentConfiguration.reservationApplication", message: `La reserva no puede exceder el importe bruto de "${milestoneLabels[target.milestoneType]}".` });
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function calculateQuotation(packet) {
  const validation = validatePacket(packet);
  if (!validation.valid) {
    const error = new Error("El paquete de la cotización no es válido.");
    error.validation = validation;
    throw error;
  }
  const resolved = resolveQuotation(packet);
  const fractionDigits = 2;
  const priceMinor = decimalToMinor(resolved.price, fractionDigits);
  const quoteDate = packet.document.date;
  const targetDate = resolved.targetDate;
  const source = [...resolved.installments].sort((a, b) => a.position - b.position);

  const reservation = source.find((item) => item.milestoneType === "reservation");
  const creditTarget = creditTargetOf(source);
  const credits = Boolean(reservation && creditTarget && packet.paymentConfiguration?.reservationApplication === "creditAgainstSigning");
  const reservationMinor = reservation ? lineAmountMinor(reservation, priceMinor, fractionDigits) : 0n;

  /** Lo que se paga EN ESE MOMENTO: la firma cobra menos si ya hubo reserva. */
  const netOf = (line) => {
    const gross = lineAmountMinor(line, priceMinor, fractionDigits);
    return credits && line === creditTarget ? gross - reservationMinor : gross;
  };

  /** Una propiedad terminada no tiene obra: el mismo tramo cambia de nombre. */
  const labelFor = (milestone) => {
    if (resolved.kind !== "readyProperty") return milestoneLabels[milestone];
    if (milestone === "constructionPayment") return "Cuotas antes del cierre";
    if (milestone === "closing") return "Pago al cierre";
    return milestoneLabels[milestone];
  };

  // Sin regla de fecha para un hito, el motor NO elige una: la cotización se
  // detiene. Poner un `other` en la fecha de entrega sería inventar un plan
  // que nadie pactó.
  const milestoneDate = (milestone) => {
    if (milestone === "reservation") return quoteDate;
    if (SIGNING_MILESTONES.has(milestone)) return addMonths(quoteDate, 1);
    if (milestone === "closing" || milestone === "postDelivery") return targetDate;
    throw new Error(`No hay regla de fecha para el hito "${milestone}": el plan debe declarar cuándo se paga.`);
  };

  // La tabla de condiciones muestra el importe BRUTO de cada línea (el % que
  // pactó el desarrollador); el desglose de abajo muestra lo que se paga.
  const summary = source.map((line) => ({
    ...line,
    label: labelFor(line.milestoneType),
    amountMinor: lineAmountMinor(line, priceMinor, fractionDigits),
    dueDate: SERIES_MILESTONES.has(line.milestoneType) ? null : milestoneDate(line.milestoneType),
  }));

  const installments = [];
  const residues = [];
  for (const line of source) {
    const amount = netOf(line);
    if (!SERIES_MILESTONES.has(line.milestoneType)) {
      installments.push({
        position: installments.length + 1,
        label: credits && line === creditTarget ? `${labelFor(line.milestoneType)} menos reserva` : labelFor(line.milestoneType),
        dueDate: milestoneDate(line.milestoneType),
        amountMinor: amount,
        kind: line.milestoneType,
      });
      continue;
    }
    const isConstruction = line.milestoneType === "constructionPayment";
    const window = isConstruction ? constructionWindow(quoteDate, targetDate) : 0;
    // Sin ventana mensual, la fecha del tramo la puso el asesor: el motor no
    // elige ni cuántos pagos son ni cuándo caen.
    const singleDate = isConstruction && window < 1 ? packet.paymentConfiguration.constructionPaymentDate : null;
    const count = singleDate ? 1 : (isConstruction ? window : Number(packet.paymentConfiguration.postDeliveryMonths));
    const { each, residue } = splitEqually(amount, count);
    if (residue > 0n) residues.push({ milestoneType: line.milestoneType, count, residueMinor: residue });
    for (let index = 0; index < count; index += 1) {
      installments.push({
        position: installments.length + 1,
        label: count === 1 ? labelFor(line.milestoneType) : `Cuota ${index + 1}`,
        // Obra: arranca dos meses después de la cotización. Post-entrega: el
        // mes siguiente a la entrega.
        dueDate: singleDate ?? (isConstruction ? addMonths(quoteDate, index + 2) : addMonths(targetDate, index + 1)),
        amountMinor: each,
        kind: isConstruction ? "construction" : "postDelivery",
      });
    }
  }

  // Un tramo repartido en tantos meses que cada cuota da 0 no es un plan de
  // pago: son cientos de líneas de $0.00 en un documento que ve un cliente.
  const empty = installments.find((item) => item.amountMinor <= 0n);
  if (empty) {
    const error = new Error("La proyección genera cuotas sin importe.");
    error.validation = { valid: false, errors: [{ code: "zero_installment", path: "paymentTerms", message: `${error.message} "${empty.label}" quedaría en 0 al repartir el tramo.` }], warnings: validation.warnings };
    throw error;
  }

  // Orden cronológico. La posición del plan es comercial, no temporal: con
  // `postDelivery` la regla "el cierre va último" ubica el cierre después, pero
  // temporalmente vence ANTES que las cuotas posteriores a la entrega.
  installments.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.position - b.position));
  installments.forEach((item, index) => { item.position = index + 1; });

  const scheduledMinor = installments.reduce((sum, item) => sum + item.amountMinor, 0n);
  const residueMinor = residues.reduce((sum, item) => sum + item.residueMinor, 0n);
  // Todo lo que no queda asignado es UNA cifra: el residuo de las series más la
  // deriva del redondeo por línea. Antes `validate` toleraba esa deriva y
  // `calculate` exigía cero exacto, así que un plan podía validar y después
  // explotar. Ahora es la misma cuenta en los dos lados y el documento la declara.
  const linesTotalMinor = source.reduce((sum, line) => sum + lineAmountMinor(line, priceMinor, fractionDigits), 0n);
  const lineDriftMinor = priceMinor - (linesTotalMinor - (credits ? reservationMinor : 0n));
  const differenceMinor = priceMinor - scheduledMinor;
  if (differenceMinor !== lineDriftMinor + residueMinor) {
    const error = new Error("La configuración de pagos no concilia con el precio de la propiedad.");
    error.validation = { valid: false, errors: [{ code: "unreconciled_total", path: "paymentConfiguration", message: `${error.message} Diferencia sin explicar: ${differenceMinor - lineDriftMinor - residueMinor}.` }], warnings: validation.warnings };
    throw error;
  }
  const varianceMinor = 0n;
  const construction = installments.filter((item) => item.kind === "construction");
  return {
    ...resolved,
    fractionDigits,
    priceMinor,
    scheduledMinor,
    residueMinor,
    lineDriftMinor,
    differenceMinor,
    residues,
    varianceMinor,
    summary,
    installments,
    constructionCount: construction.length,
    constructionPaymentMinor: construction[0]?.amountMinor ?? 0n,
    constructionRemainderMinor: residues.find((item) => item.milestoneType === "constructionPayment")?.residueMinor ?? 0n,
    warnings: validation.warnings,
  };
}

export function serialize(value) {
  return JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item, 2);
}
