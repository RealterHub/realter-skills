<!-- NO EDITAR — generado por scripts/build-plugins.mjs desde src/skills/crear-guion-video/templates/pieza.md. Los cambios hechos aquí se pierden en el próximo build; edita la fuente. -->

# Guion: {{content.subject.title | "— sin título —"}}

> Vista legible generada desde `pieza.json` — **no editar a mano** (se regenera).
> Tipo: {{content.videoType | "— pendiente —"}} · Plataformas: {{content.platforms | lista o "— pendiente —"}}
> · Duración estimada: {{content.targetDurationSeconds | "—"}} s
> · **Esta pieza no se publica al sitio**: es el guion para grabar y subir a redes por fuera de este plugin.

**Objetivo**: {{content.objective | "— pendiente —"}}

{{#if content.subject.kind == "property"}}
**Propiedad**: {{content.subject.title}} ({{content.subject.propertySlug | content.subject.propertyId | "sin ficha vinculada"}})
{{/if}}

## Gancho (0-3 segundos)

{{#each content.hooks}}
### Variante {{label}}
- **Visual**: {{visual}}
- **Voz**: "{{verbal}}"
- **Texto en pantalla**: {{onScreenText | "—"}}
{{/each}}
{{#if content.hooks vacío}}— pendiente: se proponen 2-3 candidatos y el asesor elige (metodo.md) —{{/if}}

## Guion (toma ↔ voz / texto en pantalla)

| # | Toma / plano | Voz en off | Texto en pantalla | Duración |
| --- | --- | --- | --- | --- |
{{#each content.blocks}}
| {{@index+1}} | {{shot}} | {{voiceover | "—"}} | {{onScreenText | "—"}} | {{durationSeconds | "—"}} s |
{{/each}}
{{#if content.blocks vacío}}*— sin bloques todavía —*{{/if}}

{{#if content.videoType == "educational"}}
## Conocimiento del asesor (base del video)

- **Le preguntan**: {{content.advisorKnowledge.question | "— pendiente —"}}
- **Su respuesta real**: {{content.advisorKnowledge.answer | "— pendiente —"}}
- **Respaldo**: {{content.advisorKnowledge.evidence | "sin cifra/caso propio — no se inventa uno"}}
{{/if}}

{{#if content.videoType == "testimonial"}}
## Permiso del cliente

{{content.testimonialConsent.confirmed ? "Confirmado" : "⚠️ SIN CONFIRMAR — no se graba sin esto"}}
{{#if content.testimonialConsent.note}} — {{content.testimonialConsent.note}}{{/if}}
{{/if}}

## CTA de cierre

**"{{content.cta.text | "— pendiente —"}}"** → {{content.cta.action | "— pendiente —"}}

## Tomas a grabar (checklist)

{{#each content.shotList}}
- [ ] {{.}}
{{/each}}
{{#if content.shotList vacío}}*— se deriva de los bloques cuando el guion esté armado —*{{/if}}

## Notas

{{content.notes | "sin notas adicionales"}}

## Lectura como espectador

*¿Los primeros 3 segundos detienen el scroll? ¿Se entiende sin audio? ¿Cumple lo que promete el
gancho? ¿Suena a persona real, no a guion leído? ¿Queda claro qué hacer al terminar?*

{{meta.consumerReview.passedAt | "pendiente"}}{{#if meta.consumerReview}} · {{meta.consumerReview.pasadas}} pasada(s) · {{meta.consumerReview.veredicto}}{{/if}}

---

*Aprobado por el asesor para grabar/publicar*: {{meta.approvedAt | "todavía no"}}
