# realter-skills

Agent Skills públicas de **Realter** para que los asesores inmobiliarios gestionen el contenido
de su sitio desde su cliente de IA (Claude Code, claude.ai, ChatGPT vía MCP). Un plugin por
producto; hoy: **`realterid`** (el sitio del asesor).

Las skills **entrevistan y redactan**; la publicación la hace el **MCP del propio sitio del
asesor** (URL `/mcp` de su dominio, autenticado con OAuth o API key desde su panel). Regla de
oro de todas: **jamás inventar datos del asesor** — lo que no dé, se pregunta o queda vacío.

## Skills (plugin `realterid`, v0.1.0)

| Skill | Qué hace | Estado |
| --- | --- | --- |
| `fundamentos-de-marca` | Entrevista al asesor y compila su brief de marca para IA (voz, propuesta, evidencia, mercado). Es la skill fundacional: las demás leen ese brief antes de redactar. | ✅ Completa |
| `crear-servicio` | Crea o mejora una landing de servicio: entrevista → redacción con su voz → publicación (`create_service_draft → set_service_* → publish_service`). | ✅ Completa |
| `cargar-propiedad` | Carga una propiedad entrevistando al asesor sobre la visita: recorrido estancia por estancia, deducción de amenidades que él confirma, fotos y publicación (`create_property_draft → set_property_* → publish_property`). | ✅ Completa |
| `crear-copies-sociales` | Genera un pack de copies de redes (Instagram, Facebook, TikTok, LinkedIn, X) para una propiedad ya cargada: entrevista corta de objetivo y audiencia, ángulos y ganchos propuestos desde la ficha, redacción por plataforma. **Solo lecturas MCP**: el pack es local, no se publica. | ✅ Completa |
| `crear-guion-video` | Escribe guiones para grabar (reels, TikTok, tours, educativos, de zona, testimonios, presentación): gancho con dos variantes, cuerpo en dos columnas toma↔voz/texto en pantalla, CTA y checklist de tomas. **Solo lecturas MCP**: el guion es un entregable local. | ✅ Completa |
| `escribir-articulo` | Artículos del blog en Markdown vía MCP. | 🚧 Esqueleto |
| `cargar-testimonio` | Testimonios de clientes reales (se transcriben, nunca se inventan; nacen ocultos hasta que el asesor los muestra). | 🚧 Esqueleto |
| `editar-paginas` | Las seis páginas del sitio: heros, secciones, CTAs, SEO, con publicación explícita. | 🚧 Esqueleto |
| `publicar-en-sitio` | Sincroniza el workspace local con el sitio: decide crear/actualizar/al día por pieza y publica con aprobación. | 🚧 Esqueleto |

> Dos de estas skills (`crear-copies-sociales` y `crear-guion-video`) **no tienen ciclo de
> escritura al MCP**: el sitio no expone tools de copies ni de video, y su entregable es un
> archivo local que el asesor lleva a donde vaya a postear o grabar. No es un ciclo pendiente de
> descubrir: es su diseño.

## Guías compartidas (`plugins/realterid/guides/`)

Prácticas universales que moldean **qué preguntan** y **cómo redactan** todas las skills. Se
inyectan en `references/` de cada zip para que las skills sean autocontenidas en claude.ai.

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

Implementación: `plugins/realterid/hooks/hooks.json` (detectado por convención al habilitar el
plugin) + `plugins/realterid/scripts/hooks/*.mjs` (Node puro, sin dependencias, cross-platform).

