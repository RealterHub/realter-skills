# Banco de preguntas — entrevista de un guion de video

Aplica `metodo.md` (propón para que confirme) y, según el tipo, `entrevista-propiedad.md`,
`entrevista-biografica.md` o `storytelling.md`. Tandas de 2-4 preguntas, lenguaje humano — nunca
nombres de campos. El orden de las tandas 3-4 depende del `videoType` (tabla en
`references/tipos-de-video.md`).

## Tanda 1 — Tipo y objetivo (siempre primero)

- "¿Qué video quieres hacer: un tour de una propiedad, un consejo de los tuyos en cámara, algo
  de una zona, un testimonio de cliente, o presentarte tú?" *(→ `videoType` — cerrada, ideal para
  AskUserQuestion)*
- "¿Para qué sirve este video — qué quieres que pase cuando alguien lo vea?" *(→ `objective`)*
- "¿Dónde lo vas a publicar: Reel, TikTok, YouTube, o en la página de la propiedad?" *(→
  `platforms` — puede ser más de uno; la duración objetivo sale de aquí y de la tabla de tipos)*
- Si `videoType = tour`: "¿de qué propiedad? dame el nombre o la zona" *(→ intenta
  `search_properties`/`get_property`; si no existe todavía, se ofrece cargarla con
  `cargar-propiedad` antes o se sigue con lo que el asesor cuente ahora)*

## Tanda 2 — El gancho (deducción → confirmación, el corazón de la entrevista)

Nunca "dame un gancho": se proponen candidatos concretos derivados del material ya reunido
(propiedad, brief de marca, lo dicho en Tanda 1) y el asesor elige o corrige.

- "Con lo que me diste, se me ocurren estos ganchos: **(A)** [visual + frase], **(B)** [visual +
  frase], **(C)** [visual + frase]. ¿Cuál te suena más tuyo, o mezclamos?"
- Ejemplos de ángulo para variar los candidatos: un dato sorprendente, una pregunta directa al
  espectador, la transformación (antes/después), la objeción que resuelve.
- Tras elegir: "te dejo dos variantes de este gancho por si quieres probar cuál engancha más
  cuando grabes — ¿la B la cambiamos de ángulo o la dejamos como respaldo tal cual?"
- Si el asesor no tiene nada claro: proponer 3-5 de una vez (`metodo.md` — tandas, no de uno en
  uno) y que dé sí/no/corrige a cada uno.

## Tanda 3 — El cuerpo (depende del tipo)

### `tour`
- Si hay ficha (`get_property`): "voy a seguir el recorrido real de tu visita. Del lobby a la
  terraza, ¿cuál es el orden en que se lo enseñarías a un cliente?"
- "De todo lo que tiene, ¿cuáles 3-4 cosas se enseñan en cámara y cuáles se quedan solo en la
  ficha escrita?" *(un video no repite la ficha completa; elige lo más fuerte)*
- "¿Qué se dice de cada espacio — una frase corta, no la descripción completa?"

### `educational`
- "¿Qué te preguntan por WhatsApp una y otra vez sobre esto? Dame la pregunta tal como te la
  hacen." *(la pregunta real, no un tema inventado)*
- "¿Cuál es tu respuesta de verdad? Cuéntamela como se la dirías a ese cliente."
- "¿Tienes un caso o una cifra tuya que lo respalde?" *(si no, se deja fuera — nunca se inventa)*
- Máximo 2-3 puntos: "de todo lo que me dijiste, ¿cuáles 2-3 son los que de verdad hacen falta en
  45 segundos? El resto lo dejamos para otro video."

### `neighborhood`
- "¿Qué la hace distinta de la zona de al lado — lo que dirías tú, no lo que dice un folleto?"
- "¿Colegios, comercios, transporte, algo puntual que solo sepa alguien que trabaja ahí?"
- "¿Para qué tipo de comprador es esta zona?"
- Si el brief ya tiene esta zona en `areasServed`: mostrar la `note` existente y preguntar "¿la
  uso tal cual o la actualizamos con algo más reciente?"

### `testimonial`
- "¿Ya tienes el permiso del cliente para grabarlo y publicarlo?" *(bloqueante: sin permiso, no
  se arma nada — igual que `cargar-testimonio`)*
- "¿Qué le preocupaba antes de trabajar contigo?" · "¿qué fue lo que más le ayudó?" · "¿qué le
  diría a alguien que está por decidir?" — **estas son las preguntas que el asesor le hará al
  cliente en cámara, no algo que el asesor conteste por él.**
- "¿Recuerdas alguna frase textual que ya te haya dicho, de cuando cerró? Esa suele ser el mejor
  gancho."

### `agentIntro`
- Aplica `entrevista-biografica.md` completa si aún no existe el brief con esos datos: origen,
  formación, carrera previa, años y números, hito memorable, origin story.
- "De todo eso, ¿cuál es el dato que más sorprende quien te conoce? Ese va al gancho."
- "¿Qué te distingue con prueba — no adjetivo?" *(si ya está en `differentiators` del brief, se
  propone desde ahí; si no, se pregunta y se ofrece llevarlo también al brief)*

## Tanda 4 — CTA

- "Cuando alguien termine de verlo y quiera actuar, ¿qué hace: te escribe por WhatsApp, comenta
  algo puntual, manda DM?" *(cerrada — el canal real lo confirma el brief de marca)*
- "¿Y qué le decimos exactamente? Recuerda: dice qué pasa después, no 'contáctame'."

## Tanda 5 — Tomas a grabar

- "Repasemos: ¿qué tomas necesitas conseguir para armar esto — cuáles son fáciles y cuáles
  requieren coordinar algo (acceso, cliente, hora del día)?"
- Se deriva un checklist de `blocks[].shot` + cualquier toma de repaso adicional que el asesor
  mencione (planos de repuesto, tomas B).

## Señales para repreguntar

| El asesor responde... | Repregunta |
| --- | --- |
| "Ponle un gancho llamativo, tú sabes" | "Te propongo tres concretos con lo que ya tengo — dime cuál se siente tuyo, no te pido que lo inventes tú." |
| Da 5+ puntos para un video de 30-45 s | "En 45 segundos caben 2-3 bien dichos. ¿Cuáles son los que de verdad no pueden faltar?" |
| Guion que suena a texto leído ("cabe destacar que...") | "Dilo en voz alta como se lo contarías a un amigo — eso es lo que escribo." |
| "Escríbeme tú la respuesta del consejo" (educational) | "Esa parte tiene que ser tu conocimiento real — cuéntamelo con tus palabras y yo lo ordeno, pero no puedo inventar tu experiencia." |
| No hay permiso confirmado del cliente (testimonial) | Se detiene ahí: sin permiso no se arma el guion, se le explica por qué. |
| "Ponle que lleva X años" sin estar seguro | "¿Lo confirmo así o lo dejamos pendiente de verificar?" — igual que con datos de propiedad. |
