# Mapa de lecturas MCP

Usa únicamente las lecturas necesarias para completar el JSON del generador.

| Recurso | Tools | Campos necesarios |
|---|---|---|
| Contexto autenticado | `get_current_context` | `organization.name`, `organization.logoUrl` opcional y `me.fullName` (colaborador delegado) |
| Contacto | `list_contacts`, `get_contact` | id, nombre, correo y teléfono |
| Proyecto | `list_development_projects`, `get_development_project` | id, código, nombre, moneda, fecha estimada de entrega y planes activos |
| Unidad | `list_project_units`, `get_project_unit` | id, código, estado, precio base, tipo y superficie |
| Plan | `get_project_payment_plan`; como compatibilidad, `paymentPlans` de `get_development_project` | id, nombre, moneda, estado e installments |
| Propiedad lista | `list_properties`, `get_property` | id, `name`, código, tipo, `areas` en una línea compacta y ofertas activas |
| Oferta de reventa | `get_property` | oferta `sale` activa: id, precio, moneda y si es negociable |

## Compatibilidad actual

En servidores que todavía no publiquen `get_project_unit`, resuelve una unidad inequívoca mediante
`list_project_units` filtrado por `projectId` y código. En servidores que todavía no publiquen
`get_project_payment_plan`, toma el plan exacto de `paymentPlans` en el detalle del proyecto.

La generación requiere `get_current_context` o una lectura equivalente que identifique la organización
y el colaborador de la conexión. Si no existe, detente: esos datos no deben solicitarse como texto libre.

Contrato de `get_current_context` en RealterHub: es una tool de clase conexión — está disponible para
toda conexión autenticada sin seleccionarla en la configuración de la credencial y sin permiso RBAC.
Devuelve `organization` (`name`, `legalName`, `logoUrl`, `preferredLanguage`; sin datos de facturación)
y `me` (`id`, `fullName`, `collaboratorType`, `avatarUrl`, `language`). Un `null` en cualquiera de los
dos campos de idioma significa el default de la plataforma. No incluye `employeeNumber` ni canales de
contacto del colaborador: esos viven tras `get_collaborator` (permiso `collaborators:read`).

Esta skill nunca llama tools de escritura ni tools relacionadas con deals, cobranza o pagos realizados.
Para una reventa, el MCP aporta inmueble y precio; el script pregunta los porcentajes, la reserva y
la fecha de cierre que no forman parte del contrato de `get_property`.
