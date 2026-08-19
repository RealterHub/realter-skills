# Método — cómo trabaja TODA skill de RealterID

> Guía compartida del plugin. **La leen todas las skills antes de empezar**, sin excepción.
> Las guías de entrevista (`entrevista-biografica.md`, `entrevista-propiedad.md`) aplican este
> método a un territorio concreto; las de redacción (`copywriting.md`, `storytelling.md`,
> `seo-basico.md`) dicen cómo se escribe lo que aquí se decide.

Tres principios, en este orden: **propón para que confirme** · **evalúa como el consumidor
final** · **archivo primero, MCP al final**.

---

## 1. Deducción → confirmación (en todo, no solo en propiedades)

**Confirmar es fácil; producir en frío es difícil.** El asesor no es redactor ni catalogador: si
la skill le pide que genere ("dame tus tres propuestas de valor", "descríbeme la propiedad",
"¿cuál es tu tono?"), entrega poco y genérico. Si le pide que **juzgue** lo que tú propones,
corrige con precisión y de paso recuerda cosas que no sabía que tenía.

El movimiento es siempre el mismo:

1. **Reúne el contexto disponible**: brief de marca (`get_brand_foundations`), lo ya dicho en la
   conversación, el archivo local de la pieza, las fotos que mandó, el tipo de contenido.
2. **Propón lo plausible**, en tandas de 3-5 candidatos y agrupado, no de uno en uno.
3. **Que confirme, corrija o niegue.** Su corrección suele ser el material bueno.
4. **Registra solo lo confirmado.**

> **REGLA DURA E INVARIANTE: nada deducido se registra sin confirmación explícita.** Proponer es
> el método; dar por cierto lo propuesto es inventar datos del usuario, que es la línea que
> ninguna skill de este plugin cruza. Un "creo que sí" no es un sí: queda pendiente.

Cómo se ve por skill:

| Skill | En vez de pedir… | Propón para confirmar |
| --- | --- | --- |
| `fundamentos-de-marca` | "dame tus diferenciadores" | "de lo que me contaste saco tres: *X*, *Y*, *Z*, con estas pruebas. ¿Cuál es cierto y cuál sobra?" |
| `crear-servicio` | "escríbeme los beneficios" | "para este servicio, los beneficios que se sostienen con lo que ya me diste serían estos tres, redactados así. ¿Los ajusto?" |
| `escribir-articulo` | "¿de qué escribimos?" | "con tu especialidad y tus objeciones frecuentes, tres ángulos posibles y para quién es cada uno. ¿Cuál te suena?" |
| `cargar-propiedad` | "descríbeme la propiedad" | "torre de 2020 en esa zona: lobby 24h, planta full, gym, dos parqueos. ¿Cuáles tiene?" |
| `cargar-testimonio` | "resume lo que dijo el cliente" | Transcribir literal y confirmar; **aquí no se deduce contenido**, solo se ordena lo textual |
| `editar-paginas` | "¿qué pongo en el hero?" | "con tu propuesta de valor, el hero diría esto. ¿Lo dejamos o le cambias el enfoque?" |

## 2. Evaluación como consumidor final (el criterio de terminado)

**Una pieza no está terminada cuando el formulario está lleno: está terminada cuando le sirve a
quien la va a leer.** Antes de dar por cerrado cualquier borrador, la skill hace una **lectura
como cliente**: se pone en el lugar del consumidor real, se hace sus preguntas y comprueba si el
material las responde.

### Mecánica (obligatoria antes de aprobar)

1. **Simula 3-5 preguntas** del consumidor real de esa pieza (tabla abajo).
2. **Marca cuáles NO responde** el borrador.
3. **Nueva tanda de indagación dirigida exactamente a esas**, aplicando el principio 1 (propones,
   confirma). No una ronda genérica de "¿algo más?".
4. **Comunica tu evaluación en voz alta**: *"leyéndolo como comprador que vive fuera, me faltaría
   saber si los parqueos vienen en título y qué se ve desde el balcón"*. El usuario entiende para
   qué preguntas otra vez.
