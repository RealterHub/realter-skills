# Mapa de lecturas MCP

Usa únicamente las lecturas necesarias para completar el JSON del generador.

| Recurso | Tools | Campos necesarios |
|---|---|---|
| Contexto autenticado | `get_current_context` | `organization.name`, logo opcional y nombre del colaborador conectado |
| Contacto | `list_contacts`, `get_contact` | id, nombre, correo y teléfono |
| Proyecto | `list_development_projects`, `get_development_project` | id, código, nombre, moneda, fecha estimada de entrega y planes activos |
| Unidad | `list_project_units`, `get_project_unit` | id, código, estado, precio base, tipo y superficie |
| Plan | `get_project_payment_plan`; como compatibilidad, `paymentPlans` de `get_development_project` | id, nombre, descripción, moneda, estado e installments |
| Propiedad lista | `list_properties`, `get_property` | id, `name`, código, tipo, `areas` en una línea compacta y ofertas activas |
| Oferta de reventa | `get_property` | oferta `sale` activa: id, precio, moneda y si es negociable |

## Compatibilidad actual

En servidores que todavía no publiquen `get_project_unit`, resuelve una unidad inequívoca mediante
`list_project_units` filtrado por `projectId` y código. En servidores que todavía no publiquen
`get_project_payment_plan`, toma el plan exacto de `paymentPlans` en el detalle del proyecto.

La generación requiere `get_current_context` o una lectura equivalente que identifique la organización
y el colaborador de la conexión. Si no existe, detente: esos datos no deben solicitarse como texto libre.

Esta skill nunca llama tools de escritura ni tools relacionadas con deals, cobranza o pagos realizados.
Para una reventa, el MCP aporta inmueble y precio; el script pregunta los porcentajes, la reserva y
la fecha de cierre que no forman parte del contrato de `get_property`.
