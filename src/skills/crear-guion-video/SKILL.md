---
name: crear-guion-video
description: >-
  Escribe guiones de video para el asesor inmobiliario — reels, TikTok, tours de propiedad,
  videos educativos, de zona, testimonios y presentación del asesor — con gancho, estructura en
  dos columnas (toma/plano ↔ voz y texto en pantalla) y CTA, en la voz de su marca. Entrega un
  archivo local listo para grabar; no publica nada al sitio. Úsala cuando el asesor quiera crear,
  escribir o mejorar el guion de un video, reel o TikTok. Writes video scripts for real-estate
  advisors — reels, TikTok, property tours, educational or neighborhood videos, testimonials,
  agent intros — with hook, two-column shot/voiceover structure and CTA, in the advisor's brand
  voice. Local deliverable only; does not publish to the site. Use when the user wants to write
  or improve a video script for social media.
version: 0.1.0
---

# Crear guion de video

Convierte una idea de video —o una propiedad ya cargada— en un guion listo para grabar: gancho de
los primeros 3 segundos (con 2 variantes), cuerpo en dos columnas (toma/plano ↔ voz en off /
texto en pantalla), duración estimada por bloque, CTA y checklist de tomas. **No publica nada al
sitio del asesor**: el entregable es 100% local — lo que sigue (grabar, editar, subir a la red)
pasa fuera de este plugin.

## Método (obligatorio)

Esta skill sigue el **método común de RealterID**, en `references/metodo.md` (viaja dentro de
esta misma skill). Léelo antes de la primera pregunta. En corto:

1. **Propón para que confirme.** No le pidas al asesor "dame un gancho" o "dame el guion" en
   frío: propón 2-3 conceptos/ganchos concretos derivados de la propiedad, del brief o de lo que
   ya contó, y que él elija, corrija o niegue. **Nada deducido se registra sin su "sí".**
2. **Evalúa como el consumidor final** — aquí, **el espectador que ve el video en su feed** —
   antes de dar el guion por terminado: simula sus 3-5 preguntas (¿me detienen los primeros 3
   segundos? ¿se entiende sin audio?), mira cuáles no responde el guion y haz una tanda dirigida a
   eso (máx. 2-3 pasadas; después, lista lo pendiente y decide el asesor).
3. **Archivo primero, MCP al final.** Con la diferencia de esta skill: **el "MCP al final" aquí
   son solo lecturas** (`get_brand_foundations`, `get_property`) — no hay escritura ni
   publicación al sitio porque no existe esa tool. El guion vive y termina en el archivo local.

## Regla de oro

**NUNCA inventes datos ni conocimiento del asesor.** Ni cifras de una propiedad que no confirmó,
ni un consejo "educativo" genérico que él no dio, ni una frase de un cliente que no dijo, ni un
hito de su biografía que no contó. Puedes **proponer** ganchos, estructura y redacción — para eso
está la skill — pero todo hecho, dato o palabra de otra persona dentro del guion salió de su boca.
Un guion corto y cierto se graba; uno largo e inventado se cae frente a la cámara.

## Antes de empezar

1. **`get_brand_foundations` SIEMPRE primero** (si hay conexión MCP). `addressForm` (tú/usted/vos)
   y `wordsToAvoid`/`contentRules` son **ley** — un guion con el trato equivocado suena a otra
   persona en cuanto el asesor lo lee en voz alta. `samplePhrases` es oro: son frases que YA
   suenan naturales en la boca del asesor, la mejor fuente para que el guion no suene a IA. Si el
   brief está vacío en lo esencial, sigue igual (no bloquea) y avísale que `fundamentos-de-marca`
   mejoraría el resultado.
2. **Si el video es de una propiedad** (`videoType='tour'`, o cualquier otro que la use de
   ejemplo): busca la ficha con `search_properties`/`get_property` **antes de preguntar lo que ya
   está confirmado ahí** — habitaciones, amenidades, ubicación, lo mejor que no se ve en fotos. Si
   la propiedad no existe todavía en el sitio, ofrece cargarla primero con `cargar-propiedad`, o
   sigue con lo que el asesor cuente ahora (nunca inventes lo que la ficha no tiene).
