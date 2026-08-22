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

function validDate(errors, value, path, label) {
  if (value && (!ISO_DATE.test(String(value)) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)))) {
    errors.push({ code: "invalid_date", path, message: `${label} debe usar YYYY-MM-DD.` });
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
  return [
    { position: 1, milestoneType: "reservation", amountType: "fixed", amountValue: String(terms.reservationAmount) },
    { position: 2, milestoneType: "contractSigning", amountType: "percentage", amountValue: String(terms.signingPercentage) },
    { position: 3, milestoneType: "constructionPayment", amountType: "percentage", amountValue: String(terms.constructionPercentage) },
    { position: 4, milestoneType: "closing", amountType: "percentage", amountValue: String(terms.closingPercentage) },
  ];
}

export function resolveQuotation(packet) {
  if (packet.quotationType === "projectUnit") {
    return {
      kind: "projectUnit",
      subjectName: packet.project?.name,
      subjectCode: packet.projectUnit?.code,
      price: packet.projectUnit?.basePrice,
      currency: packet.projectPaymentPlan?.currency,
      targetDate: packet.project?.estimatedHandoverDate,
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
    else if (!packet.project.currency || !packet.project.estimatedHandoverDate) action(actions, "project", ["get_development_project"], "Carga el detalle del proyecto seleccionado.", { id: packet.project.id });
    if (packet.project?.id && packet.project?.currency && packet.project?.estimatedHandoverDate && !packet.projectUnit?.id) action(actions, "projectUnit", ["list_project_units", "get_project_unit"], "Lista las unidades del proyecto; usa get_project_unit solo si la lista no contiene precio y código.", { projectId: packet.project.id });
    if (packet.project?.id && packet.project?.currency && packet.project?.estimatedHandoverDate && !packet.projectPaymentPlan?.id) action(actions, "projectPaymentPlan", ["get_project_payment_plan", "get_development_project"], "Carga el plan elegido. Si get_project_payment_plan no existe, ingiere paymentPlans del detalle del proyecto.", { projectId: packet.project.id });
  }

  if (packet.quotationType === "readyProperty") {
    if (!packet.property?.id) action(actions, "property", ["list_properties"], "Busca propiedades y entrega la respuesta completa al comando ingest.");
    if (packet.property?.id && !packet.propertyOffering?.id) action(actions, "propertyOffering", ["get_property"], "Carga el detalle; ingest filtrará únicamente ofertas activas de venta.", { id: packet.property.id });
    const configuration = packet.paymentConfiguration ?? {};
    if (packet.propertyOffering?.id) {
      const scalarQuestions = [
        ["reservation_amount", "¿Cuál es el monto fijo de la reserva?", "reservationAmount", "money"],
        ["signing_percentage", "¿Qué porcentaje del precio corresponde a la firma?", "signingPercentage", "percentage"],
        ["construction_percentage", "¿Qué porcentaje se distribuirá en cuotas antes del cierre?", "constructionPercentage", "percentage"],
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
  const fixedReservation = resolved.installments.find((item) => item.milestoneType === "reservation" && item.amountType === "fixed");
  if (fixedReservation && !["creditAgainstSigning", "standalone"].includes(packet.paymentConfiguration?.reservationApplication)) {
    question(questions, "configure_reservation_application", `¿Cómo debe aplicarse la reserva fija de ${fixedReservation.amountValue} ${resolved.currency || ""}?`, "paymentConfiguration.reservationApplication", [
      { label: "Descontar de la firma", value: "creditAgainstSigning" },
      { label: "Mantener como pago separado", value: "standalone" },
    ]);
  }
  if (resolved.installments.some((item) => item.milestoneType === "constructionPayment") && !packet.paymentConfiguration?.constructionMethod) {
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
  const reservations = installments.filter((item) => item.milestoneType === "reservation" && item.amountType === "fixed");
  const signings = installments.filter((item) => ["promissoryAgreement", "contractSigning"].includes(item.milestoneType) && item.amountType === "percentage");
  const construction = installments.filter((item) => item.milestoneType === "constructionPayment" && item.amountType === "percentage");
  const closing = installments.filter((item) => item.milestoneType === "closing" && item.amountType === "percentage");
  if (reservations.length !== 1 || signings.length !== 1 || construction.length !== 1 || closing.length !== 1 || installments.length !== 4) {
    errors.push({ code: "unsupported_terms_shape", path: "paymentTerms", message: "Esta versión requiere una reserva fija, una firma porcentual, un tramo porcentual de cuotas y un cierre porcentual." });
  }
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
    required(errors, packet.project?.estimatedHandoverDate, "project.estimatedHandoverDate", "La fecha estimada de entrega");
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
    for (const [key, label] of [["reservationAmount", "La reserva"], ["signingPercentage", "El porcentaje de firma"], ["constructionPercentage", "El porcentaje de cuotas"], ["closingPercentage", "El porcentaje de cierre"]]) positiveDecimal(errors, packet.paymentConfiguration?.[key], `paymentConfiguration.${key}`, label);
    required(errors, packet.paymentConfiguration?.targetDate, "paymentConfiguration.targetDate", "La fecha de cierre o entrega");
    validDate(errors, packet.paymentConfiguration?.targetDate, "paymentConfiguration.targetDate", "La fecha de cierre o entrega");
  }

  const resolved = resolveQuotation(packet);
  if (resolved.currency && !/^[A-Z]{3}$/.test(resolved.currency)) errors.push({ code: "invalid_currency", path: "currency", message: "La moneda debe ser un código ISO 4217 de tres letras." });
  validateInstallments(errors, resolved.installments);
  if (final && !["creditAgainstSigning", "standalone"].includes(packet.paymentConfiguration?.reservationApplication)) errors.push({ code: "reservation_application_required", path: "paymentConfiguration.reservationApplication", message: "Debe confirmarse cómo se aplica la reserva." });
  if (final && packet.paymentConfiguration?.constructionMethod !== "monthlyUntilTarget") errors.push({ code: "construction_method_required", path: "paymentConfiguration.constructionMethod", message: "Debe confirmarse la metodología mensual de proyección." });
  if (final && (!packet.organization?.name || !packet.collaborator?.fullName)) errors.push({ code: "unverified_identity", path: "organization", message: "No se puede generar sin la identidad de la organización y del colaborador de la conexión." });

  if (final && errors.length === 0) {
    const priceMinor = decimalToMinor(resolved.price);
    const reservation = resolved.installments.find((item) => item.milestoneType === "reservation");
    const signing = resolved.installments.find((item) => ["promissoryAgreement", "contractSigning"].includes(item.milestoneType));
    const construction = resolved.installments.find((item) => item.milestoneType === "constructionPayment");
    const closing = resolved.installments.find((item) => item.milestoneType === "closing");
    const reservationMinor = decimalToMinor(reservation.amountValue);
    const signingMinor = percentageOfMinor(priceMinor, signing.amountValue);
    const baseTotal = reservationMinor
      + (packet.paymentConfiguration.reservationApplication === "creditAgainstSigning" ? signingMinor - reservationMinor : signingMinor)
      + percentageOfMinor(priceMinor, construction.amountValue)
      + percentageOfMinor(priceMinor, closing.amountValue);
    const baseDifference = baseTotal - priceMinor;
    if ((baseDifference < 0n ? -baseDifference : baseDifference) > 2n) {
      errors.push({ code: "unreconciled_configuration", path: "paymentConfiguration", message: `La configuración no concilia con el precio cotizado. Diferencia antes de proyectar cuotas: ${baseDifference} unidades menores.` });
    }
    if (packet.paymentConfiguration.reservationApplication === "creditAgainstSigning" && reservationMinor > signingMinor) {
      errors.push({ code: "reservation_exceeds_signing", path: "paymentConfiguration.reservationApplication", message: "La reserva no puede exceder el importe bruto de la firma." });
    }
    if (monthIndex(resolved.targetDate) - monthIndex(packet.document.date) - 2 < 1) {
      errors.push({ code: "target_too_soon", path: "targetDate", message: "El cierre o entrega debe ocurrir al menos tres meses después del mes de la cotización." });
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
  const source = [...resolved.installments].sort((a, b) => a.position - b.position);
  const reservation = source.find((item) => item.milestoneType === "reservation");
  const signing = source.find((item) => ["promissoryAgreement", "contractSigning"].includes(item.milestoneType));
  const construction = source.find((item) => item.milestoneType === "constructionPayment");
  const closing = source.find((item) => item.milestoneType === "closing");
  const reservationMinor = decimalToMinor(reservation.amountValue, fractionDigits);
  const signingGrossMinor = percentageOfMinor(priceMinor, signing.amountValue);
  const closingMinor = percentageOfMinor(priceMinor, closing.amountValue);
  const creditsReservation = packet.paymentConfiguration.reservationApplication === "creditAgainstSigning";
  if (creditsReservation && reservationMinor > signingGrossMinor) {
    const error = new Error("La reserva no puede exceder el importe bruto de la firma.");
    error.validation = { valid: false, errors: [{ code: "reservation_exceeds_signing", path: "paymentConfiguration.reservationApplication", message: error.message }], warnings: validation.warnings };
    throw error;
  }
  const quoteDate = packet.document.date;
  const targetDate = resolved.targetDate;
  const constructionCount = monthIndex(targetDate) - monthIndex(quoteDate) - 2;
  if (constructionCount < 1) {
    const error = new Error("El cierre o entrega debe ocurrir al menos tres meses después del mes de la cotización.");
    error.validation = { valid: false, errors: [{ code: "target_too_soon", path: "targetDate", message: error.message }], warnings: validation.warnings };
    throw error;
  }
  const signingNetMinor = creditsReservation ? signingGrossMinor - reservationMinor : signingGrossMinor;
  const reconciledConstructionTotalMinor = priceMinor - reservationMinor - signingNetMinor - closingMinor;
  const constructionDivisor = BigInt(constructionCount);
  const constructionPaymentMinor = reconciledConstructionTotalMinor / constructionDivisor;
  const constructionRemainderMinor = reconciledConstructionTotalMinor % constructionDivisor;
  const summary = source.map((installment) => ({
    ...installment,
    label: resolved.kind === "readyProperty" && installment.milestoneType === "constructionPayment"
      ? "Cuotas antes del cierre"
      : resolved.kind === "readyProperty" && installment.milestoneType === "closing"
        ? "Pago al cierre"
        : milestoneLabels[installment.milestoneType],
    amountMinor: installment.amountType === "percentage" ? percentageOfMinor(priceMinor, installment.amountValue) : decimalToMinor(installment.amountValue, fractionDigits),
    dueDate: installment.milestoneType === "reservation" ? quoteDate : ["promissoryAgreement", "contractSigning"].includes(installment.milestoneType) ? addMonths(quoteDate, 1) : installment.milestoneType === "closing" ? targetDate : null,
  }));
  const installments = [
    { position: 1, label: "Reserva", dueDate: quoteDate, amountMinor: reservationMinor, kind: "reservation" },
    { position: 2, label: creditsReservation ? "Firma menos reserva" : "Firma", dueDate: addMonths(quoteDate, 1), amountMinor: signingNetMinor, kind: "signing" },
    ...Array.from({ length: constructionCount }, (_, index) => ({
      position: index + 3,
      label: `Cuota ${index + 1}`,
      dueDate: addMonths(quoteDate, index + 2),
      amountMinor: constructionPaymentMinor + (BigInt(index) < constructionRemainderMinor ? 1n : 0n),
      kind: "construction",
    })),
    { position: constructionCount + 3, label: "Pago de cierre o entrega", dueDate: targetDate, amountMinor: closingMinor, kind: "closing" },
  ];
  const scheduledMinor = installments.reduce((sum, item) => sum + item.amountMinor, 0n);
  const varianceMinor = scheduledMinor - priceMinor;
  if (varianceMinor !== 0n) {
    const error = new Error("La configuración de pagos no concilia con el precio de la propiedad.");
    error.validation = { valid: false, errors: [{ code: "unreconciled_total", path: "paymentConfiguration", message: `${error.message} Diferencia en unidades menores: ${varianceMinor}.` }], warnings: validation.warnings };
    throw error;
  }
  return { ...resolved, fractionDigits, priceMinor, scheduledMinor, varianceMinor, summary, installments, constructionCount, constructionPaymentMinor, constructionRemainderMinor, warnings: validation.warnings };
}

export function serialize(value) {
  return JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item, 2);
}
