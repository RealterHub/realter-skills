---
name: cargar-propiedad
description: >-
  Carga una propiedad nueva en el sitio RealterID del asesor inmobiliario entrevistándolo sobre
  la visita: recorrido estancia por estancia, deducción de amenidades que él confirma, fotos, y
  publicación vía MCP (create_property_draft → set_property_* → publish_property). Úsala cuando
  el asesor quiera subir, completar o corregir una propiedad de su inventario. Loads a property
  into the advisor's RealterID site by interviewing them about the visit and publishing via MCP.
  Use when the user wants to add, complete or fix a property listing.
version: 0.1.0
---

# Cargar propiedad

Convierte una visita en una ficha publicada. El asesor estuvo en el inmueble: esta skill le saca
lo que vio —con un recorrido guiado y proponiéndole lo plausible para que solo confirme— y lo
publica con el ciclo `create_property_draft → set_property_* → publish_property`.

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

## Regla de oro

**NUNCA inventes datos de la propiedad.** Ni metros, ni año, ni amenidades, ni precio. Puedes
**proponer** lo plausible (es el corazón de la entrevista), pero **lo propuesto no se registra
hasta que el asesor lo confirma explícitamente**. Un "creo que sí" no es un sí: queda pendiente.
Una ficha corta y cierta vende; una inflada se cae en la primera visita del cliente.

## Antes de empezar

1. **`get_brand_foundations`** (si hay conexión MCP): trato, vocabulario del asesor
   (¿apartamento o departamento?, ¿parqueo o cochera?), `words_to_avoid` y sus reglas de
   contenido. Sus `specialties` y `areas_served` además **orientan las deducciones**.
2. **Guías**: `entrevista-propiedad.md` es la que manda aquí (recorrido, deducción→confirmación,
   preguntas de contexto, fotos como fuente, catálogo como checklist, insistencia calibrada).
   `copywriting.md` y `storytelling.md` moldean la descripción; `seo-basico.md`, el título.
   En Claude Code están en `guides/` del plugin; en el zip de claude.ai, en `references/`.
3. **Workspace** (`workspace.md`): la pieza vive en `propiedades/<slug>/pieza.json` + `pieza.md`.
   Si la carpeta ya existe es una edición: carga el json y, con `meta.remoteId`, lee el estado
   remoto con `get_property` antes de tocar nada. Sin filesystem → modo degradado.
4. **¿Ya existe?**: `search_properties` con dos o tres palabras del título o de la zona antes de
   crear nada — cargar dos veces la misma propiedad es el error más caro de deshacer (no hay tool
   de borrado; solo se despublica).
5. **Catálogos primero, ids después**: `list_property_options` (`property_types`, `subtypes`,
   `operation_types`, `conditions`, `measurement_units`, `availability`, `features`, `room_types`)
   y `list_geography` para ciudad y sector. **Nunca escribas un nombre donde va un id ni un value.**
6. **Fotos**: pídelas al principio si el cliente las admite — se entrevista mejor mirándolas
   (`entrevista-propiedad.md`, regla 4).

## La entrevista

Recorrido guiado por paradas, no un cuestionario de campos. Banco completo en
`references/entrevista.md`; el orden lo manda lo que bloquea la publicación.

1. **Identificación** → título, `kind` (reventa/proyecto), operación, tipo y subtipo, ciudad.
   Es lo mínimo para crear el borrador: en cuanto lo tengas, **crea** y sigue entrevistando con
   `missing_for_publish` como guion.
2. **Ubicación** → sector (requerido), dirección, referencias de la cuadra, si se muestra la
   ubicación exacta.
3. **Números** → precio, si es negociable o "a consultar"; metros construidos/terreno y unidad.
4. **Recorrido** → habitaciones y baños (`room_types`), cocina, áreas sociales, balcón, parqueos.
5. **Amenidades** → barrido por grupos del catálogo `features`, proponiendo por tandas de 3-5.
6. **Estado y contexto** → año, condición (nueva/usada), piso y total de pisos, por qué vende,
   qué preguntó el último cliente.
7. **Descripción** → la redactas tú con lo confirmado, en la voz del asesor, y la apruebas con él.
8. **Fotos** → `list_media` antes de subir (evita duplicados), `upload_image` una por una.

En Claude Code usa AskUserQuestion para lo cerrado (operación, condición, unidad, disponibilidad)
y para las tandas de confirmación de amenidades. En otros clientes, preguntas numeradas.

## Redacción de la descripción

- **Solo con datos confirmados.** La descripción no es el lugar para "seguramente tiene".
- Estructura: qué es y para quién · lo que la distingue (lo mejor que no se ve en las fotos) ·
  entorno y accesos · estado y entrega. Frases cortas, sin superlativos vacíos
  (`copywriting.md`), con las palabras del asesor.