3. **Solo lecturas MCP** (`references/flujo-mcp.md`). `get_brand_foundations` y `get_property` son
   insumo, se llaman al inicio. Esta skill **no llama `create_*`, `set_*` ni `publish_*` de ningún
   tipo**: no existe una tool de video en el MCP del sitio, y aunque existiera, el guion es un
   documento de trabajo para grabar — no contenido publicable tal cual. Nada de esta skill escribe
   en el sitio del asesor.
4. **Guías**: `references/mejores-practicas-video.md` (esta skill; gancho, retención, ritmo
   hablado, subtítulos, CTA, errores — **léela siempre**) y `references/tipos-de-video.md`
   (estructura y duración por tipo — decide qué preguntar en la Tanda 3). Según el tipo de video:
   `storytelling.md` (problema→decisión→resultado, sobre todo en testimonio, presentación del
   asesor y editorial de educativos), `copywriting.md` (CTA que dice qué pasa después, específico
   > superlativo), `entrevista-propiedad.md` (tour: recorrido real de la visita, no el orden de
   la ficha) y `entrevista-biografica.md` (presentación del asesor y, cuando falta prueba, el
   consejo educativo). Todas viven en `references/` de esta misma skill, en cualquiera de los dos
   formatos.
5. **Workspace** (`workspace.md`), con una variante propia de esta skill:
   - Video de una propiedad → `propiedades/<slug>/guiones/<fecha>-<tipo>/pieza.json` (anidado
     **dentro** de la carpeta de esa propiedad, si `cargar-propiedad` ya la creó; si no, créala
     igual — no hace falta que la propiedad tenga su propia pieza local para guionar sobre ella).
   - Video genérico (educativo, presentación, zona sin ficha) →
     `guiones/<fecha>-<slug-tema>/pieza.json`.
   - `<fecha>` en `AAAA-MM-DD`; `<tipo>` es el `videoType` en kebab-case
     (`tour`, `educational`, `neighborhood`, `testimonial`, `agent-intro`, `other`);
     `<slug-tema>` sale del `content.subject.title` genérico.
   - Si la carpeta ya existe, es una edición: carga el `pieza.json` y sigue donde quedó.
   - Sin filesystem → modo degradado (ver abajo).

## La entrevista

Tandas de 2-4 preguntas; banco completo en `references/entrevista.md`. En Claude Code usa
AskUserQuestion para lo cerrado (`videoType`, `platforms`, `cta.action`); en otros clientes,
preguntas numeradas.

1. **Tipo y objetivo** (siempre primero) → `videoType`, `objective`, `platforms`,
   `targetDurationSeconds` (de `references/tipos-de-video.md`), y si aplica, la propiedad.
   En cuanto tengas esto, **crea el archivo** (campos vacíos donde falte) para no perder el hilo
   entre tandas — no hay "borrador remoto" que crear, así que el archivo local ES el borrador
   desde la primera respuesta.
2. **El gancho** → propón 2-3 candidatos concretos (visual + verbal + texto en pantalla cada uno),
   derivados de la propiedad/brief/lo ya dicho. El asesor elige o corrige. El guion final sale con
   **2 variantes** listas (no una sola): la elegida y una de respaldo con otro ángulo, para que
   pruebe cuál engancha más al grabar.
3. **El cuerpo** → depende del `videoType` (`references/tipos-de-video.md` y
   `references/entrevista.md` tienen las preguntas específicas de cada uno). En `tour`, sigue el
   recorrido real de la visita; en `educational`, mina la pregunta y respuesta reales del asesor;
   en `testimonial`, arma la GUÍA de preguntas para el cliente en cámara — nunca le escribas el
   testimonio.
4. **CTA** → qué se le pide al espectador y por qué canal (confírmalo con el brief, no lo asumas).
5. **Tomas a grabar** → checklist derivado de los bloques más cualquier toma de repuesto.

## Redacción del guion

- **Se escribe para DECIRSE, no para leerse.** Frases cortas, ritmo de conversación (~130-150
  palabras/minuto), nada que suene a redactado si se lee en voz alta — léelo tú mismo antes de
  mostrarlo. Reglas y ejemplos en `references/mejores-practicas-video.md`.
- **Dos columnas siempre**: cada bloque de `content.blocks` es una toma/plano (qué se ve) junto a
  su voz en off y/o texto en pantalla (qué se dice/lee) — nunca un párrafo corrido de "guion".