5. **Tope sano: 2-3 pasadas.** Si tras eso sigue faltando material, se **lista lo pendiente** y
   decide el usuario: publicar así o dejarlo en borrador. Insistir más quema al asesor y no mejora
   la pieza.

El usuario **siempre puede cortar**: si dice "publícalo así", se publica así (y lo pendiente
queda anotado). Insistir es un servicio, no un permiso para bloquear.

### Se registra en la pieza: `meta.consumerReview`

La revisión no es un gesto mental: queda escrita en el archivo, junto a la aprobación.

```json
"consumerReview": {
  "passedAt": "2026-08-19T16:00:00Z",
  "pasadas": 2,
  "preguntas": [
    { "pregunta": "¿Puedo decidir si la visito con esto?", "responde": true },
    { "pregunta": "¿Qué se ve desde el balcón?", "responde": false }
  ],
  "veredicto": "Leyéndolo como comprador remoto, faltaba la vista y el estado de la cocina; pregunté por las dos."
}
```

**Orden forzado: `consumerReview` primero, `approvedAt` después.** La aprobación del usuario
presupone que la revisión se hizo **y se le comunicó** — aprobar antes de que existiera la
revisión significa que aprobó a ciegas. Una aprobación anterior a la revisión no vale: se le
cuenta el veredicto y se le pide que apruebe otra vez.

`fundamentos-de-marca` es la excepción documentada: el brief **no tiene consumidor final** (su
lector es un LLM) y su estándar de completitud es `missing_for_brief`, así que su pieza no lleva
`consumerReview`.

### Las preguntas del consumidor, por tipo de contenido

| Pieza | Quién la lee | Sus preguntas |
| --- | --- | --- |
| **Propiedad** | Comprador, muchas veces a distancia | "¿Puedo decidir si la visito con esto?" · "¿Cuánto cuesta de verdad y es negociable?" · "¿Dónde está y qué hay alrededor?" · "¿En qué estado está?" · "¿Qué NO me están contando?" |
| **Servicio** | Alguien que compara tres asesores | "¿Esto resuelve mi problema exacto?" · "¿Por qué él y no otro?" · "¿Qué pasa si lo contrato: cuál es el primer paso?" · "¿Tiene pruebas o solo adjetivos?" |
| **Artículo** | Alguien que buscó en Google | "¿Me respondió lo que vine a buscar, y en los primeros párrafos?" · "¿Esto lo sabe alguien que trabaja el mercado o es genérico?" · "¿Qué hago ahora con esto?" |
| **Sobre mí / marca** | Cliente decidiendo a quién escribirle | "¿Quién es y por qué debería confiar?" · "¿Ha hecho esto antes, con números?" · "¿Trabaja lo mío, en mi zona y en mi rango?" |
| **Testimonio** | Cliente escéptico | "¿Suena a persona real?" · "¿Dice qué problema tenía y qué pasó?" |
| **Página** | Visitante que llegó de un anuncio | "¿Entiendo en 5 segundos qué ofrece?" · "¿Sé cómo contactarlo?" |

### Rúbrica (los cuatro ejes, aplican a toda pieza)

| Eje | Se cumple cuando… | Señal de que falta |
| --- | --- | --- |
| **Concreción** | Hay datos verificables: números, años, zonas, materiales, plazos | Todo son adjetivos y categorías ("amplio", "excelente ubicación") |
| **Diferenciación** | La competencia no podría firmar el mismo texto | Cambiando el nombre serviría para cualquier otro |
| **Evidencia** | Cada afirmación fuerte tiene su respaldo dicho por el usuario | Promesas sin prueba, cifras sin origen |
| **Respuesta a la intención** | Contesta las preguntas del consumidor de la tabla | El lector termina y le quedan dudas básicas |

Un eje flojo **no bloquea**: dispara una tanda dirigida. Lo que nunca se hace es **rellenar el
eje inventando** — eso convierte un hueco visible en una mentira invisible.

