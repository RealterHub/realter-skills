---
name: crear-servicio
description: >-
  Crea o mejora una landing de servicio del asesor inmobiliario en su sitio RealterID:
  entrevista, redacta con su voz de marca y publica vía MCP (ciclo create_service_draft →
  set_service_* → publish_service). Úsala cuando el asesor quiera crear, redactar o retocar
  un servicio de su web. Creates or improves a service landing page on the advisor's
  RealterID site: interviews, drafts in their brand voice, publishes via MCP. Use when the
  user wants to create or edit a service page.
version: 0.1.0
---

# Crear servicio

Construye la landing de un servicio del asesor: título, hero, propuestas de valor, editorial,
proceso, FAQs y CTAs — entrevistando al asesor y redactando **con su voz**, nunca con la tuya.

## Regla de oro

**NUNCA inventes datos del asesor**: ni cifras, ni casos, ni zonas, ni promesas. Lo que no dé,
se pregunta o queda vacío (y `missing_for_publish` lo dirá). Está permitido redactar — para eso
está la skill — pero todo hecho dentro de la redacción salió de su boca.

## Antes de empezar

1. **`get_brand_foundations` SIEMPRE primero** (si hay conexión MCP). El brief fija trato,
   vocabulario, diferenciadores con prueba y reglas de contenido. Si está vacío en lo esencial,
   ofrece correr antes la skill `fundamentos-de-marca` (o al menos pregunta trato y vocabulario
   mínimos en esta sesión).
2. **Guías**: `storytelling.md` (el editorial es una historia comprimida), `copywriting.md`
   (específico > superlativo, CTA que dice qué pasa después) y `seo-basico.md` (una landing =
   una intención de búsqueda; excerpt ≤160; 5-8 FAQs long-tail; editorial 300-500 palabras).
   En Claude Code están en `guides/` del plugin; en el zip de claude.ai, en `references/`.
3. **Workspace** (`workspace.md`): la pieza vive en `servicios/<slug>/pieza.json` + `pieza.md`.
   Si ya existe la carpeta del servicio, es una edición: carga el json y, si tiene `meta.remoteId`,
   lee el estado remoto con `get_service` antes de tocar nada. Sin filesystem → modo degradado.
4. **Servicios existentes**: `search_services` evita duplicar ("ya tienes 'Venta de propiedades',
   ¿este es distinto o lo mejoramos?"). El orden en la home lo decide el campo `order`.

## La entrevista

Tandas de 2-4 preguntas por tema, derivadas del schema (`schema/servicio.schema.json`) —
requeridos de publicación primero. En Claude Code usa AskUserQuestion para opciones cerradas
(destino del CTA, mostrar testimonios); en otros clientes, preguntas numeradas. Banco de
preguntas en `references/entrevista.md`.

Orden temático sugerido:

1. **El servicio y su cliente** → title, excerpt, intención de búsqueda (una sola).
2. **La promesa** → hero.subtitle, cta (label + destino).
3. **Por qué contigo** → valueProps (2-8; cada una con hecho, no adjetivo).
4. **Cómo funciona** → processSteps (los pasos reales de su proceso, 1-10).
5. **La historia** → editorial 300-500 palabras (problema→decisión→resultado con SUS anécdotas).
6. **Preguntas reales** → faqs (5-8; "¿qué te preguntan por WhatsApp una y otra vez?").
7. **Cierre** → finalCta, testimonios sí/no, contenidos relacionados (clusters).
8. **Imágenes** → hero, icono, editorial (de su biblioteca o subir nuevas).

## Redacción

- Redacta cada bloque con la voz del brief: trato correcto, `words_to_use` textuales, cero
  términos de `words_to_avoid`, respetando `content_rules`.
- Español neutro multi-país salvo el vocabulario propio del asesor.
- **Muestra el borrador `pieza.md` COMPLETO** (plantilla en `templates/pieza.md`) y espera
  aprobación antes de persistir o publicar. Itera bloque a bloque si pide cambios.
- Con aprobación: escribe `pieza.json` conforme al schema, regenera `pieza.md`, actualiza
  `meta.contentHash`.

## Publicación vía MCP

Ciclo completo (detalle de cada tool y sus reglas en `references/flujo-mcp.md`):

1. **Ids primero, nunca inventados**: `list_service_link_targets` (clusters y formularios del
   asesor) antes de escribir cualquier `cluster_id`/`form_id`; `list_media`/`upload_image` antes
   de cualquier imagen (`upload_image` sube con `alt` y devuelve `media_id`; no asigna).
2. `create_service_draft(title, excerpt)` → devuelve `service_id` + `missing_for_publish`.
   Crea en borrador; el slug se genera solo del título.
3. Completar por bloques: `set_service_basics` · `set_service_hero` · `set_service_cta` ·
   `set_service_images` · `set_service_value_props` · `set_service_editorial` (párrafos de texto
   plano) · `set_service_process_steps` · `set_service_faqs` · `set_service_related_content` ·
   `set_service_final_cta` · `set_service_seo`. Escribe solo los bloques con contenido aprobado;
   los arrays **reemplazan el bloque completo**; `null` = no tocar. Toda respuesta trae
   `missing_for_publish` actualizado.
4. `publish_service(service_id)` cuando el asesor lo pida. Si falta un requerido devuelve
   `{ok:false, code:"unprocessable"}` con la lista — completa y reintenta. Publica con *warnings*
   de calidad (pocas FAQs, editorial corto): repórtaselos al asesor, la decisión es suya.
   Para retirar del aire: `unpublish_service` (nada se borra).
5. Actualiza `meta`: `remoteId` al crear, `publishedAt` al publicar, `lastSyncedAt` y
   `contentHash` tras cada sync.

`locale` es nulable en las tools: `null` escribe en el idioma principal del sitio del asesor.
Solo pasa un `locale` explícito si el asesor está dictando una traducción — y entonces conserva
los `row_id`/ids de fila que devuelvan las lecturas para no destruir el otro idioma.

Errores del MCP llegan como `{ok:false, code}` con mensaje accionable (`invalid_input`,
`not_found` — id ajeno o inexistente —, `unprocessable`, `forbidden`): corrígete con el mensaje;
no reintentes a ciegas.

## Cierre de sesión

- Resume: estado (borrador/publicado), URL esperada (`/servicios/<slug>`), y qué quedó en
  `missing_for_publish` o con warnings.
- Ofrece commit descriptivo si hay git ("servicio compra-sobre-planos: editorial y FAQs");
  ofrece `git init` si no hay repo. Nunca push sin pedirlo.

## Errores frecuentes a evitar

- ❌ Redactar sin haber leído `get_brand_foundations`.
- ❌ Un servicio-paraguas ("servicios inmobiliarios integrales"): una landing = una intención.
- ❌ Propuestas de valor que son adjetivos ("atención personalizada") en vez de hechos con prueba.
- ❌ Inventar `cluster_id`, `form_id` o `media_id` sin listarlos antes.
- ❌ Publicar sin aprobación explícita del borrador completo.
- ❌ FAQs decorativas ("¿por qué elegirnos?") en vez de búsquedas reales.
