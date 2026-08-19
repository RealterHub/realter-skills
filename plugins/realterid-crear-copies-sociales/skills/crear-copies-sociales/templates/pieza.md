<!-- NO EDITAR — generado por scripts/build-plugins.mjs desde src/skills/crear-copies-sociales/templates/pieza.md. Los cambios hechos aquí se pierden en el próximo build; edita la fuente. -->

# Copies sociales — {{content.property.title | "— propiedad sin título —"}}

> Vista legible generada desde `pieza.json` — **no editar a mano** (se regenera).
> Objetivo: {{content.objective | "— pendiente —"}} · Audiencia: {{content.audience | "— pendiente —"}}
> Propiedad: {{content.property.slug ? "/propiedades/" + content.property.slug : "sin slug"}}
> ({{content.property.propertyId | "— pendiente —"}})
> **Este pack es 100% local: no se publica en el sitio.** Cópialo y pégalo donde vayas a postear.

## Ángulo elegido

{{content.angle | "— pendiente —"}}

## Variantes del gancho (A/B)

{{#each content.hookVariants}}
- **{{text}}**{{#if note}} — *{{note}}*{{/if}}
{{/each}}
{{#if content.hookVariants vacío}}— sin variantes propuestas todavía —{{/if}}

---

{{#each content.platforms}}
## {{platform | mayúscula}}{{#if format}} · {{format}}{{/if}}

**Gancho**: {{hook | "— pendiente —"}}

**Copy**:

{{body | "— pendiente —"}}

**CTA**: {{cta | "— pendiente —"}}

**Hashtags**: {{hashtags | lista separada por espacios, o "sin hashtags todavía"}}

{{#if slides}}
**Slides del carrusel**:

{{#each slides}}
{{order}}. {{text}}
{{/each}}
{{/if}}

**Fotos sugeridas** (de la biblioteca del asesor — sugerencia, nada se sube ni se asigna):

{{#each mediaSuggestion}}
- `{{mediaId}}`{{#if note}} — {{note}}{{/if}}
{{/each}}
{{#if mediaSuggestion vacío}}— ninguna sugerida —{{/if}}

{{#if notes}}
**Notas de producción**: {{notes}}
{{/if}}

---
{{/each}}
{{#if content.platforms vacío}}*Todavía no hay ninguna plataforma trabajada.*{{/if}}

## Pendiente

{{#each content.pending}}
- {{question}}{{#if guess}} · *hipótesis sin confirmar: {{guess}}*{{/if}}
{{/each}}
{{#if content.pending vacío}}— nada pendiente —{{/if}}

## Lectura como audiencia que scrollea

*Se hace ANTES de pedir aprobación (metodo.md §2): ¿el gancho detiene el pulgar? ¿queda claro qué
se ofrece sin ver la foto? ¿el CTA dice qué hacer? Ver banco completo en `references/entrevista.md`.*

{{meta.consumerReview.passedAt | "pendiente"}}{{#if meta.consumerReview}} · {{meta.consumerReview.pasadas}} pasada(s) · {{meta.consumerReview.veredicto}}{{/if}}

{{#each meta.consumerReview.preguntas}}
- {{pregunta}} → {{responde ? "sí responde" : "NO responde"}}
{{/each}}

---

*Falta para cerrar el pack*: {{lista legible de lo requerido sin confirmar (property.propertyId,
objective, audience, al menos una plataforma con hook+body+cta), o "nada — listo para aprobar"}}
*Aprobado por el asesor*: {{meta.approvedAt | "todavía no"}}
