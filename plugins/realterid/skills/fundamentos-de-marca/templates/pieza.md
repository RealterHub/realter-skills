# Fundamentos de marca — {{nombre del asesor o del sitio}}

> Vista legible generada desde `pieza.json` — **no editar a mano** (los cambios se hacen
> conversando con la skill o editando el json; este archivo se regenera).
> Última sincronización con el sitio: {{meta.lastSyncedAt | "nunca"}}.

## Propuesta

**Propuesta de valor**

{{content.positioning.valueProposition | "— pendiente —"}}

**Cliente ideal**

{{content.positioning.idealClient | "— pendiente —"}}

**A quién no le sirvo**

{{content.positioning.notIdealClient | "— pendiente —"}}

**Objeciones frecuentes y mi respuesta**

{{#each content.positioning.clientObjections}}
- **"{{objection}}"** → {{response}}
{{/each}}

## Voz

**Tono**

{{content.voice.toneDescription | "— pendiente —"}}

**Trato**: {{content.voice.addressForm | "— pendiente —"}}

**Palabras que uso**: {{content.voice.wordsToUse | lista separada por " · "}}

**Palabras que evito**: {{content.voice.wordsToAvoid | lista separada por " · "}}

**Frases mías, textuales**

{{#each content.voice.samplePhrases}}
> {{.}}
{{/each}}

**Reglas de contenido (lo que la IA nunca dirá en mi nombre)**

{{content.voice.contentRules | "— pendiente —"}}

## Diferenciadores y prueba

{{#each content.evidence.differentiators}}
- **{{claim}}**
  Prueba: {{evidence}}
{{/each}}

**Trayectoria en números**

{{content.evidence.trackRecord | "— pendiente —"}}

## Mercado

**Especialidades**

{{#each content.market.specialties}}
- **{{name}}**{{#if detail}} — {{detail}}{{/if}}
{{/each}}

**Zonas**

{{#each content.market.areasServed}}
- **{{name}}**{{#if note}} — {{note}}{{/if}}
{{/each}}

**Rango de precios típico**: {{content.market.typicalPriceRange | "— pendiente —"}}

---

*Pendiente de completar*: {{missing_for_brief como lista legible, o "nada — brief completo"}}
