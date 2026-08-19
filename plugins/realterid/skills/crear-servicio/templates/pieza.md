# Servicio: {{content.title | "— sin título —"}}

> Vista legible generada desde `pieza.json` — **no editar a mano** (se regenera).
> Estado: {{meta.publishedAt ? "publicado" : meta.remoteId ? "borrador en el sitio" : "solo local"}}
> · URL: /servicios/{{slug}} · Última sync: {{meta.lastSyncedAt | "nunca"}}

**Extracto** (cards y meta description de respaldo)

{{content.excerpt | "— pendiente —"}}

**Orden en la home**: {{content.order | 0}} · **Icono**: {{content.iconMediaId | "sin icono"}}

## Hero

{{content.hero.subtitle | "— pendiente —"}}

- Imagen: {{content.hero.imageMediaId | "sin imagen"}}
- Video: {{content.hero.videoUrl | "sin video"}}
- **CTA**: [{{content.cta.label | "—"}}] → {{content.cta.target | "—"}}{{#if content.cta.clusterId}} ({{content.cta.clusterId}}){{/if}}

## Por qué conmigo (propuestas de valor)

{{#each content.valueProps}}
### {{title}}
{{description}}
{{/each}}

## Editorial

{{#each content.editorialParagraphs}}
{{.}}

{{/each}}
*Imagen del editorial*: {{content.editorialImageMediaId | "sin imagen (irá a ancho completo)"}}

## Cómo funciona

{{#each content.processSteps}}
{{@index+1}}. **{{title}}** — {{description}}
{{/each}}

## Preguntas frecuentes

{{#each content.faqs}}
**{{question}}**

{{answer}}

{{/each}}

## Cierre

- Testimonios en esta landing: {{content.showTestimonials ? "sí" : "no"}}
- Contenidos relacionados: {{content.relatedClusterIds | lista o "ninguno"}}
- **CTA final**: {{content.finalCta.title | "— pendiente —"}} — {{content.finalCta.text | ""}}
  → {{content.finalCta.target | "—"}}{{#if content.finalCta.formId}} (formulario embebido {{content.finalCta.formId}}){{/if}}

## SEO

- meta_title: {{content.seo.metaTitle | "(cae al título)"}}
- meta_description: {{content.seo.metaDescription | "(cae al extracto)"}}

---

*Pendiente para publicar*: {{missing_for_publish como lista legible, o "nada — listo para publicar"}}
