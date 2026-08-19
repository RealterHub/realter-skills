/**
 * Utilidades de workspace para los hooks — Node puro, sin dependencias, cross-platform.
 *
 * Todo lo que los hooks necesitan saber del disco: si un archivo pertenece a un workspace
 * RealterID, qué schema le toca, el hash canónico del contenido y dónde vive el brief de
 * marca local. Ninguna función lanza: los hooks nunca deben romper la sesión del asesor.
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, parse, relative, resolve, sep } from 'node:path'

const isDirectory = (p) => {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

/** Sube por los ancestros hasta encontrar `.realterid/config.json`. `null` si no hay workspace. */
export const findWorkspace = (startPath) => {
  // Se admite tanto un archivo (existente o no, porque el hook puede correr sobre uno
  // recién creado) como un directorio: si no es directorio, se empieza por su carpeta.
  let dir = resolve(startPath)
  if (!isDirectory(dir)) dir = dirname(dir)

  const raiz = parse(dir).root
  while (true) {
    if (existsSync(join(dir, '.realterid', 'config.json'))) return dir
    if (dir === raiz) return null
    const padre = dirname(dir)
    if (padre === dir) return null
    dir = padre
  }
}

/** Lee y parsea un JSON. Devuelve `{ data }` o `{ error }` — nunca lanza. */
export const readJson = (file) => {
  try {
    return { data: JSON.parse(readFileSync(file, 'utf8')) }
  } catch (error) {
    return { error: error && error.message ? error.message : String(error) }
  }
}

/**
 * Schema que le corresponde a cada tipo de pieza, dentro de `schemas/` del propio plugin de
 * hooks (`realterid-core`).
 *
 * ⚠️ Los schemas son de las skills, pero los hooks **no pueden leerlos desde el plugin de la
 * skill**: cada plugin se instala por separado y `${CLAUDE_PLUGIN_ROOT}` apunta solo al propio.
 * Por eso `scripts/build-plugins.mjs` copia los schemas de cada `src/skills/<skill>/schema/`
 * a `schemas/` de core: la fuente sigue siendo una sola, la copia es generada.
 *
 * Un tipo sin entrada ⇒ `schemaPath: null` y el hook no valida — no se le inventan reglas a una
 * skill que aún no publicó su schema (articulos, testimonios y paginas siguen siendo esqueletos).
 */
const SCHEMAS = {
  perfil: 'fundamentos.schema.json',
  servicios: 'servicio.schema.json',
  propiedades: 'propiedad.schema.json',
  // Piezas DERIVADAS: nacen de una propiedad y viven dentro de su carpeta (o sueltas, en el
  // caso de un guion genérico). No se publican al sitio; se validan igual.
  social: 'copies-sociales.schema.json',
  guiones: 'guion.schema.json',
}

/**
 * Tipo de pieza y schema que le corresponde, deducidos de la ruta DENTRO del workspace.
 *
 * La regla es una sola y cubre los dos layouts del plugin: **el tipo es la carpeta que precede
 * a la carpeta de la pieza**.
 *
 *   servicios/mi-servicio/pieza.json                      → tipo `servicios`
 *   propiedades/torre-9b/social/2026-08-19-branding/…     → tipo `social`   (padre: propiedades/torre-9b)
 *   propiedades/torre-9b/guiones/2026-08-19-tour/…        → tipo `guiones`  (padre: propiedades/torre-9b)
 *   guiones/2026-08-19-precios/pieza.json                 → tipo `guiones`
 *
 * Antes se exigían exactamente 3 segmentos, así que las piezas derivadas (copies sociales y
 * guiones de una propiedad, que se anidan dentro de ella a propósito para no perder de vista de
 * qué nacen) quedaban invisibles: ni se validaban al escribirlas ni entraban al repaso de cierre.
 * Generalizar por "la carpeta anterior" las cubre sin listas de rutas especiales y deja el
 * layout plano funcionando igual.
 */