- Lo que el catálogo de `features` no admite pero el asesor confirmó va **aquí**, en texto, nunca
  como amenidad inventada — y si además es una amenidad reutilizable, se sugiere al catálogo
  (ver abajo).
- **Muestra el `pieza.md` COMPLETO** (plantilla en `templates/pieza.md`) y espera aprobación antes
  de persistir o publicar.
- Con aprobación: escribe `pieza.json` conforme a `schema/propiedad.schema.json`, regenera
  `pieza.md`, actualiza `meta.contentHash` y deja constancia en `meta.approvedAt` +
  `meta.approvedHash`. Nunca los escribas sin su "sí": en Claude Code el hook de pre-publicación
  frena `publish_property` sin aprobación vigente, y saltárselo a mano rompe la regla de oro.

## Publicación vía MCP

Detalle de cada tool, sus valores y sus errores en `references/flujo-mcp.md`.

1. `create_property_draft(title, kind, operation_type, property_type, property_subtype, city_id)`
   → `property_id` + `missing_for_publish`. Crea **en borrador** y no acepta ningún otro campo.
2. Completar por bloques, en cualquier orden, guiándote por `missing_for_publish` de cada respuesta:
   `set_property_location` · `set_property_pricing` · `set_property_details` · `set_property_rooms`
   · `set_property_features` · `set_property_availability`.
   Los bloques de lista (**rooms**, **features**, **galería**) **reemplazan** lo anterior: manda
   siempre la lista completa. `null` = no tocar ese campo.
3. **Amenidad confirmada que no está en el catálogo**: no se descarta y no se inventa el id — se
   canaliza con `suggest_property_feature(title, note, property_id)`. Si ya existía, la tool
   devuelve el feature y se asigna con `set_property_features`; si ya había una sugerencia igual
   pendiente, responde `conflict` ("ya está en cola", no es un fallo). **Mientras se aprueba, la
   amenidad se menciona en la descripción** (`set_property_details`) para que la información no se
   pierda, y se le avisa al asesor: sugerencia enviada, el estado lo ve en su admin. Se sugiere
   **solo lo reutilizable entre propiedades** ("muelle privado", "planta solar"); un rasgo único de
   esta ficha ("el dueño deja los muebles") va solo en la descripción. Detalle y criterio en
   `entrevista-propiedad.md`. ⚠️ Tool **recién añadida al MCP**: si el sitio del asesor aún no la
   expone, degrada a solo-descripción y dile que pida el alta por soporte — nunca bloquees la carga.
4. Medios: `list_media` → `upload_image` (devuelve `media_id`, no asigna nada) →
   `set_property_cover_image` (**portada obligatoria para publicar**) y `set_property_gallery`
   (hasta 40, reemplaza la galería completa).
5. `publish_property(property_id)` cuando el asesor lo pida. Si falta un requerido responde
   `{ok:false, code:"unprocessable"}` con la lista exacta: complétalos y reintenta — **nunca
   publica a medias**. Para retirarla del aire: `unpublish_property`. Para "archivarla" sin
   retirarla: `set_property_availability` (vendida/rentada siguen publicadas como prueba social,
   pero salen de los listados). **No existe tool de borrado.**
6. Actualiza `meta`: `remoteId` al crear, `publishedAt` al publicar, `lastSyncedAt` y
   `contentHash` tras cada sync.

> **Idioma**: las tools de propiedades **todavía no aceptan `locale`** (retrofit pendiente,
> anotado en `docs/11-mcp.md` §7 del producto). Todo lo que escribas aquí va al **idioma
> principal del sitio del asesor**. Si te pide la ficha en otro idioma, dile la verdad: hoy se
> edita desde el admin de su sitio; por MCP llegará más adelante.

## Cierre de sesión

- Resume: estado (borrador/publicada), URL esperada (`/propiedades/<slug>`), qué quedó en
  `missing_for_publish` y qué quedó **pendiente de verificar en la próxima visita**.
- Ofrece commit descriptivo si hay git ("propiedad torre-serena-9b: amenidades y fotos");
  ofrece `git init` si no hay repo. Nunca push sin pedirlo.

## Errores frecuentes a evitar

- ❌ Preguntar "descríbeme la propiedad" y conformarte con habitaciones, baños y precio.
- ❌ Registrar como cierta una amenidad deducida (o vista en una foto) sin confirmación.
- ❌ Mandar el nombre de una amenidad, un sector o un tipo de espacio donde va un id.
- ❌ Inventar una amenidad que no está en el catálogo en vez de escribirla en la descripción.
- ❌ Mandar solo las habitaciones nuevas en `set_property_rooms`: la lista reemplaza, no suma.
- ❌ Publicar sin portada (falla), o publicar sin mostrar antes el borrador completo.
- ❌ Crear una propiedad que ya existía por no haber corrido `search_properties`.
- ❌ Rellenar metros o año "a ojo" para que desaparezca de `missing_for_publish`.
