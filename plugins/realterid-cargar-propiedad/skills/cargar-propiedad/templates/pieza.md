<!-- NO EDITAR — generado por scripts/build-plugins.mjs desde src/skills/cargar-propiedad/templates/pieza.md. Los cambios hechos aquí se pierden en el próximo build; edita la fuente. -->

# {{content.title | "— sin título —"}}

> Vista legible generada desde `pieza.json` — **no editar a mano** (se regenera).
> Estado: {{meta.publishedAt ? "publicada" : meta.remoteId ? "borrador en el sitio" : "solo local"}}
> · URL: /propiedades/{{slug}} · Disponibilidad: {{content.availability | "disponible"}}
> · Última sync: {{meta.lastSyncedAt | "nunca"}}

**{{content.propertySubtype label}}** · {{content.operationType label}} ·
{{content.kind == "project" ? "Proyecto" : "Reventa"}}

## Precio

{{content.pricing.priceOnRequest ? "Precio a consultar" : content.pricing.price | "— pendiente —"}}
{{#if content.pricing.isNegotiable}}· negociable{{/if}}
*(la moneda es la del sitio, no de la ficha)*

## Ubicación

- Ciudad / sector: {{content.location.cityId label}} · {{content.location.sectorId label | "— pendiente —"}}
- Dirección: {{content.location.addressLine | "sin dirección"}}
- Mapa: {{content.location.showExactLocation ? "punto exacto" : "solo la zona"}}

## Medidas y estado

| | |
| --- | --- |
| Construidos | {{content.details.builtArea | "—"}} {{content.details.measurementUnit | ""}} |
| Terreno | {{content.details.lotArea | "—"}} |
| Total | {{content.details.totalArea | "—"}} |
| Año | {{content.details.yearBuilt | "—"}} |
| Condición | {{content.details.condition == "new" ? "Nueva" : content.details.condition == "used" ? "Usada" : "—"}} |
| Piso / total | {{content.details.floor | "—"}} de {{content.details.totalFloors | "—"}} |

## Espacios

{{#each content.rooms}}
- {{label | roomTypeId}}: {{quantity}}
{{/each}}
{{#if content.rooms vacío}}— sin espacios declarados —{{/if}}

## Amenidades confirmadas

{{#each content.featureIds}}
- {{título del catálogo}} (`{{.}}`)
{{/each}}
{{#if content.featureIds vacío}}— ninguna confirmada todavía —{{/if}}

*Solo aparece aquí lo que el asesor CONFIRMÓ. Lo deducido sin confirmar vive en "Pendiente de
verificar", nunca en esta lista.*

**Sugeridas al catálogo** (confirmadas, aún sin id — mientras tanto van en la descripción)

{{#each content.suggestedFeatures}}
- {{title}}{{#if note}} — *{{note}}*{{/if}} · {{sentAt ? "enviada " + sentAt : "pendiente de enviar"}}
{{/each}}
{{#if content.suggestedFeatures vacío}}— ninguna —{{/if}}

## Descripción

{{content.description | "— pendiente —"}}

## Fotos

- Portada: {{content.media.coverMediaId | "— pendiente (obligatoria para publicar) —"}}
- Galería: {{content.media.galleryMediaIds | "sin fotos"}} ({{n}} de 40)

## Pendiente de verificar en la próxima visita

{{#each content.pending}}
- {{question}}{{#if guess}} · *hipótesis sin confirmar: {{guess}}*{{/if}}
{{/each}}
{{#if content.pending vacío}}— nada pendiente —{{/if}}

## Script MCP (lo que se va a mandar)

*Se muestra al asesor ANTES de ejecutar nada (metodo.md §3). Se regenera desde el archivo.*

```
{{secuencia de llamadas previstas, en orden, con sus valores clave — p. ej.
 1. create_*_draft(...) → id
 2. set_*(...)
 3. publish_*(id)}}
```

*Lectura como cliente*: {{meta.consumerReview.passedAt | "pendiente"}}{{#if meta.consumerReview}} · {{meta.consumerReview.pasadas}} pasada(s) · {{meta.consumerReview.veredicto}}{{/if}}

---

*Falta para publicar*: {{missing_for_publish como lista legible, o "nada — lista para publicar"}}
*Aprobada por el asesor*: {{meta.approvedAt | "todavía no"}}
