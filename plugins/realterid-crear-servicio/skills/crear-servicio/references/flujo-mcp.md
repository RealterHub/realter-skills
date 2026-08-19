<!-- NO EDITAR — generado por scripts/build-plugins.mjs desde src/skills/crear-servicio/references/flujo-mcp.md. Los cambios hechos aquí se pierden en el próximo build; edita la fuente. -->

# Flujo MCP de un servicio — referencia de tools

El MCP se conecta al sitio del asesor (URL `/mcp` de su dominio, autenticado por OAuth o API key).
Todas las salidas son JSON con `{schema_version, ok, data|error, warnings}`; los errores se
devuelven como `{ok: false, code}` con mensaje accionable. Ningún input lleva tenant ni estado:
el sitio los resuelve por la credencial.

## Lectura

| Tool | Para qué |
| --- | --- |
| `search_services(query, status, page, page_size)` | Listar los servicios del asesor (orden = el real del sitio). Llamar antes de crear para no duplicar. |
| `get_service(service_id | slug)` | Ficha por bloques + `missing_for_publish`. Textos largos llegan recortados con warning: no reescribas un bloque a partir de una lectura truncada. |
| `list_service_link_targets(group: clusters|forms, search)` | Los ids válidos para `cta.cluster`, `relatedClusters` y `finalCta.form`. **Llamar SIEMPRE antes de escribir cualquier id de relación.** |
| `list_media(search, page, page_size)` | Biblioteca de imágenes del asesor — reutilizar antes de subir. |

## Medios

| Tool | Para qué |
| --- | --- |
| `upload_image(alt, image_url | image_base64, filename)` | Sube a la biblioteca y devuelve `media_id`. No asigna a nada. El `alt` es obligatorio: descríbelo con palabras del asesor. |

## Escritura (ciclo)

1. `create_service_draft(title, excerpt)` — crea en borrador, devuelve `service_id` +
   `missing_for_publish`. No acepta más campos; el slug se autogenera del título.
2. Bloques (todas idempotentes; `null` = no tocar; los arrays **reemplazan el bloque completo**;
   para vaciar una imagen existe el centinela `"none"` en `set_service_images`):

| Tool | Campos | Notas |
| --- | --- | --- |
| `set_service_basics` | `title`, `excerpt`, `order` | Warning si excerpt > 160. |
| `set_service_hero` | `subtitle`, `video_url` | Valida YouTube/Vimeo antes de escribir. No toca imágenes. |
| `set_service_cta` | `label`, `target`, `cluster_id` | `target='cluster'` exige `cluster_id`; con otro target, un `cluster_id` presente es `invalid_input`. |
| `set_service_images` | `icon_media_id`, `hero_image_media_id`, `editorial_image_media_id` | Único camino para TODAS las imágenes de la landing. Solo `image/*`; id ajeno ⇒ `not_found`. |
| `set_service_value_props` | `value_props[]` (`title`, `description`, `icon_media_id`) | 1-8. Warning con menos de 2. |
| `set_service_editorial` | `paragraphs[]` | Texto plano, un párrafo por elemento. Warning bajo 300 palabras y si no hay imagen editorial. |
| `set_service_process_steps` | `steps[]` (`title`, `description`) | 1-10. Sin campo de número: el orden manda. |
| `set_service_faqs` | `faqs[]` (`question`, `answer`) | 1-12; warning con menos de 5. `answer` en texto plano, `\n` separa párrafos. |
| `set_service_related_content` | `show_testimonials`, `related_cluster_ids[]` | Reemplazo completo; tope 8. |
| `set_service_final_cta` | `title`, `text`, `target`, `form_id` | `target`: solo `contact|whatsapp`. `form_id: "none"` limpia el formulario. |
| `set_service_seo` | `meta_title`, `meta_description` | Avisa si >60 / >160; no rechaza. |

3. `publish_service(service_id)` — si falta un requerido: `{ok:false, code:"unprocessable"}` con
   la lista y el documento sigue en borrador. Publica con warnings de calidad (no bloquea por
   debajo de los mínimos recomendados). Ya publicado ⇒ lo dice y no escribe.
4. `unpublish_service(service_id)` — vuelve a borrador; desaparece de home, /servicios y buscador.
   Nada se borra (no existen tools de borrado).

## `missing_for_publish` de un servicio

`title · excerpt · slug · hero_subtitle · cta_label · cta_target · value_props (≥1) ·
process_steps (≥1) · faqs (≥1) · final_cta_title · final_cta_target`
— y `cta_cluster` cuando `cta.target === 'cluster'` sin cluster asignado.

Todo lo demás es opcional y nunca aparece ahí: icono, imágenes, video, editorial, clusters
relacionados, texto y formulario del CTA final, SEO explícito.

## Idioma

`locale` nulable en las tools que tocan texto: `null` = idioma principal del sitio del asesor
(nunca asumas español). Un `locale` explícito es solo para dictar traducciones; en arrays,
conserva los ids de fila que devuelva `get_service` para no destruir el otro idioma.

## Advertencias de edición sobre publicado

Editar un servicio **ya publicado** escribe en vivo (el borrador solo existe antes de la primera
publicación). Dilo antes de escribir: "esto sale al sitio de inmediato". Si el asesor quiere
retirarlo mientras trabaja: `unpublish_service` primero.
