# Tipos de video — estructura, duración y de dónde sale el material

> Referencia de `crear-guion-video`. Cada tipo tiene el mismo esqueleto de pieza
> (`schema/guion.schema.json`: gancho → bloques → CTA → tomas), pero lo que se pregunta y de
> dónde sale el contenido cambia. Esta tabla es la que decide, tras la Tanda 1 de la entrevista,
> qué preguntas vienen después (`references/entrevista.md`).

## `tour` — Tour de propiedad

- **Objetivo típico**: generar visitas o consultas sobre una propiedad concreta.
- **Duración**: 60-90 s (property highlight puro: 15-30 s).
- **Plataforma típica**: reel, tiktok, página de la propiedad.
- **Material**: `get_property` (ficha ya publicada) o la entrevista de `cargar-propiedad` si aún
  no existe pieza — **nunca se re-entrevista desde cero lo que ya está confirmado**: se lee la
  ficha y solo se pregunta lo que el guion necesita y la ficha no tiene (ritmo del recorrido, qué
  toma es la más fuerte, qué se dice de cada espacio).
- **Estructura**: gancho con la toma más fuerte de la visita (no la fachada) → recorrido en el
  ORDEN real de la visita (`entrevista-propiedad.md`: llegada → social → cocina → habitaciones →
  amenidad diferencial) → precio/zona como texto en pantalla, no como apertura → CTA.
- **Gancho de ejemplo**: *"Esto es lo que nadie te enseña en las fotos del listado"* + toma del
  balcón con vista.

## `educational` — Talking-head educativo / consejo

- **Objetivo típico**: posicionar al asesor como experto; atraer leads con una duda concreta.
- **Duración**: 30-60 s (reel/tiktok/shorts); 3-8 min si el asesor quiere profundidad en YouTube.
- **Plataforma típica**: reel, tiktok, youtube shorts.
- **Material**: **la pregunta real que le hacen al asesor**, minada como en
  `entrevista-biografica.md` — nunca un tema genérico de blog ("5 consejos para comprar casa").
  La pregunta clave de la entrevista: *"¿qué te preguntan por WhatsApp una y otra vez sobre
  esto?"* (la misma técnica que `crear-servicio` usa para FAQs). La respuesta real del asesor,
  con su experiencia y sus casos, es el cuerpo del guion — la IA no la redacta desde cero.
- **Estructura**: gancho = la pregunta en texto en pantalla + una frase que promete la respuesta →
  2-3 puntos concretos (nunca más: en 45 segundos no caben cinco consejos) → un caso o cifra
  propia si el asesor la tiene → CTA.
- **Gancho de ejemplo**: *"¿La cuota inicial siempre es del 20%? No. Esto es lo que casi nadie
  sabe."*

## `neighborhood` — Video de zona / barrio

- **Objetivo típico**: posicionar al asesor como referente de una zona; atraer compradores que
  buscan esa área, a menudo desde fuera.
- **Duración**: 15-45 s (reel/tiktok); 3-8 min si es guía completa para YouTube.
- **Plataforma típica**: reel, tiktok, youtube.
- **Material**: `areasServed` del brief de marca (`get_brand_foundations`) como punto de partida —
  si el asesor ya declaró esa zona como especialidad, ahí hay contexto (`note` del brief); el
  resto (colegios, comercios, tráfico, tipo de comprador) se pregunta porque es conocimiento de
  calle, no de catálogo. **Nunca se inventan datos de la zona** (colegios, cifras de mercado,
  tiempos de trayecto) que el asesor no confirme — si no los tiene a mano, se dejan fuera.
- **Estructura**: gancho con lo más distintivo de la zona (no "hoy les hablo del sector X") →
  3-4 puntos con datos concretos (qué hay, para quién es, qué la distingue de la zona vecina) →
  CTA hacia el inventario de esa zona o hacia el asesor como su experto.

## `testimonial` — Testimonio de cliente (en video)

- **Objetivo típico**: prueba social con la voz real de un cliente.
- **Duración**: 30-60 s.
- **Plataforma típica**: reel, tiktok.
- **Material**: **aquí NO se redacta contenido** — la misma regla dura de `cargar-testimonio`
  aplicada a video: lo que dice el cliente en cámara es suyo, no se le escribe un libreto. Lo que
  SÍ construye esta skill es la **guía de preguntas para la grabación** (para que el asesor se la
  lleve a la entrevista con el cliente) y el plan de tomas. Confirmar SIEMPRE que el cliente dio
  permiso para aparecer y ser publicado antes de armar nada.
- **Estructura del guion**: no lleva "voiceover del asesor" en el cuerpo — los `blocks` son la
  **guía de preguntas** a hacer al cliente frente a cámara (problema → decisión → resultado, de
  `storytelling.md`) y las tomas de apoyo (b-roll de la propiedad, apretón de manos, entrega de
  llaves). El gancho es la frase más fuerte que el cliente ya dijo (si el asesor la recuerda) o,
  si no, una pregunta abierta al espectador ("¿te da miedo comprar sin ver antes?").
- **Preguntas típicas para el cliente en cámara**: "¿qué te preocupaba antes de empezar?" ·
  "¿qué fue lo que más te ayudó?" · "¿qué le dirías a alguien que está por decidir?"

## `agentIntro` — Presentación del asesor

- **Objetivo típico**: que un desconocido decida escribirle a ESTE asesor y no a otro tres
  perfiles similares.
- **Duración**: 30-60 s (reel/tiktok); 1-2 min si es el video fijado en el perfil o el sitio.
- **Plataforma típica**: reel, tiktok, fijado en perfil/sitio.
- **Material**: `entrevista-biografica.md` completa — origen, formación, carrera previa, años y
  números, hito memorable, por qué se dedicó a esto. Y `get_brand_foundations` para
  `differentiators` (con su prueba) y `specialties`. **Nunca "10 años de experiencia ayudando a
  la gente a cumplir sus sueños"** — eso lo firma cualquiera; el hecho concreto (de dónde viene,
  cuántas operaciones, en qué zona) es lo que diferencia.
- **Estructura**: gancho = el dato o la decisión más inesperada de su historia (no "hola, soy…")
  → 1-2 hechos concretos con prueba → una frase de propuesta de valor en sus palabras
  (`samplePhrases` del brief son oro aquí) → CTA.
- **Gancho de ejemplo**: *"Antes de vender casas, dirigía obras. Por eso soy el único que te dice
  qué defecto SÍ importa y cuál no."*

## `other` — Formato no listado

Cuando el asesor pida algo que no encaja arriba (detrás de cámara, celebración de cierre, reacción
a tendencia): se sigue el esqueleto genérico (gancho → bloques → CTA → tomas) y se pregunta
objetivo, duración y plataforma como con cualquier otro, sin forzar una estructura de la tabla que
no aplica. `references/mejores-practicas-video.md` sigue mandando sobre gancho, ritmo y CTA.
