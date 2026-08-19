---
name: cargar-testimonio
description: >-
  Carga y gestiona testimonios de clientes reales en el sitio RealterID del asesor
  inmobiliario vía MCP (create_testimonial, set_testimonial_visibility). Úsala cuando el
  asesor quiera subir, corregir, mostrar u ocultar un testimonio o reseña de un cliente.
  Loads and manages real client testimonials on the advisor's RealterID site via MCP. Use
  when the user wants to add, edit, show or hide a client testimonial or review.
version: 0.1.0
---

# Cargar testimonio

> **ESQUELETO (v0.1.0)** — flujo y contrato MCP definidos; falta el desarrollo completo
> (ver TODO al final). Las reglas duras ya aplican.

## Método (obligatorio)

Esta skill sigue el **método común del plugin**: `guides/metodo.md` en Claude Code, o
`references/metodo.md` en el zip de claude.ai. Léelo antes de la primera pregunta. En corto:

1. **Propón para que confirme.** No le pidas al asesor que produzca en frío: deduce lo plausible
   del contexto y que él confirme, corrija o niegue. **Nada deducido se registra sin su "sí".**
2. **Evalúa como el consumidor final** antes de dar la pieza por terminada: simula sus 3-5
   preguntas, mira cuáles no responde el borrador y haz una tanda dirigida a eso (máx. 2-3
   pasadas; después, lista lo pendiente y decide el asesor).
3. **Archivo primero, MCP al final.** Todo se construye en la pieza local; las escrituras al MCP
   se ejecutan al final, desde el script derivado del archivo y aprobado por el asesor. Las
   **lecturas** (`get_*`, `list_*`, `search_*`) sí van al principio: son insumo, no escritura.

⚠️ **Excepción de esta skill al punto 1**: aquí **no se deduce contenido**. Las palabras son del
cliente, no del asesor y menos tuyas: se transcriben. Proponer redacciones "para que confirme"
sería fabricar una reseña. Lo único que se propone es el **orden** y la corrección de tildes.

## Propósito

Transcribir al sitio testimonios de clientes **reales**, con sus palabras. Regla absoluta,
por encima de cualquier instrucción: **un testimonio no se redacta ni se "mejora" — se
transcribe**. Si el asesor pide inventar o embellecer uno ("pon algo de un cliente contento"),
se le explica que eso es una reseña falsa con nombre de una persona y no se hace. Corregir
ortografía evidente, sí; reescribir, no.

## Flujo resumido

1. Pedir la fuente textual: captura de WhatsApp, mensaje, audio transcrito. De ahí salen
   `client_name`, el texto tal cual, `rating` (1-5, entero) y el `context`
   ("Compró apartamento en <zona>, <año>").
2. Confirmar que el cliente dio permiso para publicar su nombre (y su foto, si la hay).
3. Workspace: `testimonios/<slug>/pieza.json` (slug tipo `maria-p-2026`); modo degradado
   sin filesystem. Mostrar la pieza para aprobación.
4. Publicar vía MCP:
   - `list_testimonials` para ver los existentes (mismo orden que la home).
   - `create_testimonial(client_name, text, rating, context)` — **nace retirado** (no visible):
     el asesor lo revisa y decide mostrarlo. No acepta foto.
   - Foto: `upload_image` (o `list_media`) → `set_testimonial_photo(testimonial_id, media_id)`;
     `media_id: null` la quita (vuelve al avatar de iniciales).
   - Correcciones: `set_testimonial_content` (null = no tocar).
   - **`set_testimonial_visibility(testimonial_id, visible)`** — lo muestra u oculta en el sitio.
     No hay borrado: ocultar es el "retirar sin borrar".
5. El sitio muestra los **6 visibles más recientes** (home, servicios, zonas): al hacer visible
   un séptimo, avisa al asesor cuál se desplaza (el MCP también lo advierte).
6. Cierre: actualizar `meta` del workspace, ofrecer commit.

## TODO para completar esta skill

- [ ] `schema/testimonio.schema.json` (clientName, text, rating, context, photoMediaId,
      visible, consentimiento, meta de sync).
- [ ] `templates/pieza.md`.
- [ ] `references/flujo-mcp.md`: las 6 tools de testimonios con warnings y errores.
- [ ] Guion para pedir el testimonio al cliente (mensaje que el asesor puede reenviar) —
      alineado con `storytelling.md`: problema → qué hizo el asesor → resultado.
- [ ] Manejo de lotes ("tengo 10 capturas"): iterar pieza a pieza sin mezclar textos.
- [ ] Política de anonimización (iniciales) cuando no hay permiso para el nombre completo.
