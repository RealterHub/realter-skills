<!-- NO EDITAR — generado por scripts/build-plugins.mjs desde src/skills/crear-copies-sociales/references/entrevista.md. Los cambios hechos aquí se pierden en el próximo build; edita la fuente. -->

# Banco de preguntas — pack de copies sociales

Aplica el método (`metodo.md`): deducción→confirmación, y evaluación como consumidor final — aquí
el consumidor es **la audiencia que scrollea**, no el comprador que decide visitar. La ficha de la
propiedad ya tiene la mayoría de los datos: esta entrevista es corta porque solo pregunta lo que
la ficha **no dice**.

**Antes de la primera pregunta**: `get_brand_foundations` (trato, vocabulario, `wordsToAvoid`),
la propiedad elegida (`get_property` o `search_properties`) y `list_media` de esa propiedad.

## Tanda 0 — Elegir la propiedad (si no viene dada)

- "¿Para cuál propiedad armamos el pack?" — si el asesor la nombra, `search_properties` con dos o
  tres palabras del título o la zona; si no, listar las 3-5 más recientes o preguntar el slug.
- Si la propiedad no tiene descripción, portada o está incompleta: decirlo. *"Esta ficha tiene
  poco material propio — puedo trabajar con lo que hay, pero el copy va a salir más corto. ¿Seguimos
  o completas primero con `cargar-propiedad`?"* Nunca inventar lo que falta en la ficha.

## Tanda 1 — Objetivo y audiencia (lo que la ficha no dice)

- "¿Este pack es para atraer compradores de ESTA propiedad, para usarla como ejemplo y captar
  propietarios que quieran vender contigo, o para tu marca personal?" *(→ `objective` — cerrada,
  ideal para AskUserQuestion; ver mejores-practicas-social.md §8: cambia el ángulo por completo)*
- "¿A quién le hablas con este post? Piensa en una persona real, no en 'todo el mundo'." *(→
  `audience` — si responde genérico, repreguntar: "¿joven o familia? ¿compra por primera vez o ya
  tiene experiencia? ¿local o alguien que compra desde fuera?")*
- "¿En qué plataformas la vas a postear?" *(→ `platforms[].platform` — Instagram, Facebook,
  TikTok, LinkedIn, X; cerrada, multi-selección)*

## Tanda 2 — El ángulo (deducción → confirmación)

Con la ficha, el brief (`specialties`/`areasServed`) y lo confirmado en `cargar-propiedad`, **propón
2-4 ángulos posibles** y que el asesor elija o corrija — nunca "¿de qué hablamos?" en frío:

- *"De esta ficha veo tres ángulos posibles: (1) la vista desde el balcón, (2) que está a 10
  minutos del colegio X, (3) que el edificio es del 2021 con planta full. ¿Cuál te sirve más para
  este post, o hay otro que prefieras?"*
- Si la ficha no da un ángulo fuerte, usa las preguntas de contexto de `entrevista-propiedad.md`
  (regla 3): *"¿qué es lo mejor que tiene y no se ve en las fotos?"*, *"¿qué te dijo el último
  cliente que la visitó?"* — ahí suele salir el gancho real.

## Tanda 3 — Ganchos (A/B)

- Propón 2-4 variantes de primera línea, cada una con una fórmula distinta (cifra específica,
  contraste, pregunta directa — `mejores-practicas-social.md` §1), y que el asesor elija cuál usar
  o las combine:
  - *"Con el ángulo del balcón, te propongo estos tres ganchos: (a) 'Un balcón de 4 m² con vista al
    mar — sí, cabe todo eso.' (b) '¿Café con vista al mar antes de las 7am? Aquí sí.' (c) 'Esta es
    la única unidad de la torre con vista despejada.' ¿Cuál te suena o los mezclamos?"*
- **REGLA DURA**: ningún gancho se registra en `hookVariants` sin que el asesor lo haya visto y
  aceptado. Proponer es el método; dar por bueno lo propuesto sin su "sí" es la misma línea que
  nunca se cruza en este plugin.

## Tanda 4 — Redacción por plataforma

Con ángulo y gancho confirmados, redacta tú cada bloque (`platforms[]`) siguiendo la estructura
gancho→vida→detalles→CTA de `mejores-practicas-social.md` §2 y el trato/vocabulario del brief.
Muestra el bloque, no lo des por bueno solo porque compiló:

- "Para Instagram te queda así: [gancho + copy + CTA + hashtags]. ¿Lo dejamos o cambiamos algo?"
- Si el asesor pidió Reel/TikTok: redacta el **gancho hablado** (primeros 2-3 segundos) distinto
  del texto de pantalla, y anota el ritmo en `notes` ("pausa después del gancho, cámara entra a la
  cocina").
- Si pidió carrusel: arma `slides[]` con un trabajo por slide (portada+gancho, features, entorno,
  CTA final) — nunca dos ideas en un slide.
- Hashtags: 3-5, mezclando genérico + formato/categoría + local real (nunca 20-30 genéricos).

## Tanda 5 — Fotos

- `list_media` de esta propiedad (o de la biblioteca general si no hay suficientes propias) y
  propone cuáles calzan con cada plataforma/slide: *"para la portada del carrusel yo pondría la del
  balcón con luz de tarde — ¿la tienes o prefieres otra?"*
- Solo **sugerencia** (`mediaSuggestion`): esta skill no sube ni asigna nada.

## Señales para repreguntar

| El asesor responde... | Repregunta |
| --- | --- |
| "Ponle lo de siempre" / "lo típico" | "Lo típico se pierde entre cien posts iguales. Dame UN detalle de esta unidad que no esté en otra — con eso armo el gancho." |
| "Para todo el mundo" (audiencia) | "Piensa en el último cliente real que te escribió por esto. ¿Quién era?" |
| Pide "última oportunidad" / urgencia sin base | "¿Eso es real — hay una oferta en curso o cambió el precio — o lo ponemos sin esa frase? Urgencia falsa es lo primero que un lector experimentado detecta." |
| Pide el mismo copy para todas las plataformas | "Puedo mantener el mismo ángulo, pero cada plataforma se lee distinto — te lo adapto en dos minutos, no cuesta nada." |
| Solo da specs (habitaciones, precio, m²) | "Eso ya está en la ficha. Cuéntame algo que viviste ahí o que te dijo el dueño — eso es lo que para el scroll." |
