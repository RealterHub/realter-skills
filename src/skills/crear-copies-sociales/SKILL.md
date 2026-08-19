---
name: crear-copies-sociales
description: >-
  Genera un pack de copies de redes sociales (Instagram, Facebook, TikTok, LinkedIn, X) para una
  propiedad ya cargada en el sitio RealterID del asesor: entrevista corta sobre objetivo y
  audiencia, propone ángulos y ganchos desde la ficha y el brief de marca, redacta por plataforma
  con hashtags y sugerencia de fotos, y lo deja como pack local en el workspace — NO publica nada
  en el sitio (solo lecturas MCP). Úsala cuando el asesor quiera anunciar, promocionar o compartir
  una propiedad en redes. Generates a social media copy pack (Instagram, Facebook, TikTok,
  LinkedIn, X) for a property already loaded on the advisor's RealterID site — read-only via MCP,
  local deliverable. Use when the advisor wants to post or promote a listing on social media.
version: 0.1.0
---

# Crear copies sociales

Convierte una ficha de propiedad ya cargada en un **pack de copies listo para pegar** en redes:
gancho, cuerpo, CTA, hashtags y fotos sugeridas, por cada plataforma que el asesor elija. No crea
la propiedad ni la toca — la lee — y no publica nada en el sitio ni en redes: el entregable es
100% local, para que el asesor lo copie a donde vaya a postear.

## Método (obligatorio)

Esta skill sigue el **método común de RealterID**, en `references/metodo.md` (viaja dentro de
esta misma skill). Léelo antes de la primera pregunta. En corto:

1. **Propón para que confirme.** No le pidas al asesor "dame el ángulo del post": propón 2-4
   ángulos y ganchos plausibles desde la ficha de la propiedad y el brief de marca, y que él
   confirme, corrija o niegue. **Ningún gancho se registra sin su "sí".**
2. **Evalúa como el consumidor final** antes de dar el pack por terminado — aquí el consumidor es
   **la audiencia que scrollea**, no el comprador que decide visitar: simula sus 3-5 preguntas
   (abajo), mira cuáles no responde el borrador y haz una tanda dirigida a eso (máx. 2-3 pasadas;
   después, lista lo pendiente y decide el asesor).
3. **Archivo primero, nunca hay "MCP al final" aquí.** Todo se construye y se aprueba en la pieza
   local; esta skill **no tiene** ciclo de escritura al MCP — su único destino es el archivo. Las
   **lecturas** (`get_brand_foundations`, `get_property`/`search_properties`, `list_media`) sí van
   al principio: son insumo, no escritura.

## Regla de oro

**NUNCA inventes un dato de la propiedad ni un hecho de marketing.** Los ganchos y ángulos se
**proponen** (es el corazón de esta skill) pero **no se registran hasta que el asesor los
confirma**. Cifras, casos o urgencia que el asesor no dio no entran al copy — ver
`references/mejores-practicas-social.md` §9 (sobre-promesa, urgencia falsa, jerga vacía). Un post
corto y cierto convierte; uno inflado se cae en el primer comentario de alguien que conoce la zona.

**Esta skill SOLO LEE el MCP.** No crea, no actualiza y no publica nada en el sitio del asesor ni
en ninguna red social — eso lo hace el asesor a mano, o su herramienta de programación de posts.
Si en algún momento parece que hace falta un `create_*`/`set_*`/`publish_*`, algo se torció:
repasa `references/flujo-mcp.md`.

## Antes de empezar

1. **`get_brand_foundations` SIEMPRE primero** (si hay conexión MCP): trato, vocabulario del
   asesor (¿apartamento o departamento?, ¿parqueo o cochera?), `wordsToAvoid` y `contentRules` —
   son **ley dura**, igual que en cualquier otra skill del plugin. Si el brief está vacío en lo
   esencial, se avisa y se redacta igual, sin voz inventada de reemplazo.