## 3. Archivo primero, MCP al final

**La pieza se construye e itera SIEMPRE en el archivo local** (`pieza.json` + su `pieza.md`,
convención en `workspace.md`), tanda a tanda. El archivo es la **memoria de trabajo**: al retomar
una sesión se relee y se sigue donde se quedó; cada respuesta del usuario lo actualiza.

**El MCP no se toca durante la entrevista.** Solo al final, con la pieza evaluada (principio 2) y
aprobada por el usuario (`meta.approvedAt`), la skill deriva del archivo el **script final** —la
secuencia ordenada de llamadas— **se lo muestra al usuario** y lo ejecuta.

### Por qué

Una entrevista que escribe al MCP tanda a tanda deja documentos a medias en el sitio del asesor,
gasta llamadas en datos que van a cambiar dos preguntas después, y pierde el hilo si la sesión se
corta. Con archivo, lo único que llega al sitio es la versión que el usuario aprobó.

### Excepción explícita: las LECTURAS sí van al principio

`get_brand_foundations` · `list_property_options` · `list_geography` · `list_media` ·
`search_*` · `get_*` son **insumo de la entrevista**, no escritura: se llaman al inicio y cuando
haga falta. La regla prohíbe **escribir** (`create_*`, `set_*`, `publish_*`, `upload_image`)
antes de la aprobación, no informarse.

### El script final

Antes de ejecutar nada, se muestra la lista de llamadas previstas, en orden, con lo esencial de
cada una — sección **"Script MCP"** del `pieza.md` (se regenera con el resto del archivo):

```
1. create_property_draft(title: "Apartamento en Piantini…", kind: "resale", …) → property_id
2. set_property_location(sector_id: "31", show_exact_location: false)
3. set_property_pricing(price: 285000, is_negotiable: true)
4. upload_image(alt: "Sala con vista al parque") ×6  → media_ids
5. set_property_cover_image(media_id: …)
6. publish_property(property_id)
```

Así el usuario ve **qué se va a mandar antes de mandarlo**, y si algo no cuadra se corrige en el
archivo, no en el sitio. Tras ejecutar, se actualizan `remoteId`, `publishedAt`, `lastSyncedAt` y
`contentHash`.

### Sin sistema de archivos (claude.ai, ChatGPT)

El "archivo" es el **bloque de contenido re-impreso actualizado en la conversación** después de
cada tanda: misma disciplina, mismo orden, misma aprobación antes del script. Al cerrar se ofrece
el `pieza.json` descargable para que el asesor lo lleve a un workspace cuando lo tenga.

---

## El ciclo completo, de una ojeada

```
leer contexto (brief + catálogos + archivo existente)      ← lecturas MCP permitidas
      ↓
proponer  →  confirmar  →  escribir el ARCHIVO             ← se repite por tanda
      ↓
evaluar como consumidor final  →  ¿faltan respuestas? → tanda dirigida (máx. 2-3 pasadas)
      ↓
registrar meta.consumerReview (+ comunicar el veredicto)
      ↓
mostrar el borrador COMPLETO  →  aprobación explícita (meta.approvedAt + approvedHash)
      ↓
derivar y mostrar el SCRIPT MCP  →  ejecutar  →  actualizar meta
```

En Claude Code hay hooks que sostienen este orden: uno frena `publish_*` y otro las escrituras
`create_*`/`set_*` cuando la pieza local en curso no tiene `consumerReview` + `approvedAt`
vigentes. Quedan fuera a propósito `upload_image`, `suggest_property_feature` y `set_brand_*`
—ocurren durante la entrevista— y las escrituras sin pieza local correspondiente, que solo
reciben un aviso (una edición puntual no merece el ritual completo).

Dos honestidades sobre esos hooks: **solo verifican que los pasos quedaron registrados, no que
fueran buenos** —la calidad la ponen el método y el criterio del usuario—, y **solo existen en
Claude Code**. En claude.ai y ChatGPT esta guía se cumple igual, sin red de seguridad.
