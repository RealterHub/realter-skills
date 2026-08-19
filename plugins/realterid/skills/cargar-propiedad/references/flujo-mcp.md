# Flujo MCP de una propiedad — referencia de tools

El MCP se conecta al sitio del asesor (URL `/mcp` de su dominio, autenticado por OAuth o API key).
Todas las salidas son JSON con `{schema_version, ok, data|error, warnings}`; los errores llegan
como `{ok:false, code}` con mensaje accionable (`invalid_input`, `not_found`, `unprocessable`,
`forbidden`, `conflict`). Ningún input lleva tenant ni `_status`: el sitio los resuelve por la
credencial. **Los ids viajan siempre como string.**

> **Sin `locale`**: a diferencia de las tools de servicios, blog o páginas, las de propiedades
> **todavía no aceptan idioma** (retrofit pendiente). Todo se escribe en el idioma principal del
> sitio del asesor. Si pide otra traducción: hoy se hace desde su admin.

## 1. Catálogos e ids (antes de escribir nada)

| Tool | Para qué |
| --- | --- |
| `list_property_options(group, property_type)` | Los valores VÁLIDOS de cada campo cerrado. Grupos: `property_types`, `subtypes` (filtrable por `property_type`), `operation_types`, `availability`, `conditions`, `currencies`, `features`, `room_types`, `measurement_units`, `project_statuses`. Devuelve `value`/`label`, y en `features`/`room_types` además **ids**; en `features`, `code` y `type` (`amenity`, `comfort`, `service`, `infrastructure`, `incentive`, `financing`) — el `type` es lo que permite barrer el catálogo por grupos en la entrevista. |
| `list_geography(search, city_id)` | Ciudades y sectores con sus ids. Sin argumentos lista ciudades; con `search` busca por nombre; con `city_id` da los sectores de esa ciudad. |
| `search_properties(query, operation_type, property_type, city_id, sector_id, availability, status, min_price, max_price, bedrooms_min, page, page_size)` | Evita duplicar: búscala antes de crearla. |
| `get_property(property_id \| slug)` | Ficha completa aplanada + estado editorial. Para ediciones, léela antes de escribir. |
| `list_media(search, page, page_size)` | Biblioteca de imágenes del asesor: reutilizar antes de subir. |

**Nunca** escribas la etiqueta en español donde va un `value`, ni un nombre donde va un id.

## 2. Crear el borrador

`create_property_draft(title, kind, operation_type, property_type, property_subtype, city_id)`
→ `property_id` + `missing_for_publish`.

- Crea **en borrador**; el slug se genera del título.
- No acepta ningún otro campo: el resto entra por las `set_*`.
- `property_subtype` se valida contra `property_type`; si no cuadra, el error enumera los válidos.

## 3. Completar por bloques

Todas idempotentes. `null` = no tocar ese campo. Las listas **reemplazan** el bloque completo.
Cada respuesta trae `missing_for_publish` actualizado: es el guion de lo que falta preguntar.

| Tool | Campos | Notas |
| --- | --- | --- |
| `set_property_location` | `property_id`, `city_id`, `sector_id`, `address_line`, `latitude`, `longitude`, `show_exact_location` | `sector_id` es requerido para publicar. Las coordenadas solo si el asesor las da. |
| `set_property_pricing` | `property_id`, `price`, `is_negotiable`, `price_on_request` | **No lleva moneda**: la moneda es del sitio (site-settings), no de la propiedad. `price_on_request: true` excluye importe. |
| `set_property_details` | `property_id`, `description`, `year_built`, `condition`, `built_area`, `total_area`, `lot_area`, `measurement_unit`, `floor`, `total_floors` | `description` y `measurement_unit` son requeridos para publicar. |
| `set_property_rooms` | `property_id`, `rooms[]` = `{room_type_id, quantity}` | Reemplaza la lista completa; `[]` la vacía. Un tipo no se repite: se usa `quantity`. |
| `set_property_features` | `property_id`, `feature_ids[]` | Reemplaza. Solo ids del catálogo, solo amenidades **confirmadas**. |
| `suggest_property_feature` | `title` (requerido), `note` (nulable), `property_id` (nulable) | Propone al catálogo global una amenidad confirmada que no existe. **Si ya existe**, devuelve el feature ⇒ asígnalo con `set_property_features` (era un problema de nombre). **Si ya hay una sugerencia pendiente igual**, responde `conflict` ⇒ "ya está en cola", sigue sin dramatizar. Si no, la crea y la cura el super-admin en el admin. ⚠️ **Recién añadida al MCP**: si el sitio no la expone, degrada a solo-descripción y pide el alta por soporte. |
| `set_property_availability` | `property_id`, `availability` (`available`\|`reserved`\|`sold`\|`rented`) | Es el "archivar" sin borrar: `sold`/`rented` siguen publicadas como prueba social pero salen de los listados. |

## 4. Fotos

| Tool | Para qué |
| --- | --- |
| `upload_image(alt, image_url \| image_base64, filename)` | Sube UNA imagen a la biblioteca y devuelve `media_id`. No asigna nada. `alt` obligatorio y descriptivo real. Una llamada por foto. |
| `set_property_cover_image(property_id, media_id)` | Portada — **requerida para publicar**. El `media_id` tiene que ser del propio asesor o devuelve `not_found`. |
| `set_property_gallery(property_id, media_ids[])` | Reemplaza la galería completa. Máximo 40. |

## 5. Publicar

`publish_property(property_id)` — pasa a publicada. Si falta algo requerido devuelve
`{ok:false, code:"unprocessable"}` con la lista exacta y **la propiedad sigue en borrador**:
se completa y se reintenta.

Requeridos para publicar (lo que aparece en `missing_for_publish`): `title`, `kind`,
`operation_type`, `property_type`, `property_subtype`, `description`, `measurement_unit`,
`city_id`, `sector_id`, `cover_image` y **precio** (importe o "a consultar").

`unpublish_property(property_id)` la retira del aire y la devuelve a borrador. **No existe tool de
borrado** en todo el MCP: se despublica o se marca vendida/rentada.

## 6. Errores y qué hacer

| Código | Qué significa aquí | Qué hacer |
| --- | --- | --- |
| `invalid_input` | Un value, un id o una combinación inválida (subtipo que no pertenece al tipo, precio con `price_on_request`) | Releer el mensaje: enumera los válidos. Volver a `list_property_options` si hace falta. |
| `not_found` | El id no existe **en la cuenta del asesor** (propiedad, media, sector) | Nunca es "de otro asesor": para esta cuenta no existe. Re-resolver el id con la tool de listado. |
| `unprocessable` | `publish_property` con requeridos faltantes | Completar los campos que lista y reintentar. |
| `forbidden` | Cuenta suspendida (conserva lectura, pierde escritura) | Decírselo al asesor tal cual: es un tema de su suscripción, no un fallo técnico. |
