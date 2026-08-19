#!/usr/bin/env node
/**
 * PreToolUse (`mcp__.*__publish_.*`) — puerta de pre-publicación.
 *
 * Publicar es lo único irreversible de este plugin: sale al sitio público del asesor con su
 * nombre. Antes de dejar pasar un `publish_*` se comprueba sobre la copia local:
 *
 * 1. **La pieza valida contra su schema** (por si el .json se tocó a mano después de escribirlo).
 * 2. **La lectura como cliente está registrada** (`meta.consumerReview`, metodo.md §2).
 * 3. **El asesor aprobó ESTE contenido**: `approvedAt` posterior a la revisión y `approvedHash`
 *    vigente. Aprobar un borrador y publicar otro es el fallo que esta puerta impide.
 *
 * Los puntos 2 y 3 los evalúa `lib/pieza.mjs`, el mismo criterio que usa `gate-writes`.
 * ⚠️ El hook verifica que los pasos quedaron REGISTRADOS, no que fueran buenos: la calidad es del
 * método y del criterio del asesor.
 *
 * Se deniega con `permissionDecision: "deny"` + motivo accionable. **Solo bloquea cuando
 * encuentra la pieza local**: sin workspace o sin copia local no hay nada que juzgar y se deja
 * pasar con un aviso — el asesor puede estar en modo degradado, y la autoridad de calidad dura es
 * el propio MCP.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { localizarPieza, motivoParaFrenar, objetivoDeTool } from './lib/pieza.mjs'
import { validate } from './lib/schema.mjs'
import { findWorkspace, pieceInfo, readHookInput, readJson } from './lib/workspace.mjs'

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

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

try {
  const input = await readHookInput()
  const tool = String(input?.tool_name ?? '')

  // Espejo del matcher de `hooks.json`: esta puerta solo juzga publicaciones. Si el matcher se
  // amplía alguna vez, aquí no se cuelan lecturas ni escrituras de bloque.
  if (!/__publish_/.test(tool)) salir(null)

  const objetivo = objetivoDeTool(tool)
  if (!objetivo) salir(null) // un publish_* que no mapea a una pieza local

  const workspace = findWorkspace(input?.cwd ?? process.cwd())
  if (!workspace) salir(null) // modo degradado: sin copia local no hay nada que verificar

  const file = localizarPieza(workspace, objetivo, input?.tool_input)
  if (!file) {
    avisar(
      `No encontré la copia local de lo que vas a publicar en \`${objetivo.carpeta}/\`. Publico igual, pero ` +
        'después crea/actualiza su `pieza.json` para que el workspace no quede desincronizado.',
    )
  }

  const { data, error } = readJson(file)
  if (error) denegar(`\`${file}\` no es JSON válido (${error}). Arréglalo antes de publicar.`)

  const pieza = pieceInfo(file, workspace, PLUGIN_ROOT)
  if (pieza?.schemaPath) {
    const { data: schema } = readJson(pieza.schemaPath)
    const errores = schema ? validate(schema, data) : []
    if (errores.length > 0) {
      denegar(
        `No publiqué: \`${pieza.rel}\` no cumple su schema:\n` +
          errores
            .slice(0, 8)
            .map((e) => `  · ${e.path}: ${e.message}`)
            .join('\n') +
          '\nCorrige la pieza, muéstrasela al asesor y vuelve a intentarlo.',
      )
    }
  }

  const motivo = motivoParaFrenar(data, { accion: 'publiqué' })
  if (motivo) denegar(motivo)

  salir(null)
} catch {
  process.exit(0)
}