| Hook | Evento · matcher | Qué hace |
| --- | --- | --- |
| `validate-pieza.mjs` | `PostToolUse` · `Write\|Edit` | Si el archivo escrito es una `pieza.json` de un workspace RealterID, la valida contra el `schema/` de su skill y **devuelve los errores al modelo** para que corrija en el mismo turno |
| `gate-publish.mjs` | `PreToolUse` · `mcp__.*__(publish_.*)` | **Deniega** publicar si la pieza local no valida, si falta la lectura como cliente (`meta.consumerReview`), si no está aprobada (`meta.approvedAt`, que debe ser posterior a la revisión) o si su `approvedHash` caducó. Sin copia local, avisa y deja pasar |
| `gate-writes.mjs` | `PreToolUse` · `mcp__.*__(set_.*\|create_.*)` | Sostiene "archivo primero, MCP al final": si hay una **pieza local en curso** para ese contenido sin `consumerReview` + `approvedAt` vigentes, **deniega**. Sin pieza correspondiente, deja pasar con un aviso (edición rápida). Excluye `upload_image`, `suggest_property_feature` y `set_brand_*` |
| `check-brand.mjs` | `PreToolUse` · `mcp__.*__(set_.*\|create_.*)` | Aviso **no bloqueante**: palabras de `wordsToAvoid` del brief local en el payload, o ausencia de brief (sugiere `fundamentos-de-marca`, una vez por sesión) |
| `check-workspace.mjs` | `Stop` | Repaso al cerrar: piezas que no validan, `pieza.md` sin regenerar, aprobaciones caducadas y cambios sin commitear. **Nunca commitea** ni retiene el cierre |

Ninguno rompe la sesión: ante cualquier fallo interno salen en silencio con éxito. Y una
honestidad importante: **los gates verifican que los pasos del método quedaron REGISTRADOS, no
que fueran buenos** — que la lectura como cliente exista no garantiza que fuera aguda, ni la
aprobación que el asesor leyera con atención. La calidad la ponen el método (`guides/metodo.md`)
y el criterio del usuario; el hook solo impide saltarse el paso en silencio, y solo en Claude Code.

Contrato de hooks (ubicación, `${CLAUDE_PLUGIN_ROOT}`, campos de stdin, `permissionDecision`/`decision`,
`stop_hook_active`) verificado contra la documentación oficial de Claude Code el 2026-08-19.

## Instalación

### Claude Code (recomendado)

```bash
claude plugin marketplace add RealterHub/realter-skills
claude plugin install realterid
```

Además, conecta el MCP de tu sitio (desde tu panel RealterID: Inteligencia Artificial →
Tu servidor MCP) para que las skills puedan leer y publicar.

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
`servicios/`, `articulos/`, `testimonios/`, `paginas/`) con una carpeta por pieza (slug);
`pieza.json` = fuente de verdad, `pieza.md` = vista legible regenerada; bloque `meta`
(`remoteId`, `publishedAt`, `lastSyncedAt`, `contentHash`) para que `publicar-en-sitio` sepa si
toca crear, actualizar o nada. Detalle: `plugins/realterid/guides/workspace.md`.

## Estructura del repo

```
.claude-plugin/marketplace.json      # marketplace de Claude Code
plugins/realterid/
├── .claude-plugin/plugin.json
├── guides/                          # guías compartidas (se inyectan en los zips)
├── hooks/hooks.json                 # hooks de calidad (solo Claude Code; NO van a los zips)
├── scripts/hooks/                   # sus scripts .mjs + lib/ (validador y workspace)
└── skills/<skill>/                  # SKILL.md + schema/ + templates/ + references/
scripts/build-zips.mjs               # build para claude.ai (Node puro, sin deps)
```

## Notas para mantenedores

- Los nombres de tools y campos que citan las skills salen de los specs aprobados del MCP de
  contenido de RealterID (`docs/18-mcp-contenido*` del repo del producto). Si el MCP cambia,
  estas skills se actualizan con él.
- El frontmatter de los SKILL.md incluye `version` (semver) por convención propia del repo;
  no es un campo oficial de Claude Code (la versión canónica del plugin vive en `plugin.json`).
  Los campos desconocidos del frontmatter se ignoran sin error.
- `marketplace.json`/`plugin.json` siguen el formato documentado de Claude Code
  (verificado 2026-08-19).
