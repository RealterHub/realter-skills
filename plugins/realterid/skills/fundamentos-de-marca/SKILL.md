---
name: fundamentos-de-marca
description: >-
  Entrevista al asesor inmobiliario y compila su brief de marca para IA (propuesta de valor,
  cliente ideal, voz, evidencia, mercado) en su sitio RealterID. Úsala cuando el asesor quiera
  definir o actualizar su marca, su tono, su cliente ideal o "cómo escribe la IA por mí".
  Interviews the real-estate advisor and compiles their brand-foundations brief for LLMs on
  their RealterID site. Use when the user wants to define or update their brand voice, value
  proposition, ideal client, differentiators or content rules.
version: 0.1.0
---

# Fundamentos de marca

Construye y mantiene el **brief de marca del asesor escrito para que lo lea un LLM**. Es la skill
fundacional: todas las demás leen este brief (`get_brand_foundations`) antes de redactar nada.
No es contenido del sitio público — nunca se renderiza; es la ficha que enseña a la IA a escribir
*como el asesor*.

## Regla de oro (aplica a todas las skills de este plugin)

**NUNCA inventes datos del asesor.** Lo que no haya dicho, se le pregunta; lo que no dé, queda
vacío y aparece en `missing_for_brief`. Un brief a medias es útil; un brief con relleno hace que
la IA publique mentiras con su nombre. Esto vale doble aquí: cada campo de este documento será
tratado como un hecho por todos los modelos que lo lean.

## Antes de empezar

1. **Lee las guías**: `references/storytelling.md` y `references/copywriting.md` si existen en esta
   skill (build para claude.ai) o `guides/` del plugin (Claude Code). Moldean qué preguntar.
2. **Workspace**: aplica `guides/workspace.md` (o `references/workspace.md`). Esta pieza vive en
   `perfil/fundamentos-de-marca/pieza.json`. Sin filesystem → modo degradado: trabaja en la
   conversación y publica directo vía MCP.
3. **Estado actual**: si hay conexión MCP al sitio del asesor (URL `/mcp` de su dominio), llama a
   `get_brand_foundations` ANTES de preguntar nada. Devuelve el brief actual y `missing_for_brief[]`
   (lo esencial que falta). Nunca es `not_found`: vacío significa "aún no escrito". Si además hay
   `pieza.json` local, compara con `meta.contentHash` y resuelve diferencias con el asesor.

## La entrevista

En **tandas de 2-4 preguntas agrupadas por bloque** (los cuatro bloques del schema:
`positioning`, `voice`, `evidence`, `market`). Los campos de `missing_for_brief` van primero.
En Claude Code usa AskUserQuestion cuando las opciones sean cerradas (p. ej. el trato); en otros
clientes, preguntas numeradas en texto. El banco de preguntas por campo está en
`references/entrevista.md` — pregunta en **lenguaje humano** (anécdotas, cifras, frases textuales),
no con nombres de campos.

Principios:

- Pide **ejemplos completos y frases textuales**, no adjetivos. "Dime una frase tuya real de un
  WhatsApp a un cliente" enseña más que "describe tu tono".
- Toda afirmación de diferenciación necesita su **prueba** (número, año, zona, caso). Sin prueba,
  pregunta por ella; si no la hay, el diferenciador no entra.
- El trato (tú/usted/vos) **jamás se asume**: cambia por país y es lo primero que delata un texto ajeno.
- Acepta respuestas desordenadas: el asesor puede soltar en una respuesta material de tres bloques.
  Tú clasificas; no lo obligues a seguir tu orden.

## La compilación (lo que hace distinta a esta skill)

El asesor habla en anécdotas; el brief se escribe **en formato-para-LLM**: denso, factual,
declaraciones directas en primera persona del asesor, ejemplos completos, cero adorno. Tú eres el
compilador. Reglas en `references/compilacion.md`. Ejemplo del contrato:

- Asesor dice: *"mira, yo lo que no soporto es que le vendan humo a la gente, yo si el proyecto
  está atrasado se lo digo de una"*
- Se compila a — `value_proposition` o `differentiators`: *"Informo atrasos y problemas del
  proyecto antes de que el cliente pregunte. No vendo lo que no compraría."*

Verifica cada dato compilado con el asesor si lo transformaste (números redondeados, frases
fusionadas). La estructura destino es `schema/fundamentos.schema.json` — deriva de ahí qué es
lista, qué es texto y los topes (p. ej. `differentiators` máx. 8, `evidence` mín. 20 caracteres,
`sample_phrases` máx. 10).

## Aprobación y persistencia

1. Genera la vista legible completa (plantilla en `templates/pieza.md`) y **muéstrala entera**
   al asesor antes de persistir nada.
2. Con su aprobación: escribe `pieza.json` (fuente de verdad, conforme al schema) y regenera
   `pieza.md`. Actualiza `meta.contentHash`.
3. **Ofrece publicar** al sitio vía MCP.

## Publicación vía MCP

Cuatro tools de escritura, una por bloque (mismos bloques que el schema):

| Tool | Campos |
| --- | --- |
| `set_brand_positioning` | `value_proposition`, `ideal_client`, `not_ideal_client`, `client_objections[]` (`{objection, response}`, máx. 10) |
| `set_brand_voice` | `tone_description`, `address_form` (`tu`\|`usted`\|`vos`), `words_to_use[]`, `words_to_avoid[]`, `sample_phrases[]`, `content_rules` |
| `set_brand_evidence` | `differentiators[]` (`{claim, evidence}`), `track_record` |
| `set_brand_market` | `specialties[]` (`{name, detail}`), `areas_served[]` (`{name, note}`), `typical_price_range` |

Semántica de escritura (idéntica en las cuatro): `null` = no tocar el campo · lista con elementos
= **reemplaza** la lista completa · `[]` = vacía la lista. Escribe solo los bloques que cambiaron.
Cada respuesta devuelve `missing_for_brief[]` actualizado: repórtalo al asesor como "lo que aún
falta para que tu brief sirva" y ofrece continuar la entrevista. Errores llegan como
`{ok: false, code}` — el mensaje es accionable, corrígete con él (p. ej. `unprocessable` por
evidencia corta o término duplicado). El brief es **monolingüe**: se escribe una vez, la IA traduce
al redactar en otros idiomas. El documento es único por sitio: no hay id que pasar.

Tras publicar con éxito: actualiza `meta` (`lastSyncedAt`, `contentHash`; este documento no tiene
`remoteId` ni `publishedAt` — siempre existe y siempre está vigente).

## Cierre de sesión

- Resume qué se escribió y qué queda en `missing_for_brief`.
- Workspace con git: ofrece commit descriptivo ("fundamentos: voz y diferenciadores").
  Sin repo: ofrece `git init` una vez. Nunca push sin pedirlo.
- Recuerda al asesor que las demás skills usarán este brief automáticamente.

## Errores frecuentes a evitar

- ❌ Rellenar `sample_phrases` con frases redactadas por ti "de ejemplo".
- ❌ Traducir el vocabulario del asesor a tu propio dialecto ("depa", "piso") — sus palabras van textuales.
- ❌ Escribir `words_to_avoid` genéricos que el asesor no dijo.
- ❌ Publicar sin mostrar el borrador completo.
- ❌ Un mismo término en `words_to_use` y `words_to_avoid` (el MCP lo rechaza; resuélvelo preguntando).