- **El texto en pantalla no siempre repite la voz**: puede llevar el dato (precio, zona, m²)
  mientras la voz cuenta la historia. El guion tiene que entenderse completo en mute.
- Redacta con la voz del brief: trato correcto, `wordsToUse` textuales, cero `wordsToAvoid`,
  `contentRules` respetadas, y usa `samplePhrases` como referencia de cómo suena el asesor de
  verdad.
- **Muestra el `pieza.md` COMPLETO** (plantilla en `templates/pieza.md`) y espera aprobación antes
  de persistir la aprobación. Itera bloque a bloque si pide cambios.

## Evaluación como espectador (antes de dar el guion por terminado)

`metodo.md` §2, aplicado a este tipo de pieza: aquí el "consumidor final" es **quien va a ver el
video en su feed**, no el asesor. Simula sus preguntas reales, por ejemplo:

- "¿Los primeros 3 segundos me detienen el scroll?"
- "¿Se entiende sin audio, solo con lo que está en pantalla?"
- "¿El gancho cumple lo que promete, o es clickbait vacío?"
- "¿Suena a que lo dice una persona real, o a un guion leído?"
- "¿Sé exactamente qué hacer cuando termina?"

Marca cuáles NO responde el guion, haz una tanda dirigida a esas (máx. 2-3 pasadas), comunica el
veredicto en voz alta al asesor, y regístralo en `meta.consumerReview` **antes** de pedir la
aprobación. El usuario siempre puede cortar: si dice "así está bien", se aprueba así y lo
pendiente queda anotado.

## Aprobación y persistencia

Con la aprobación explícita del asesor sobre el `pieza.md` completo: escribe `pieza.json`
conforme a `schema/guion.schema.json`, regenera `pieza.md`, actualiza `meta.contentHash` y deja
constancia en `meta.approvedAt` (ahora) y `meta.approvedHash` (= ese `contentHash`). Si el
contenido cambia después, la aprobación caduca sola: se muestra el borrador otra vez. Nunca
escribas `approvedAt` sin su "sí" — no hay hook `gate-publish` que lo fuerce aquí (esta skill no
tiene `publish_*`), así que la disciplina es enteramente del método, no de una red de seguridad.

## Cierre de sesión

- Resume: tipo de video, plataformas, duración estimada, y si el guion quedó aprobado o con algo
  pendiente (de `meta.consumerReview` o de datos sin confirmar).
- **Recuerda que grabar, editar y subir es responsabilidad del asesor** — esta skill entrega el
  guion, no publica el video en ninguna red.
- Ofrece commit descriptivo si hay git ("guion tour torre-serena-9b: gancho y recorrido"); ofrece
  `git init` si no hay repo. Nunca push sin que el asesor lo pida.

## Modo degradado (claude.ai, ChatGPT — sin sistema de archivos)

Sin filesystem, esta skill se simplifica más que las que publican: no hay "publicar directo vía
MCP" al final porque no hay tool que publicar. El guion vive **en la conversación** — se
re-imprime completo tras cada tanda, se evalúa igual como espectador, se aprueba igual — y al
cerrar se entrega como bloque de texto (o archivo descargable si el cliente lo permite) para que
el asesor lo lleve a su grabación o a un workspace cuando tenga uno.

## Errores frecuentes a evitar

- ❌ Abrir el guion con el asesor presentándose ("hola, soy…") — mata el gancho.
- ❌ Un párrafo corrido de "lo que se dice" sin su columna de toma/plano: no es un guion de video,
  es un texto para leer.
- ❌ Escribir frases largas y formales que nadie diría mirando a una cámara.
- ❌ Inventar un consejo educativo, un dato de zona o una frase de cliente que el asesor no dio.
- ❌ Redactar el testimonio en vez de armar la guía de preguntas para que el cliente hable.
- ❌ Un solo gancho sin variante de respaldo.
- ❌ Un guion que no se entiende con el audio apagado (todo el mensaje solo en la voz).
- ❌ Aprobar sin haber hecho la lectura como espectador, o aprobar antes de esa lectura.
- ❌ Tratar de publicar el video vía MCP: no existe esa tool; el entregable es el archivo local.
