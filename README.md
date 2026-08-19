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
| `escribir-articulo` | Artículos del blog en Markdown vía MCP. | 🚧 Esqueleto |
| `cargar-testimonio` | Testimonios de clientes reales (se transcriben, nunca se inventan; nacen ocultos hasta que el asesor los muestra). | 🚧 Esqueleto |
| `editar-paginas` | Las seis páginas del sitio: heros, secciones, CTAs, SEO, con publicación explícita. | 🚧 Esqueleto |
| `publicar-en-sitio` | Sincroniza el workspace local con el sitio: decide crear/actualizar/al día por pieza y publica con aprobación. | 🚧 Esqueleto |

Guías compartidas del plugin (`plugins/realterid/guides/`): `storytelling.md`, `copywriting.md`,
`seo-basico.md` y `workspace.md` — prácticas universales que moldean qué preguntan y cómo
redactan todas las skills.

## Instalación

### Claude Code (recomendado)

```bash
claude plugin marketplace add realter/realter-skills
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