2. **Guías**: `copywriting.md` (específico > superlativo, CTA que dice qué pasa después) y
   `storytelling.md` (la historia buena ya ocurrió) moldean cómo se escribe; `entrevista-propiedad.md`
   §3 (preguntas de contexto indirectas) es de donde sale un buen ángulo cuando la ficha no alcanza.
   `references/mejores-practicas-social.md` (propia de esta skill) es la que manda sobre formato,
   longitud, hashtags, emojis y CTA específicos de redes — léela antes de redactar el primer copy.
   Todas viven en `references/` de esta misma skill (el build las copia ahí, tanto en el plugin de
   Claude Code como en el zip de claude.ai).
3. **Elegir la propiedad**: `search_properties` si el asesor la nombra por título o zona; si no,
   ofrece las más recientes. Con el id o slug, `get_property` para la ficha completa. **Nunca se
   re-entrevista la propiedad aquí** — si falta algo clave (portada, descripción), se dice y se
   sugiere `cargar-propiedad` primero, no se rellena por su cuenta.
4. **Workspace** (`workspace.md`): el pack vive **anidado en la pieza de la propiedad**:
   `propiedades/<slug>/social/<fecha>-<objetivo>/pieza.json` + `pieza.md` (`<fecha>` en
   `YYYY-MM-DD`, `<objetivo>` uno de `captacion-compradores` / `captacion-propietarios` /
   `branding`). Si ya existe un pack con esa fecha y objetivo, es una edición: cárgalo y sigue
   desde ahí. Sin filesystem → modo degradado (abajo).
5. **Fotos**: `list_media` de la propiedad (o de la biblioteca general si hace falta) antes de
   proponer cuáles usar — nunca se inventa qué fotos hay.

## La entrevista

Corta a propósito: la ficha de la propiedad y el brief ya traen casi todo. Solo se pregunta lo que
ninguno de los dos dice. Banco completo en `references/entrevista.md`.

1. **Objetivo y audiencia** → `objective` (captación de compradores / de propietarios / branding —
   cerrada, cambia el ángulo por completo, ver `mejores-practicas-social.md` §8) y `audience` (a
   quién le habla este post en concreto, no "todo el mundo").
2. **Plataformas** → cuáles trabaja el asesor (Instagram, Facebook, TikTok, LinkedIn, X).
3. **Ángulo** → propón 2-4 desde la ficha, el brief y (si hace falta) las preguntas de contexto de
   `entrevista-propiedad.md` §3 ("¿qué es lo mejor que no se ve en las fotos?"). Que el asesor
   elija o corrija.
4. **Ganchos (A/B)** → propón 2-4 variantes de primera línea con fórmulas distintas (cifra
   específica, contraste, pregunta directa) para que el asesor elija o mezcle.
5. **Redacción por plataforma** → tú escribes cada bloque con la estructura gancho→vida→
   detalles→CTA; el asesor lo revisa bloque a bloque.
6. **Fotos** → sugerencias de `list_media`, con nota de por qué esa foto en esa pieza.

En Claude Code usa AskUserQuestion para lo cerrado (objetivo, plataformas, elegir entre ganchos
propuestos). En otros clientes, preguntas numeradas.

## Redacción

- **Un dato confirmado por post, cero relleno.** Todo lo que aparece en el copy sale de la ficha
  de la propiedad (ya confirmada por `cargar-propiedad`) o de lo que el asesor confirmó en esta
  misma sesión. Nada de "seguramente tiene", nada de cifras de mercado inventadas por el modelo.
- Estructura fija por bloque: **gancho** (para el scroll solo, sin la foto) → **vida/experiencia**
  (la escena, no la ficha) → **detalles clave** (los datos que la sostienen) → **CTA** (qué hacer
  después). Detalle completo en `references/mejores-practicas-social.md`.
- **Cada plataforma se adapta**, nunca se pega el mismo texto cinco veces: apertura y longitud por
  formato (§3), 3-5 hashtags mezclados no un bloque de 30 (§4), emojis como acento funcional no
  decoración (§5), slides de carrusel con un trabajo cada uno (§6), CTA que invita a escribir por
  DM/WhatsApp con el siguiente paso claro (§7).
