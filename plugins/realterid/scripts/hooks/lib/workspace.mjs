/**
 * Utilidades de workspace para los hooks — Node puro, sin dependencias, cross-platform.
 *
 * Todo lo que los hooks necesitan saber del disco: si un archivo pertenece a un workspace
 * RealterID, qué schema le toca, el hash canónico del contenido y dónde vive el brief de
 * marca local. Ninguna función lanza: los hooks nunca deben romper la sesión del asesor.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
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
 * Tipo de pieza y schema que le corresponde, deducidos de la ruta DENTRO del workspace.
 *
 * Los schemas son los de las propias skills (`skills/<skill>/schema/…`): no se duplican
 * aquí, se resuelven por ruta del plugin. Los tipos cuyas skills aún son esqueleto no
 * tienen schema todavía ⇒ `schemaPath: null` y el hook no valida (no inventa reglas).
 */
export const pieceInfo = (absFile, workspaceRoot, pluginRoot) => {
  const rel = relative(workspaceRoot, absFile).split(sep).join('/')
  const segmentos = rel.split('/')

  // Una pieza vive SIEMPRE en <tipo>/<slug>/pieza.json. Cualquier otro .json del
  // workspace (config, notas del asesor) no es asunto de este hook.
  if (segmentos.length !== 3 || segmentos[2].toLowerCase() !== 'pieza.json') return null
  const [tipo, slug] = segmentos

  const SCHEMAS = {
    perfil: ['fundamentos-de-marca', 'fundamentos.schema.json'],
    servicios: ['crear-servicio', 'servicio.schema.json'],
    // articulos, testimonios y paginas: sus skills son esqueleto y aún no publican schema.
  }
  const mapeo = SCHEMAS[tipo]

  return {
    rel,
    tipo,
    slug,
    schemaPath: mapeo ? join(pluginRoot, 'skills', mapeo[0], 'schema', mapeo[1]) : null,
  }
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