export const pieceInfo = (absFile, workspaceRoot, pluginRoot) => {
  const rel = relative(workspaceRoot, absFile).split(sep).join('/')
  // Fuera del workspace (o en sus entrañas ocultas) no opinamos.
  if (rel.startsWith('..') || rel.split('/').some((s) => s.startsWith('.'))) return null

  const segmentos = rel.split('/')
  // Cualquier otro .json del workspace (config, notas del asesor) no es asunto de este hook.
  if (segmentos.length < 3 || segmentos[segmentos.length - 1].toLowerCase() !== 'pieza.json') {
    return null
  }

  const carpetas = segmentos.slice(0, -1)
  const slug = carpetas[carpetas.length - 1]
  const tipo = carpetas[carpetas.length - 2]
  const archivoSchema = SCHEMAS[tipo]

  return {
    rel,
    tipo,
    slug,
    /** Pieza de la que deriva, si está anidada (`propiedades/torre-9b`). `null` si es de primer nivel. */
    parent: carpetas.length > 2 ? carpetas.slice(0, -2).join('/') : null,
    schemaPath: archivoSchema ? join(pluginRoot, 'schemas', archivoSchema) : null,
  }
}

/**
 * Todas las `pieza.json` del workspace, a cualquier profundidad admitida.
 *
 * Recorre en vez de asumir una lista de carpetas: así el repaso de cierre ve también las piezas
 * derivadas y los tipos que se añadan mañana, sin tocar este archivo. Se saltan las carpetas
 * ocultas (`.git`, `.realterid`) y se acota la profundidad porque el workspace del asesor puede
 * tener cualquier cosa dentro y esto corre en cada cierre de sesión.
 *
 * El tope es **5**: es el nivel donde vive el layout más profundo del plugin
 * (`propiedades/<slug>/social/<sub>/pieza.json` — la raíz cuenta como nivel 1). Con 4 las piezas
 * derivadas quedaban fuera del recorrido, que es justo el hueco que esto viene a cerrar.
 */
export const buscarPiezas = (dir, profundidadMax = 5) => {
  const encontradas = []
  const caminar = (actual, nivel) => {
    if (nivel > profundidadMax) return
    let entradas = []
    try {
      entradas = readdirSync(actual, { withFileTypes: true })
    } catch {
      return
    }
    for (const entrada of entradas) {
      if (entrada.name.startsWith('.') || entrada.name === 'node_modules') continue
      const ruta = join(actual, entrada.name)
      if (entrada.isDirectory()) caminar(ruta, nivel + 1)
      else if (entrada.name.toLowerCase() === 'pieza.json') encontradas.push(ruta)
    }
  }
  caminar(dir, 1)
  return encontradas
}

/**
 * Hash canónico del bloque `content` — el MISMO algoritmo que deben usar las skills al
 * escribir `meta.contentHash` y `meta.approvedHash` (documentado en guides/workspace.md):
 * JSON con claves ordenadas alfabéticamente en todos los niveles, sin espacios, UTF-8,
 * SHA-256 en hexadecimal, prefijado con `sha256:`.
 */
export const contentHash = (content) => `sha256:${createHash('sha256').update(canonicalJson(content), 'utf8').digest('hex')}`

export const canonicalJson = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const claves = Object.keys(value).sort()
  return `{${claves.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`
}

/** Brief de marca local, si existe. `null` cuando el asesor aún no lo ha creado. */
export const readBrandBrief = (workspaceRoot) => {
  const file = join(workspaceRoot, 'perfil', 'fundamentos-de-marca', 'pieza.json')
  if (!existsSync(file)) return null
  const { data } = readJson(file)
  return data && typeof data === 'object' ? data : null
}

/** Lee el JSON que Claude Code entrega por stdin. `{}` si no llega nada parseable. */
export const readHookInput = async () => {
  const trozos = []
  for await (const trozo of process.stdin) trozos.push(trozo)
  if (trozos.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(trozos).toString('utf8')) ?? {}
  } catch {
    return {}
  }
}
