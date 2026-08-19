# realter-skills

Agent Skills públicas de **Realter** para que los asesores inmobiliarios gestionen el contenido
de su sitio desde su cliente de IA (Claude Code, claude.ai, ChatGPT vía MCP).

Las skills **entrevistan y redactan**; la publicación la hace el **MCP del propio sitio del
asesor** (URL `/mcp` de su dominio, autenticado con OAuth o API key desde su panel). Regla de
oro de todas: **jamás inventar datos del asesor** — lo que no dé, se pregunta o queda vacío.

## Plugins (instala solo lo que uses)

Cada skill es **su propio plugin**: el asesor que solo carga propiedades no tiene por qué cargar
con las nueve. `realterid-core` trae los hooks de calidad y **se instala solo**, como dependencia
declarada de cualquier skill — no hace falta pedirlo aparte.

| Plugin | Qué hace | Estado |
| --- | --- | --- |
| `realterid-core` | **Los gates de calidad** (hooks): valida cada pieza contra su schema al escribirla, frena publicaciones y escrituras sin la lectura como cliente y la aprobación del asesor, avisa de palabras prohibidas de su marca y repasa el workspace al cerrar. No trae skills. | ✅ |
| `realterid-fundamentos-de-marca` | Entrevista al asesor y compila su brief de marca para IA (voz, propuesta, evidencia, mercado). **Empieza por aquí**: las demás skills leen ese brief antes de redactar. | ✅ Completa |
| `realterid-cargar-propiedad` | Carga una propiedad entrevistándolo sobre la visita: recorrido estancia por estancia, amenidades deducidas que él confirma, fotos y publicación (`create_property_draft → set_property_* → publish_property`). | ✅ Completa |
| `realterid-crear-servicio` | Crea o mejora una landing de servicio: entrevista → redacción con su voz → publicación (`create_service_draft → set_service_* → publish_service`). | ✅ Completa |
| `realterid-crear-copies-sociales` | Pack de copies de redes (Instagram, Facebook, TikTok, LinkedIn, X) para una propiedad ya cargada. **Solo lecturas MCP**: el pack es local. | ✅ Completa |
| `realterid-crear-guion-video` | Guiones para grabar (reels, TikTok, tours, educativos, de zona, testimonios, presentación): gancho con dos variantes, cuerpo toma↔voz y checklist de tomas. **Solo lecturas MCP**. | ✅ Completa |
| `realterid-escribir-articulo` | Artículos del blog en Markdown vía MCP. | 🚧 Esqueleto |
| `realterid-cargar-testimonio` | Testimonios de clientes reales (se transcriben, nunca se inventan; nacen ocultos hasta que el asesor los muestra). | 🚧 Esqueleto |
| `realterid-editar-paginas` | Las seis páginas del sitio: heros, secciones, CTAs, SEO, con publicación explícita. | 🚧 Esqueleto |
| `realterid-publicar-en-sitio` | Sincroniza el workspace local con el sitio: crear / actualizar / al día por pieza, con aprobación. | 🚧 Esqueleto |

**No hay plugin "todo en uno"**, y es deliberado: mezclarlo con los individuales instalaría dos
copias de la misma skill y dos veces los mismos hooks (Claude Code **no deduplica** hooks de
plugins distintos: ejecutaría cada uno dos veces).

### Por dónde empezar

1. **`realterid-fundamentos-de-marca`** — sin el brief, todo lo demás escribe con voz genérica.
   Al instalarlo entra también `realterid-core` con los gates.
2. Después, lo que el asesor haga cada semana:

| Si el asesor… | Instala |
| --- | --- |
| Sube propiedades a su sitio | `realterid-cargar-propiedad` |
| Las promociona en redes | `realterid-crear-copies-sociales` + `realterid-crear-guion-video` |
| Vende servicios (asesoría, avalúo, administración) | `realterid-crear-servicio` |
| Escribe blog para posicionarse | `realterid-escribir-articulo` |
| Recoge testimonios de clientes | `realterid-cargar-testimonio` |
| Retoca los textos de su web | `realterid-editar-paginas` |
| Trabaja offline y sincroniza después | `realterid-publicar-en-sitio` |

> Dos de estas skills (`crear-copies-sociales` y `crear-guion-video`) **no tienen ciclo de
> escritura al MCP**: el sitio no expone tools de copies ni de video, y su entregable es un
> archivo local que el asesor lleva a donde vaya a postear o grabar. No es un ciclo pendiente de
> descubrir: es su diseño.

## Guías compartidas (`src/guides/`)

Prácticas universales que moldean **qué preguntan** y **cómo redactan** todas las skills. El build
las **copia dentro de cada skill** (`references/`), tanto en su plugin como en su zip: un plugin no
puede leer archivos de otro, así que cada uno viaja autocontenido.

