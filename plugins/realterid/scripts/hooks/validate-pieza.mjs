#!/usr/bin/env node
/**
 * PostToolUse (Write|Edit) — valida una `pieza.json` recién escrita contra su JSON Schema.
 *
 * Es el feedback rápido local: el modelo escribe la pieza y, si se sale del schema (campo
 * inventado, tipo equivocado, texto que pasa el máximo), lo sabe **en el mismo turno** en vez
 * de descubrirlo cuando el MCP rechace la publicación tres pasos después.
 *
 * Contrato (docs de hooks de Claude Code, verificado 2026-08-19): entra JSON por stdin con
 * `tool_name`, `tool_input.file_path` y `tool_response`; se devuelve `{"decision":"block",
 * "reason":…}` con exit 0 para que el motivo llegue al modelo como feedback corregible.
 *
 * Nunca rompe la sesión: cualquier fallo interno sale con exit 0 y sin ruido.
 */
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { validate, keywordsNoSoportadas } from './lib/schema.mjs'
import { findWorkspace, pieceInfo, readHookInput, readJson } from './lib/workspace.mjs'

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const salir = (payload) => {
  if (payload) process.stdout.write(JSON.stringify(payload))
  process.exit(0)
}

try {
  const input = await readHookInput()
  const file = input?.tool_input?.file_path
  if (typeof file !== 'string' || basename(file).toLowerCase() !== 'pieza.json') salir(null)

  const workspace = findWorkspace(file)
  if (!workspace) salir(null) // fuera de un workspace RealterID no opinamos

  const pieza = pieceInfo(file, workspace, PLUGIN_ROOT)
  // Tipos cuyas skills aún son esqueleto no publican schema: no se inventan reglas.
  if (!pieza || !pieza.schemaPath) salir(null)

  const { data: schema, error: errorSchema } = readJson(pieza.schemaPath)
  if (errorSchema || !schema) salir(null) // problema NUESTRO, no del asesor: callar

  const { data, error } = readJson(file)
  if (error) {
    salir({
      decision: 'block',
      reason:
        `\`${pieza.rel}\` no es JSON válido: ${error}\n` +
        'Reescribe el archivo completo con JSON bien formado (la pieza es la fuente de verdad del asesor).',
    })
  }

  const errores = validate(schema, data)
  if (errores.length > 0) {
    const lista = errores
      .slice(0, 12)
      .map((e) => `  · ${e.path}: ${e.message}`)
      .join('\n')
    const resto = errores.length > 12 ? `\n  … y ${errores.length - 12} más.` : ''
    salir({
      decision: 'block',
      reason:
        `\`${pieza.rel}\` no cumple su schema (${basename(pieza.schemaPath)}):\n${lista}${resto}\n` +
        'Corrige el archivo. Recuerda: los campos vacíos se dejan en null — nunca se rellenan con datos inventados.',
    })
  }

  // Señal para el mantenedor, no para el asesor: el schema creció más que el validador.
  const sinSoporte = [...keywordsNoSoportadas(schema)]
  if (sinSoporte.length > 0) {
    salir({
      systemMessage: `Aviso RealterID: el validador local no entiende ${sinSoporte.join(', ')} — esa parte del schema no se comprobó.`,
    })
  }

  salir(null)
} catch {
  process.exit(0)
}
