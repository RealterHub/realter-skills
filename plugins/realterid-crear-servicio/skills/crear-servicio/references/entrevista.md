<!-- NO EDITAR — generado por scripts/build-plugins.mjs desde src/skills/crear-servicio/references/entrevista.md. Los cambios hechos aquí se pierden en el próximo build; edita la fuente. -->

# Banco de preguntas — entrevista de un servicio

Tandas de 2-4 preguntas por tema, requeridos de publicación primero. Lenguaje humano, nunca
nombres de campos. Las guías mandan sobre el estilo de pregunta: anécdotas y cifras
(storytelling), hechos sobre adjetivos (copywriting), búsquedas reales (seo-basico).

## Tanda 1 — El servicio y su cliente (title, excerpt)

- "¿Cómo le llamarías tú a este servicio, en tus palabras? ¿Qué resuelve exactamente?"
- "¿Quién te contrata esto? Piensa en el último cliente real que lo hizo."
- "Si ese cliente lo buscara en Google, ¿qué escribiría?" *(fija la intención de búsqueda; si salen dos intenciones, son dos servicios)*

## Tanda 2 — La promesa (hero, cta)

- "En una frase: ¿qué se lleva el cliente si te contrata esto?" *(hero.subtitle)*
- "Cuando alguien esté convencido, ¿qué quieres que haga: escribirte por WhatsApp, llenar tu formulario de contacto, o ver una página tuya concreta?" *(cta.target — cerrada, ideal para AskUserQuestion)*
- "¿Y qué debería decir el botón? Recuerda: describe qué pasa después ('Cuéntame qué buscas — respondo hoy'), no 'Contactar'."

## Tanda 3 — Por qué contigo (valueProps)

- "Dame 2 o 3 razones por las que este servicio contigo y no con otro — y la prueba de cada una (número, año, caso, zona)."
- Si sale un adjetivo: "¿Cómo se ve eso en una operación real? Cuéntame una."
- Si la razón se queda sin prueba, excava en su biografía con `entrevista-biografica.md`: "¿qué
  estudiaste?", "¿qué hacías antes de bienes raíces?", "¿cuántas operaciones de este tipo llevas?".
  Devuélvelo en espejo y pide confirmación ("vienes de construcción → sabes leer una obra en
  marcha; ¿lo usamos como razón?"). Lo que no confirme como suyo, no entra.

## Tanda 4 — Cómo funciona (processSteps)

- "Camíname tu proceso real, del primer mensaje a la entrega: ¿qué pasa en cada paso y qué haces tú?"
- "¿En cuál de esos pasos se te caen los clientes o aparecen los sustos? Eso hay que contarlo."

## Tanda 5 — La historia (editorial)

- "Cuéntame el mejor caso reciente de este servicio: qué problema traía el cliente, qué decidiste tú, cómo terminó (con dato)."
- "¿Qué error comete la gente cuando intenta esto sin asesor?" *(da el ángulo del editorial)*

## Tanda 6 — Preguntas reales (faqs)

- "¿Qué te preguntan por WhatsApp una y otra vez sobre esto? Dame 5-8, tal como te las escriben."
- "¿Y qué respondes tú? La primera frase de cada respuesta debe responder directo."

## Tanda 7 — Cierre (finalCta, showTestimonials, relatedClusterIds)

- "Al final de la página, ¿repetimos el mismo llamado o cambias el ángulo? ¿Quieres embeber tu formulario?"
- "¿Mostramos tus testimonios en esta página?" *(cerrada)*
- "¿Con qué zonas o temas tuyos conecta este servicio?" *(resolver contra list_service_link_targets; si no hay clusters, se omite sin dramatizar)*

## Tanda 8 — Imágenes

- "¿Tienes fotos para el encabezado y el bloque editorial, o usamos algo de tu biblioteca?" *(list_media primero; upload_image si manda nuevas; pedir descripción para el alt)*
- "¿Un video de presentación? Solo YouTube o Vimeo."

## Señales para repreguntar

| Respuesta | Repregunta |
| --- | --- |
| "Ponle lo típico" | "Lo típico no posiciona ni convierte. Dame UN caso tuyo real y con eso armo el resto." |
| Promesa sin control del asesor ("vendemos en 30 días") | "¿Eso lo puedes sostener siempre? ¿Lo bajamos a lo que sí controlas?" — y revisar content_rules del brief |
| Cifra de mercado sin fuente | "¿De dónde sale ese dato? Si es tuyo, lo firmamos como tuyo; si no, fuera." |