| Guía | Para qué |
| --- | --- |
| `metodo.md` | **El método común de todas las skills**: propón para que confirme · evalúa la pieza como su consumidor final antes de darla por terminada · archivo primero, MCP al final. Se lee antes que ninguna otra. |
| `storytelling.md` | La historia buena ya ocurrió: problema → decisión → resultado, con anécdotas reales del asesor. |
| `copywriting.md` | Texto que hace que un desconocido escriba: específico > superlativo, trato del brief, CTA que dice qué pasa después. |
| `seo-basico.md` | Una página = una intención de búsqueda; títulos, excerpts y FAQs long-tail sin relleno. |
| `entrevista-biografica.md` | Desbloquear lo que el asesor **no cuenta solo**: origen, formación, carrera previa, hitos, idiomas. Preguntas por episodios, checklist de territorios, técnica del espejo y prohibición de inducir a inventar. |
| `entrevista-propiedad.md` | Sacar la ficha de una visita que ya ocurrió: recorrido guiado por estancias, deducción→confirmación de amenidades, preguntas de contexto, fotos como fuente y el catálogo real como checklist. |
| `workspace.md` | Convención de la carpeta local del asesor: `pieza.json` como fuente de verdad, `pieza.md` legible, bloque `meta` para el sync. |

## Calidad en capas (qué garantiza cada una)

Tres capas, con alcances distintos a propósito. La de abajo es la única que existe siempre.

| Capa | Dónde corre | Qué garantiza | Dónde NO está |
| --- | --- | --- | --- |
| **MCP del sitio** (autoridad) | Servidor del asesor, en toda llamada | Validación real y aislamiento por cuenta: requeridos (`missing_for_publish`), topes, enums, ids ajenos ⇒ `not_found`, borrador/publicación explícita. Lo que el MCP rechaza, no se publica. | En ningún sitio: aplica a Claude Code, claude.ai y ChatGPT por igual |
| **Hooks del plugin** (red de seguridad local) | Claude Code, al usar el plugin | Feedback inmediato sobre el **workspace local**: la `pieza.json` valida contra su schema al escribirla; ninguna escritura ni publicación pasa sin la lectura como cliente y la aprobación vigentes en la pieza en curso; aviso de palabras prohibidas del brief; repaso del workspace al cerrar | claude.ai y ChatGPT **no ejecutan hooks** (por eso no viajan en los zips) |
| **Skills** (instrucción) | Todos los clientes | Cómo entrevistar, qué preguntar, qué no inventar, mostrar el borrador completo antes de publicar | — |

Los hooks **no relajan** nada: son un atajo al error, no un permiso. Ninguna capa autoriza a
escribir un dato que el asesor no haya dado.

Implementación: **todo en el plugin `realterid-core`** (`hooks/hooks.json` + `scripts/hooks/*.mjs`,
Node puro, sin dependencias, cross-platform). Los hooks viven en un solo plugin **a propósito**:
Claude Code no deduplica hooks entre plugins, así que repetirlos en las nueve skills los ejecutaría
nueve veces por evento. Los schemas de las skills se copian a `realterid-core/schemas/` en el build
porque un plugin no puede leer los archivos de otro.

| Hook | Evento · matcher | Qué hace |
| --- | --- | --- |
| `validate-pieza.mjs` | `PostToolUse` · `Write\|Edit` | Si el archivo escrito es una `pieza.json` de un workspace RealterID, la valida contra el schema de su tipo y **devuelve los errores al modelo** para que corrija en el mismo turno |
| `gate-publish.mjs` | `PreToolUse` · `mcp__.*__(publish_.*)` | **Deniega** publicar si la pieza local no valida, si falta la lectura como cliente (`meta.consumerReview`), si no está aprobada (`meta.approvedAt`, que debe ser posterior a la revisión) o si su `approvedHash` caducó. Sin copia local, avisa y deja pasar |
| `gate-writes.mjs` | `PreToolUse` · `mcp__.*__(set_.*\|create_.*)` | Sostiene "archivo primero, MCP al final": si hay una **pieza local en curso** para ese contenido sin `consumerReview` + `approvedAt` vigentes, **deniega**. Sin pieza correspondiente, deja pasar con un aviso (edición rápida). Excluye `upload_image`, `suggest_property_feature` y `set_brand_*` |
| `check-brand.mjs` | `PreToolUse` · `mcp__.*__(set_.*\|create_.*)` | Aviso **no bloqueante**: palabras de `wordsToAvoid` del brief local en el payload, o ausencia de brief (sugiere `fundamentos-de-marca`, una vez por sesión) |
| `check-workspace.mjs` | `Stop` | Repaso al cerrar: piezas que no validan, `pieza.md` sin regenerar, aprobaciones caducadas y cambios sin commitear. **Nunca commitea** ni retiene el cierre |

Ninguno rompe la sesión: ante cualquier fallo interno salen en silencio con éxito. Y una
honestidad importante: **los gates verifican que los pasos del método quedaron REGISTRADOS, no
que fueran buenos** — que la lectura como cliente exista no garantiza que fuera aguda, ni la
aprobación que el asesor leyera con atención. La calidad la ponen el método (`src/guides/metodo.md`)
y el criterio del usuario; el hook solo impide saltarse el paso en silencio, y solo en Claude Code.

