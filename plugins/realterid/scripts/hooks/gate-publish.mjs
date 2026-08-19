#!/usr/bin/env node
/**
 * PreToolUse (`mcp__.*__publish_.*`) — puerta de pre-publicación.
 *
 * Publicar es lo único irreversible de este plugin: sale al sitio público del asesor con su
 * nombre. Antes de dejar pasar un `publish_*` se comprueban dos cosas sobre la copia local:
 *
 * 1. **La pieza valida contra su schema** (lo mismo que verifica el hook de escritura, por si
 *    el .json se tocó a mano después).
 * 2. **El asesor aprobó ESTE contenido**: `meta.approvedAt` presente y, si hay
 *    `meta.approvedHash`, que siga coincidiendo con el `content` actual. Aprobar un borrador
 *    y publicar otro distinto es el fallo que esta puerta existe para impedir.
 *
 * Se deniega con `permissionDecision: "deny"` + motivo accionable (contrato PreToolUse,
 * verificado 2026-08-19). **Solo bloquea cuando encuentra la pieza local**: sin workspace o
 * sin copia local no hay nada que juzgar y se deja pasar con un aviso — el asesor puede estar
 * trabajando en modo degradado, y la autoridad de calidad dura es el propio MCP.
 */
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { validate } from './lib/schema.mjs'
import { contentHash, findWorkspace, pieceInfo, readHookInput, readJson } from './lib/workspace.mjs'

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Qué carpeta del workspace corresponde a cada tool de publicación. */
const CARPETA_POR_TOOL = [
  [/publish_service$/, 'servicios'],
  [/publish_post$/, 'articulos'],
  [/publish_page$/, 'paginas'],
]

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
  salir({
    hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: texto },
  })

/** Ids que puede traer la tool para identificar la pieza (todos viajan como string). */
const idDeEntrada = (toolInput) =>
  [toolInput?.service_id, toolInput?.post_id, toolInput?.testimonial_id, toolInput?.id]
    .filter((v) => v != null)
    .map(String)[0] ?? null

/** Localiza la carpeta local de la pieza que se va a publicar. */
const localizarPieza = (workspace, carpeta, toolInput) => {
  const base = join(workspace, carpeta)
  if (!existsSync(base)) return null

  // `publish_page` no lleva id: la página se nombra por su slug (`about-page`).
  const slug = typeof toolInput?.page === 'string' ? toolInput.page : null
  if (slug) {
    const file = join(base, slug, 'pieza.json')
    return existsSync(file) ? file : null
  }

  const id = idDeEntrada(toolInput)
  if (!id) return null

  for (const entrada of readdirSync(base)) {
    const file = join(base, entrada, 'pieza.json')
    if (!existsSync(file)) continue
    const { data } = readJson(file)
    if (data?.meta?.remoteId != null && String(data.meta.remoteId) === id) return file
  }
  return null
}

try {
  const input = await readHookInput()
  const tool = String(input?.tool_name ?? '')
  const carpeta = CARPETA_POR_TOOL.find(([re]) => re.test(tool))?.[1]
  if (!carpeta) salir(null) // otro publish_* que no mapea a una pieza local

  const workspace = findWorkspace(input?.cwd ?? process.cwd())
  if (!workspace) salir(null) // modo degradado: sin copia local no hay nada que verificar

  const file = localizarPieza(workspace, carpeta, input?.tool_input)
  if (!file) {
    avisar(
      `No encontré la copia local de lo que vas a publicar en \`${carpeta}/\`. Publico igual, pero ` +
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

  const meta = data?.meta ?? {}
  if (!meta.approvedAt) {
    denegar(
      'No publiqué: esta pieza no tiene `meta.approvedAt`, es decir, el asesor todavía no ha ' +
        'aprobado el borrador. Muéstrale el `pieza.md` COMPLETO, pídele su visto bueno explícito, ' +
        'escribe `meta.approvedAt` y `meta.approvedHash` con ese "sí", y entonces publica. ' +
        'No escribas la aprobación por tu cuenta para saltar este aviso.',
    )
  }

  if (meta.approvedHash && data?.content !== undefined) {
    const actual = contentHash(data.content)
    if (actual !== meta.approvedHash) {
      denegar(
        'No publiqué: el contenido cambió DESPUÉS de que el asesor lo aprobara ' +
          `(\`meta.approvedHash\` ya no coincide). Vuelve a mostrarle el borrador completo, ` +
          'que lo apruebe otra vez, actualiza `approvedAt`/`approvedHash` y reintenta.',
      )
    }
  }

  salir(null)
} catch {
  process.exit(0)
}
