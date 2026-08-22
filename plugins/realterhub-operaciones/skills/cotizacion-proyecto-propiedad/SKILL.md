---
name: cotizacion-proyecto-propiedad
description: >-
  Genera cotizaciones inmobiliarias validadas en HTML y PDF para unidades de proyecto
  o propiedades listas/reventa con datos de RealterHub. Úsala al calcular, preparar
  o exportar una cotización.
---

# Cotización de proyecto o propiedad

Produce una cotización con una proyección de pagos reproducible. Trata el script como autoridad
exclusiva sobre estado, preguntas, normalización MCP, cálculos, validaciones, redondeo y renderizado.

## Ejecución

Ejecuta todos los comandos con esta carpeta de skill como directorio de trabajo. Inicializa el estado:

```bash
node scripts/quotation.mjs init --state cotizacion.json --date YYYY-MM-DD
```

Ejecuta `next --state cotizacion.json` y procesa únicamente la transición devuelta. Repite hasta
`ready_to_validate`.

- Entrega la respuesta MCP completa y sin modificar mediante
  `ingest --state cotizacion.json --resource RECURSO --input respuesta.json`.
- Formula exactamente la pregunta devuelta y registra la respuesta mediante
  `answer --state cotizacion.json --question CODIGO --value VALOR`.
- Si el script devuelve opciones, no selecciones por el usuario.
- Si devuelve un bloqueo, detente y comunica ese bloqueo.

Valida y genera:

```bash
node scripts/quotation.mjs validate --state cotizacion.json
node scripts/quotation.mjs generate --state cotizacion.json --output-dir salida
```

Entrega las rutas del HTML y PDF generados.

## Invariantes

- No edites `cotizacion.json` directamente ni calcules importes, fechas o cuotas.
- Obtén organización, logo y colaborador del contexto autenticado; no los infieras ni los solicites
  como texto libre.
- Usa exclusivamente tools de lectura de RealterHub. No crees ni modifiques planes, deals, cobros,
  hitos de pago u otros registros.
- No sustituyas datos faltantes, errores o bloqueos con suposiciones.
- Conserva el disclaimer incorporado por el generador.

Consulta [references/mcp-data-map.md](references/mcp-data-map.md) solo cuando una tool indicada por
`next` no esté disponible y sea necesario identificar una lectura compatible.
