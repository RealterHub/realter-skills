<!-- NO EDITAR — generado por scripts/build-plugins.mjs desde src/guides/workspace.md. Los cambios hechos aquí se pierden en el próximo build; edita la fuente. -->

# Workspace local — la carpeta de trabajo del asesor

> Guía compartida de las skills de RealterID. Toda skill que cree o edite contenido
> aplica esta convención cuando el cliente de IA tiene sistema de archivos
> (Claude Code, Claude Desktop con carpetas). Si no lo tiene, ver "Modo degradado".

## Qué es

Una carpeta local que guarda **la fuente de verdad del contenido del asesor** antes y después
de publicarlo en su sitio. Permite trabajar en borradores largos entre sesiones, versionar con
git y saber siempre qué está publicado, qué cambió y qué falta.

## Estructura

```
mi-sitio/                          # nombre libre; la elige el asesor
├── .realterid/
│   └── config.json                # marca la carpeta como workspace RealterID
├── perfil/
│   └── fundamentos-de-marca/
│       ├── pieza.json
│       └── pieza.md
├── servicios/
│   └── <slug>/                    # p. ej. compra-sobre-planos/
│       ├── pieza.json
│       └── pieza.md
├── articulos/
│   └── <slug>/
├── testimonios/
│   └── <slug>/                    # p. ej. maria-p-2026/
└── paginas/
    └── <slug>/                    # home-page/, about-page/, ...
```

- **Una subcarpeta por tipo** (`perfil/`, `servicios/`, `articulos/`, `testimonios/`, `paginas/`,
  `propiedades/`, `guiones/`), **una carpeta por pieza**, nombrada por su slug en kebab-case.
- **`pieza.json` es la fuente de verdad**: sigue el JSON Schema de la skill correspondiente
  (`schema/` dentro de cada skill). Es lo que se publica vía MCP.
- **`pieza.md` es la vista legible**, regenerada desde el json cada vez que el json cambia —
  **nunca al revés**. Si el asesor edita el .md a mano, la skill lo detecta, incorpora los cambios
  al json con su confirmación y regenera el .md.

## Piezas derivadas (anidadas dentro de otra pieza)

Casi todas las piezas son de primer nivel (`<tipo>/<slug>/pieza.json`). Las que **nacen de otra
pieza y no se publican al sitio** viven **dentro** de ella, para que el filesystem conserve de
dónde salieron y quepan varias por original:

```
propiedades/torre-serena-9b/
├── pieza.json                                   # la propiedad (se publica)
├── social/2026-08-19-captacion-compradores/     # pack de copies (local)
│   ├── pieza.json
│   └── pieza.md
└── guiones/2026-08-19-tour/                     # guion de video (local)
    ├── pieza.json
    └── pieza.md
```

Un guion que no es de ninguna propiedad (educativo, de zona, presentación) va suelto en
`guiones/<fecha>-<tema>/`.

**La regla que lo hace funcionar: el TIPO de una pieza es la carpeta que precede a su carpeta.**
Sirve igual para `servicios/mi-servicio/` (tipo `servicios`) que para
`propiedades/<slug>/social/<sub>/` (tipo `social`). Los hooks de Claude Code la aplican tal cual,
así que una pieza derivada se valida contra su schema y entra en el repaso de cierre exactamente
igual que una de primer nivel — nada de "como no se publica, no se revisa".

Su `meta` **no lleva `remoteId`, `publishedAt` ni `lastSyncedAt`**: no hay nada que sincronizar
porque nunca existen en el sitio. Sí llevan `contentHash`, `consumerReview`, `approvedAt` y
`approvedHash`: la disciplina de evaluar y aprobar antes de dar por terminado no depende de que
haya publicación.

## `.realterid/config.json`

```json
{
  "version": 1,
  "site": "https://www.ejemplo.com",
  "mcp": "https://www.ejemplo.com/mcp",
  "language": "es"
}
```

Solo datos que el asesor haya dado. Sin credenciales: la autenticación (OAuth o API key)
vive en la configuración del cliente MCP, jamás en el workspace.

## Bloque `meta` de cada `pieza.json`

Todo `pieza.json` lleva un bloque `meta` que las skills mantienen y que `publicar-en-sitio` usa
para decidir si toca crear, actualizar o no hacer nada:

```json
{
  "meta": {
    "remoteId": "42",
    "publishedAt": "2026-08-19T15:04:05Z",
    "lastSyncedAt": "2026-08-19T15:04:05Z",
    "contentHash": "sha256:…",
    "consumerReview": { "passedAt": "2026-08-19T15:02:10Z", "pasadas": 2, "preguntas": [], "veredicto": "…" },
    "approvedAt": "2026-08-19T15:03:40Z",
    "approvedHash": "sha256:…"
  },
  "content": { }
}
```