- Trato y vocabulario del brief: `wordsToUse` textuales, cero `wordsToAvoid`, `contentRules`
  respetadas al pie de la letra — son ley dura, igual que en el resto del plugin.
- **Muestra el `pieza.md` COMPLETO** (plantilla en `templates/pieza.md`) y espera aprobación antes
  de darlo por cerrado. Itera bloque a bloque si el asesor pide cambios.

## Evaluación como consumidor final (la audiencia que scrollea)

Antes de pedir aprobación, léelo como quien va a scrollear el post, no como quien ya conoce la
propiedad. Preguntas típicas (banco completo en `references/entrevista.md`):

- "¿El gancho para el pulgar en el primer segundo/línea, sin ver la foto?"
- "¿Queda claro qué es y para quién, sin tener que abrir la ficha completa?"
- "¿El CTA dice exactamente qué hacer (y no 'Contactar' a secas)?"
- "¿Suena a este asesor o podría firmarlo cualquier otro post genérico de la competencia?"
- "¿Hay alguna promesa que no se pueda sostener (urgencia falsa, cifra sin fuente)?"

Marca cuáles NO responde el borrador, haz una tanda dirigida a esas (máx. 2-3 pasadas), comunica
tu veredicto al asesor y regístralo en `meta.consumerReview` **antes** de `meta.approvedAt` —
mismo orden forzado que el resto del plugin (`metodo.md` §2).

## El pack (entregable)

- Ruta: `propiedades/<slug>/social/<fecha>-<objetivo>/pieza.json` + `pieza.md`, conforme a
  `schema/copies-sociales.schema.json`. Vive **dentro** de la carpeta de la propiedad porque nace
  de ella — no es un tipo de contenido nuevo del sitio, es material derivado.
- Con aprobación: escribe `pieza.json`, regenera `pieza.md`, actualiza `meta.contentHash` y deja
  constancia en `meta.approvedAt` + `meta.approvedHash`. Nunca los escribas sin su "sí".
- **No hay ciclo de publicación.** El cierre de esta skill es mostrar el pack completo y aprobado
  — no hay `publish_*` que ejecutar (`references/flujo-mcp.md`).

## Modo degradado (claude.ai, ChatGPT — sin sistema de archivos)

El pack vive en la conversación: se reimprime completo tras cada tanda, misma disciplina, misma
aprobación explícita antes de darlo por cerrado. Al final se ofrece el `pieza.json` y el `pieza.md`
como descargables. La fuente de verdad de la propiedad sigue siendo el sitio: se lee con
`get_property` al empezar, nunca se asume desde una sesión anterior.

## Cierre de sesión

- Resume: propiedad, objetivo, plataformas cubiertas, y qué quedó `pending`.
- Recuerda al asesor que el copy es para **copiar y pegar manualmente** (o llevar a su herramienta
  de programación de posts) — esta skill no publica nada por su cuenta.
- Ofrece commit descriptivo si hay git ("copies torre-serena-9b: pack captación compradores IG/TikTok
  19-08"); ofrece `git init` si no hay repo. Nunca push sin pedirlo.

## Errores frecuentes a evitar

- ❌ Redactar sin haber leído `get_brand_foundations` — el copy sale con voz genérica.
- ❌ Pegar el mismo copy en las cinco plataformas ignorando formato y longitud.
- ❌ Abrir con la ficha técnica en vez de un gancho (`mejores-practicas-social.md` §1).
- ❌ Confundir objetivo: un post de captación de propietarios que suena a anuncio de venta.
- ❌ Urgencia falsa o cifras de mercado que el asesor no confirmó.
- ❌ Bloque de 20-30 hashtags genéricos sin relación con esta propiedad o zona.
- ❌ Inventar qué fotos hay en vez de llamar `list_media`.
- ❌ Intentar "publicar" el pack vía MCP — esta skill no tiene esa tool ni ese paso.
- ❌ Registrar un gancho o ángulo propuesto sin que el asesor lo haya confirmado explícitamente.