Contrato de hooks (ubicación, `${CLAUDE_PLUGIN_ROOT}`, campos de stdin, `permissionDecision`/`decision`,
`stop_hook_active`) verificado contra la documentación oficial de Claude Code el 2026-08-19.

## Instalación

### Claude Code (recomendado)

```bash
claude plugin marketplace add RealterHub/realter-skills

# Lo primero, siempre (arrastra realterid-core con los gates de calidad):
claude plugin install realterid-fundamentos-de-marca@realter-skills

# Y luego solo lo que uses:
claude plugin install realterid-cargar-propiedad@realter-skills
claude plugin install realterid-crear-copies-sociales@realter-skills
```

Cada plugin de skill declara `realterid-core` en su `dependencies`, así que **el core se instala
solo**; si algún día desinstalas todas las skills, `claude plugin prune` se lo lleva. Para ver qué
tienes: `claude plugin list` · para el detalle de uno: `claude plugin details <plugin>`.

Además, conecta el MCP de tu sitio (desde tu panel RealterID: Inteligencia Artificial →
Tu servidor MCP) para que las skills puedan leer y publicar.

> **Vienes de la versión anterior** (un solo plugin `realterid` con las nueve skills)?
> `claude plugin uninstall realterid` y luego instala las que necesites. No conviven: tendrías las
> skills duplicadas y los hooks ejecutándose dos veces.

### claude.ai (web/escritorio)

Genera los zips y sube el de cada skill en Configuración → Capacidades → Skills:

```bash
node scripts/build-zips.mjs   # escribe dist/<skill>.zip (autocontenidos: incluyen las guías)
```

Conecta también el MCP de tu sitio como conector personalizado. Sin sistema de archivos, las
skills trabajan en modo degradado: borradores en la conversación, archivos descargables y
publicación directa vía MCP.

### ChatGPT (vía conector MCP)

ChatGPT no tiene skills nativas como estas: ahí el grueso lo hace el **MCP de tu sitio**
(conector personalizado apuntando a tu `/mcp`). Puedes pegar el contenido de un SKILL.md como
instrucciones de un proyecto/GPT para acercar el flujo, pero la experiencia completa de skills
es de los clientes de Claude.

## Convención de workspace

Las skills trabajan sobre una carpeta local del asesor (fuente de verdad del contenido,
versionada con git): `.realterid/config.json` en la raíz; subcarpeta por tipo (`perfil/`,
`servicios/`, `articulos/`, `testimonios/`, `paginas/`, `propiedades/`, `guiones/`) con una
carpeta por pieza (slug), y piezas derivadas anidadas dentro de su propiedad
(`propiedades/<slug>/social/…`, `propiedades/<slug>/guiones/…`);
`pieza.json` = fuente de verdad, `pieza.md` = vista legible regenerada; bloque `meta`
(`remoteId`, `publishedAt`, `lastSyncedAt`, `contentHash`) para que `publicar-en-sitio` sepa si
toca crear, actualizar o nada. Detalle: `src/guides/workspace.md`.

## Estructura del repo: qué es fuente y qué es generado

**Se edita `src/`. `plugins/` y `dist/` son artefactos** — se regeneran con un comando y cualquier
cambio hecho ahí se pierde. Cada archivo generado lleva un encabezado que lo dice, y cada plugin
un `GENERADO.md`.

```
src/                                 # ← FUENTE (aquí se trabaja)
├── plugins.json                     #   identidad de los 10 plugins (nombres y descripciones)
├── guides/                          #   guías compartidas
├── skills/<skill>/                  #   SKILL.md + schema/ + templates/ + references/
└── hooks/                           #   hooks.json + scripts/ (+ lib/)

plugins/                             # ← GENERADO (commiteado: el marketplace instala del repo)
├── realterid-core/                  #   hooks + lib + schemas copiados de las skills
└── realterid-<skill>/               #   una skill, con las guías copiadas en su references/
.claude-plugin/marketplace.json      # ← GENERADO desde src/plugins.json
dist/<skill>.zip                     # ← GENERADO para claude.ai (ignorado por git)

scripts/build-plugins.mjs            # src/ → plugins/ + marketplace.json
scripts/build-zips.mjs               # src/ → dist/*.zip
```

### Flujo de trabajo del mantenedor

```bash
# 1. editar en src/ …
# 2. regenerar
node scripts/build-plugins.mjs
node scripts/build-zips.mjs
# 3. verificar antes de commitear
node scripts/build-plugins.mjs --check     # falla si plugins/ no coincide con src/
claude plugin validate ./plugins/realterid-core --strict
claude plugin validate . --strict          # el marketplace
```

`--check` es lo que impide el error clásico de un repo con artefactos: tocar `src/` y publicar sin
regenerar (o al revés, parchear `plugins/` y perderlo en el siguiente build).
