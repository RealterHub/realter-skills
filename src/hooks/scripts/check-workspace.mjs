#!/usr/bin/env node
/**
 * Stop — repaso del workspace al cerrar la sesión. **Avisa; no bloquea y no commitea.**
 *
 * Tres cosas que se rompen en silencio entre sesiones y que aquí se ven de un vistazo:
 *
 * 1. Piezas cuyo `pieza.json` no cumple su schema (quedó a medias).
 * 2. `pieza.md` desactualizado respecto al `pieza.json` — el .md es una vista REGENERADA;
 *    si el json es más nuevo, el asesor está leyendo algo que ya no es verdad.
 * 3. Piezas aprobadas cuyo contenido cambió después (`approvedHash` caducado) y, si el
 *    workspace es repo git, cambios sin commitear.
 *
 * El commit lo decide el asesor: esta guía nunca ejecuta `git commit` ni `git add`
 * (guides/workspace.md). Solo se lee el estado con `git status --porcelain`.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { validate } from './lib/schema.mjs'
import {
  buscarPiezas,
  contentHash,
  findWorkspace,
  pieceInfo,
  readHookInput,
  readJson,
} from './lib/workspace.mjs'

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const salir = (mensaje) => {
  // `continue: true` explícito: este hook informa, jamás retiene el cierre de la sesión.
  if (mensaje) process.stdout.write(JSON.stringify({ continue: true, systemMessage: mensaje }))
  process.exit(0)
}

const cambiosSinCommit = (workspace) => {
  if (!existsSync(join(workspace, '.git'))) return 0
  try {
    const salida = execFileSync('git', ['-C', workspace, 'status', '--porcelain'], {
      encoding: 'utf8',
      timeout: 5000,
    })
    return salida.split('\n').filter((l) => l.trim() !== '').length
  } catch {
    return 0
  }
}

try {
  const input = await readHookInput()
  // Guarda contra bucles: si el cierre ya se retuvo antes, no insistir (contrato Stop).
  if (input?.stop_hook_active) process.exit(0)

  const workspace = findWorkspace(input?.cwd ?? process.cwd())
  if (!workspace) salir(null)

  const invalidas = []
  const desactualizadas = []
  const aprobacionCaducada = []

  // Se recorre el workspace en vez de asumir una lista de carpetas: así entran también las
  // piezas DERIVADAS que viven dentro de una propiedad (`social/`, `guiones/`), que con la
  // lista fija quedaban fuera del repaso.
  for (const file of buscarPiezas(workspace)) {
    const pieza = pieceInfo(file, workspace, PLUGIN_ROOT)
    if (!pieza) continue

    // Se nombra por su carpeta, sin el `/pieza.json`: es como el asesor la reconoce.
    const rel = pieza.rel.replace(/\/pieza\.json$/i, '')
    const { data, error } = readJson(file)
    if (error || !data) {
      invalidas.push(`${rel} (JSON ilegible)`)
      continue
    }

    if (pieza.schemaPath) {
      const { data: schema } = readJson(pieza.schemaPath)
      if (schema && validate(schema, data).length > 0) invalidas.push(rel)
    }

    const md = join(dirname(file), 'pieza.md')
    try {
      if (existsSync(md) && statSync(md).mtimeMs < statSync(file).mtimeMs) desactualizadas.push(rel)
      else if (!existsSync(md)) desactualizadas.push(`${rel} (sin pieza.md)`)
    } catch {
      /* permisos o carrera de escritura: no es asunto del aviso */
    }

    if (data?.meta?.approvedHash && data?.content !== undefined) {
      if (contentHash(data.content) !== data.meta.approvedHash) aprobacionCaducada.push(rel)
    }
  }

  const pendientes = cambiosSinCommit(workspace)
  const lineas = []
  if (invalidas.length) lineas.push(`· No cumplen su schema: ${invalidas.join(', ')}.`)
  if (desactualizadas.length) lineas.push(`· pieza.md sin regenerar: ${desactualizadas.join(', ')}.`)
  if (aprobacionCaducada.length) {
    lineas.push(
      `· Aprobación caducada (el contenido cambió después del visto bueno): ${aprobacionCaducada.join(', ')}. ` +
        'Habrá que mostrarlas de nuevo antes de publicar.',
    )
  }
  if (pendientes > 0) {
    lineas.push(`· ${pendientes} cambio(s) sin commitear en el workspace (el commit lo decides tú).`)
  }

  salir(lineas.length ? `Repaso del workspace RealterID:\n${lineas.join('\n')}` : null)
} catch {
  process.exit(0)
}