| Campo | Significado |
| --- | --- |
| `remoteId` | Id del documento en el sitio (lo devuelve el MCP al crear). `null` = nunca publicado ⇒ create |
| `publishedAt` | Última publicación confirmada. `null` = existe como borrador remoto |
| `lastSyncedAt` | Última vez que local y remoto se igualaron |
| `contentHash` | SHA-256 del bloque `content` en el momento del último sync. Si el hash actual difiere ⇒ hay cambios locales sin publicar (update); si coincide ⇒ al día |
| `consumerReview` | Registro de la **lectura como cliente** (`metodo.md` §2): `{passedAt, pasadas, preguntas:[{pregunta, responde}], veredicto}`. Es el paso previo obligatorio a pedir aprobación |
| `approvedAt` | Momento en que **el asesor aprobó el borrador completo**. Lo escribe la skill solo tras un "sí" explícito sobre el `pieza.md` mostrado entero, y **siempre después** de `consumerReview.passedAt`. `null` = nadie ha aprobado nada todavía |
| `approvedHash` | SHA-256 del `content` **que se aprobó**. Si el contenido cambió después, la aprobación caducó y hay que volver a mostrar el borrador |

Reglas: las skills recalculan `contentHash` tras cada escritura del json; jamás editan `meta`
a mano para "cuadrar" estados; ante conflicto (el remoto cambió desde `lastSyncedAt`) se lee el
remoto, se muestra la diferencia y decide el asesor.

## El archivo es la memoria de trabajo (flujo archivo → script → MCP)

`metodo.md` §3 es regla dura y esta carpeta es donde se cumple: **la pieza se construye e itera
aquí, tanda a tanda, y el MCP se toca al final**. Al retomar una sesión se relee el `pieza.json`
y se sigue donde se quedó; cada respuesta del asesor lo actualiza.

```
entrevista (tanda a tanda)  →  pieza.json + pieza.md
      ↓
lectura como cliente        →  meta.consumerReview
      ↓
aprobación del asesor       →  meta.approvedAt + meta.approvedHash
      ↓
script MCP (derivado del archivo, mostrado ANTES de ejecutarlo)
      ↓
ejecución                   →  meta.remoteId / publishedAt / lastSyncedAt / contentHash
```

Las **lecturas** del MCP (`get_brand_foundations`, `list_property_options`, `list_geography`,
`list_media`, `search_*`, `get_*`) sí se llaman al principio: son insumo de la entrevista, no
escritura. El **script MCP** —la secuencia de llamadas previstas, en orden— se escribe como
sección del `pieza.md` (se regenera con el resto) para que el asesor vea qué se va a mandar antes
de mandarlo.

**`approvedAt`/`approvedHash` no son burocracia**: son la memoria de que el asesor vio y aceptó
*ese* texto. Escribirlos sin su aprobación explícita —o "para desbloquear" un hook— rompe la regla
de oro del plugin igual que inventar un dato. En Claude Code, además, el hook de pre-publicación
los exige antes de dejar pasar cualquier `publish_*` (ver README, "Calidad en capas").

## Flujo de toda skill sobre el workspace

1. **Reconocer**: buscar `.realterid/config.json` en el directorio actual o sus padres.
2. Si no existe: ofrecer crear el workspace (preguntar carpeta y URL del sitio) — o continuar
   sin workspace si el asesor prefiere.
3. Trabajar la pieza en `<tipo>/<slug>/pieza.json`, regenerar `pieza.md`, mostrar el borrador
   completo para aprobación.
4. Al cerrar la sesión: si la carpeta es repo git, **ofrecer un commit descriptivo**
   ("servicio compra-sobre-planos: editorial y FAQs"); si no es repo, ofrecer `git init` una vez.
   Nunca hacer push sin que el asesor lo pida.

## Hash canónico de `content`

`contentHash` y `approvedHash` se calculan **igual en todas las skills** (si no, dos skills
concluirían cosas distintas sobre la misma pieza): JSON del bloque `content` con las **claves
ordenadas alfabéticamente en todos los niveles**, sin espacios ni saltos de línea, codificado en
UTF-8; SHA-256 en hexadecimal minúscula; prefijo `sha256:`. Los arrays conservan su orden (es
información: el orden de las FAQs o de los pasos importa). La implementación de referencia está
en `scripts/hooks/lib/workspace.mjs` del plugin (`canonicalJson` + `contentHash`).

## Calidad en capas (dónde se comprueba qué)

- **El MCP del sitio valida siempre**, en todos los clientes: requeridos, topes, enums, ids
  ajenos y publicación explícita. Es la autoridad; lo que rechaza, no se publica.
- **En Claude Code hay además hooks** del plugin: validan la `pieza.json` contra su schema en
  cuanto se escribe, frenan cualquier `publish_*` sin aprobación vigente y repasan el workspace
  al cerrar la sesión. **claude.ai y ChatGPT no ejecutan hooks** — allí esta guía y el MCP son
  todo lo que hay, así que las reglas de aquí se cumplen igual, sin red de seguridad.
- Un hook que avisa es información, no un permiso: nunca se "arregla" un aviso escribiendo un
  dato que el asesor no dio, ni marcando una aprobación que no ocurrió.

## Modo degradado (claude.ai, ChatGPT web — sin sistema de archivos)

Las mismas skills funcionan sin carpeta:

- La entrevista y el borrador viven **en la conversación**; el borrador .md se muestra completo
  en el chat para aprobación.
- Al aprobar, se **publica directo vía MCP** (mismo ciclo create → set → publish) y se informan
  id y estado.
- Se ofrece al asesor el `pieza.json` y el `pieza.md` como archivos descargables al final, para
  que pueda llevarlos a un workspace cuando lo tenga.
- Sin `meta` local, la fuente de verdad del estado es el propio sitio: antes de editar se lee
  el documento remoto con la tool `get_*` correspondiente.
