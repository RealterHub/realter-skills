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

- **Una subcarpeta por tipo** (`perfil/`, `servicios/`, `articulos/`, `testimonios/`, `paginas/`),
  **una carpeta por pieza**, nombrada por su slug en kebab-case.
- **`pieza.json` es la fuente de verdad**: sigue el JSON Schema de la skill correspondiente
  (`schema/` dentro de cada skill). Es lo que se publica vía MCP.
- **`pieza.md` es la vista legible**, regenerada desde el json cada vez que el json cambia —
  **nunca al revés**. Si el asesor edita el .md a mano, la skill lo detecta, incorpora los cambios
  al json con su confirmación y regenera el .md.

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
    "contentHash": "sha256:…"
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

Reglas: las skills recalculan `contentHash` tras cada escritura del json; jamás editan `meta`
a mano para "cuadrar" estados; ante conflicto (el remoto cambió desde `lastSyncedAt`) se lee el
remoto, se muestra la diferencia y decide el asesor.

## Flujo de toda skill sobre el workspace

1. **Reconocer**: buscar `.realterid/config.json` en el directorio actual o sus padres.
2. Si no existe: ofrecer crear el workspace (preguntar carpeta y URL del sitio) — o continuar
   sin workspace si el asesor prefiere.
3. Trabajar la pieza en `<tipo>/<slug>/pieza.json`, regenerar `pieza.md`, mostrar el borrador
   completo para aprobación.
4. Al cerrar la sesión: si la carpeta es repo git, **ofrecer un commit descriptivo**
   ("servicio compra-sobre-planos: editorial y FAQs"); si no es repo, ofrecer `git init` una vez.
   Nunca hacer push sin que el asesor lo pida.

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
