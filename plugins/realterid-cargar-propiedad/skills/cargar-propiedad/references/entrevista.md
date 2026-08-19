<!-- NO EDITAR — generado por scripts/build-plugins.mjs desde src/skills/cargar-propiedad/references/entrevista.md. Los cambios hechos aquí se pierden en el próximo build; edita la fuente. -->

# Banco de preguntas — carga de una propiedad

Aplica `entrevista-propiedad.md` (guía compartida): recorrido guiado, deducción→confirmación,
preguntas de contexto, fotos como fuente, catálogo como checklist e insistencia calibrada.
Aquí están las preguntas ya mapeadas a los campos que publica el MCP.

**Antes de la primera pregunta**: `list_property_options` (features y room_types) y
`list_geography`. Y si el cliente admite imágenes: *"mándame las fotos de la visita y te voy
preguntando sobre lo que vea"*.

## Tanda 1 — Identificación (lo mínimo para crear el borrador)

- "¿Qué es y dónde está? Dímelo como se lo dirías a un cliente por WhatsApp." *(→ título, subtipo, ciudad)*
- "¿Es una propiedad que ya existe o una unidad de un proyecto en desarrollo?" *(→ `kind`: resale | project — cerrada, ideal para AskUserQuestion)*
- "¿Se vende, se renta, es traspaso o renta vacacional?" *(→ `operation_type`)*
- "¿En qué ciudad?" *(→ `city_id` con list_geography; el sector viene en la tanda 2)*

⚠️ Con esto **ya se crea el borrador**: `create_property_draft`. El resto de la entrevista se
guía por el `missing_for_publish` que devuelve cada llamada.

## Tanda 2 — Llegada y ubicación

- "¿En qué sector exactamente?" *(→ `sector_id`, REQUERIDO para publicar)*
- "¿Cómo se llega? ¿Por cuál avenida o punto de referencia?" *(→ `address_line`)*
- "¿Qué hay en la cuadra: colegios, supermercado, parque, avenida principal?" *(→ descripción)*
- "¿Publicamos el punto exacto en el mapa o solo la zona?" *(→ `show_exact_location`, cerrada — jamás se asume)*

## Tanda 3 — Números

- "¿A qué precio sale?" · si no hay precio cerrado: "¿lo ponemos como 'precio a consultar'?" *(→ `price` / `price_on_request`)*
- "¿El dueño tiene margen para negociar?" *(→ `is_negotiable`; enlaza con "¿por qué vende?")*
- "¿Cuántos metros construidos? ¿Y de terreno, si aplica?" *(→ `built_area`, `lot_area`)*
- "¿Trabajamos en metros o en pies?" *(→ `measurement_unit`, REQUERIDO para publicar)*

## Tanda 4 — El recorrido (espacios)

Se camina la visita (tabla de paradas de la guía). Lo que se registra:

- "¿Cuántas habitaciones y cuántos baños completos? ¿Hay medio baño de visitas?" *(→ `rooms[]` con ids de room_types)*
- "¿El principal tiene baño propio y clóset walk-in?"
- "¿La cocina es abierta o cerrada? ¿Hay área de lavado o cuarto de servicio?"
- "¿Cuántos parqueos, techados o no? ¿Hay depósito?"
- "¿Balcón o terraza? ¿Qué se ve desde ahí?" *(la vista sale sola con esta pregunta)*

Recuerda: `set_property_rooms` **reemplaza** la lista completa — se manda entera cada vez.

## Tanda 5 — Amenidades (barrido del catálogo, por tandas de 3-5)

Agrupa por el `type` que devuelve el catálogo y **propón para confirmar**:

- *Seguridad e infraestructura*: "¿caseta o seguridad 24h, cámaras, planta eléctrica, cisterna, gas común?"
- *Áreas comunes*: "¿piscina, gym, área social, jacuzzi, cancha, área de niños, coworking?"
- *Confort de la unidad*: "¿aire acondicionado en todas, calentador, closets empotrados, ascensor privado?"
- Deducción con contexto: *"torre de 2020 en esa zona: lo normal es lobby con seguridad, planta full y gym. ¿Cuáles tiene esta?"*

Solo entra al `featureIds` lo que el asesor confirme. Lo que él confirme y **no exista en el
catálogo** se canaliza: `suggest_property_feature(title, note, property_id)` si es una amenidad
reutilizable entre propiedades, y **en todo caso** se menciona en la descripción para que no se
pierda mientras la curan. Rasgos únicos de esta propiedad ("el dueño deja los muebles") van solo
en la descripción, sin sugerir nada. Criterio completo en `entrevista-propiedad.md`.

- "Eso no está en el catálogo de amenidades. Lo mando como sugerencia para que lo agreguen y,
  mientras tanto, lo escribo en la descripción. El estado lo ves en tu admin."

## Tanda 6 — Estado y contexto (las preguntas que más rinden)

- "¿De qué año es (o cuándo se entrega)?" *(→ `year_built`)*
- "¿Está nueva o usada? ¿En qué estado la viste?" *(→ `condition` + material para la descripción)*
- "¿En qué piso está y cuántos pisos tiene el edificio?" *(→ `floor`, `total_floors`)*
- "¿Qué te llamó la atención al entrar?" *(acabados, luz, altura de techo)*
- "¿Por qué vende el dueño?" *(urgencia, negociabilidad, si está habitada)*
- "¿Qué preguntó el último cliente que la visitó?" *(objeciones = datos que faltan)*
- "¿Qué es lo mejor que tiene y no se ve en las fotos?" *(el gancho de la descripción)*
- "¿Está disponible, reservada, vendida o rentada?" *(→ `availability`)*

## Tanda 7 — Fotos

- "¿Cuántas fotos tienes? Mándalas y las subo." *(`list_media` antes, para no duplicar)*
- Por cada una: descripción real para el `alt` ("sala con vista al mar", nunca "foto 1").
- "¿Cuál quieres de portada?" *(obligatoria para publicar)*

## Señales para repreguntar (una vez por bloque)

| El asesor responde... | Repregunta |
| --- | --- |
| "Lo normal" / "lo de siempre" | "¿Lo normal de esa zona sería piscina, gym y planta full? Dime cuáles tiene esta." |
| "No sé" | "Lo dejo pendiente para tu próxima visita y sigo." *(va a `content.pending`, no a la ficha)* |
| "Creo que sí" | "¿Lo confirmo como que sí, o lo dejo pendiente hasta que lo verifiques?" — un 'creo' no publica. |
| "Ponle lo que se ve en la foto" | "De la foto propongo: piso de porcelanato, cocina abierta, tope claro. ¿Confirmas los tres?" |
| Solo da habitaciones, baños y precio | Arrancar el recorrido: "vamos a caminarla: llegas al edificio, ¿qué ves?" |
| "Después le pongo la descripción" | "La descripción y la portada son requisito para publicar; si quieres, la redacto con lo que ya me diste y la apruebas." |
