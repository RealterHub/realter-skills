#!/usr/bin/env node
/**
 * PreToolUse (`mcp__.*__(create_.*|set_.*)`) — "archivo primero, MCP al final" (metodo.md §3).
 *
 * El método dice que la pieza se construye e itera en el archivo local y que las escrituras al
 * MCP se ejecutan **al final**, desde el script derivado de una pieza ya evaluada como su
 * consumidor final y aprobada por el asesor. Este hook lo sostiene sin volverse un estorbo:
 *
 * · **Hay pieza local en curso** que corresponde a esta escritura y NO está lista (falta
 *   `consumerReview` o `approvedAt`, o la aprobación caducó) ⇒ **deniega**. Es el caso de
 *   "estoy escribiendo al sitio a mitad de la entrevista".
 * · **No hay pieza local que corresponda** ⇒ **deja pasar con un aviso**, una vez por sesión.
 *   Es la edición rápida legítima ("corrígeme el precio de la 3B"): obligar ahí al ritual
 *   completo mataría la experiencia y empujaría al asesor a saltarse el plugin.
 *
 * ## Exclusiones (deliberadas, no olvidos)
 *
 * · `upload_image` — las fotos se suben DURANTE la entrevista: son insumo, y el `media_id` que
 *   devuelve es justo lo que hay que anotar en la pieza. (Tampoco casa con el matcher, pero se
 *   excluye explícitamente por si el matcher se amplía.)
 * · `suggest_property_feature` — ocurre a mitad de entrevista, cuando el asesor confirma una
 *   amenidad que no está en el catálogo. Frenarla perdería el dato.
 * · `set_brand_*` — el brief de marca **no tiene consumidor final**: su lector es el LLM y su
 *   estándar de completitud es `missing_for_brief`, no la lectura como cliente. Por eso su pieza
 *   tampoco lleva `consumerReview`.
 *
 * Como el resto de los hooks: ante cualquier fallo interno sale en silencio con éxito.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import { localizarPieza, motivoParaFrenar, objetivoDeTool } from './lib/pieza.mjs'
import { findWorkspace, readHookInput, readJson } from './lib/workspace.mjs'

/** Tools que escriben pero pertenecen a la ENTREVISTA, no al script final. */
const EXCLUIDAS = [/upload_image$/, /suggest_property_feature$/, /set_brand_/]

const salir = (payload) => {
  if (payload) process.stdout.write(JSON.stringify(payload))
  process.exit(0)
}

const denegar = (motivo) =>
  salir({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: motivo,
    },
  })

const avisar = (texto) =>
  salir({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: texto } })

/** Marca de "ya avisé en esta sesión", para que el aviso no se repita en cada set_*. */
const yaAvisado = (sessionId, clave) => {
  try {
    const dir = join(tmpdir(), 'realterid-hooks')
    mkdirSync(dir, { recursive: true })
    const marca = join(dir, `${String(sessionId ?? 'sin-sesion').replace(/[^\w-]/g, '')}.${clave}`)
    if (existsSync(marca)) return true
    writeFileSync(marca, '')
    return false
  } catch {
    return true
  }
}

try {
  const input = await readHookInput()
  const tool = String(input?.tool_name ?? '')
  if (EXCLUIDAS.some((re) => re.test(tool))) salir(null)

  const objetivo = objetivoDeTool(tool)
  // Escritura que no mapea a ninguna pieza (p. ej. create_post_category, que crea taxonomía).
  if (!objetivo) salir(null)

  const workspace = findWorkspace(input?.cwd ?? process.cwd())
  if (!workspace) salir(null) // modo degradado: el "archivo" vive en la conversación

  const file = localizarPieza(workspace, objetivo, input?.tool_input)
  if (!file) {
    // Edición rápida sin pieza local: pasa, pero se dice una vez.
    if (yaAvisado(input?.session_id, `sin-pieza-${objetivo.carpeta}`)) salir(null)
    avisar(
      `Estás escribiendo al sitio sin una pieza local en \`${objetivo.carpeta}/\`. Para un ajuste puntual está ` +
        'bien; si esto es una carga o reescritura completa, trabájala primero en su `pieza.json` ' +
        '(metodo.md §3: archivo primero, MCP al final) y luego ejecuta el script.',
    )
  }

  const { data, error } = readJson(file)
  if (error) salir(null) // el hook de escritura ya avisa del JSON roto; aquí no se estorba

  const motivo = motivoParaFrenar(data, { accion: 'escribí al sitio' })
  if (motivo) {
    const rel = relative(workspace, file).split(/[\\/]/).join('/')
    denegar(
      `${motivo}\n\nLa pieza en curso es \`${rel}\`. Recuerda el orden del método: entrevista → ` +
        'archivo → lectura como cliente → aprobación del asesor → script MCP. Las lecturas del MCP ' +
        '(`get_*`, `list_*`, `search_*`), `upload_image` y `suggest_property_feature` sí puedes ' +
        'llamarlas ahora: son insumo de la entrevista.',
    )
  }

  salir(null)
} catch {
  process.exit(0)
}
