/**
 * Validador JSON Schema mínimo (draft-07, subconjunto) — Node puro, sin dependencias.
 *
 * Por qué propio y no ajv: el plugin se instala en la máquina del asesor y no puede
 * arrastrar node_modules ni pedirle que instale nada. El subconjunto cubre EXACTAMENTE
 * lo que usan los schemas de las skills (`type`, `properties`, `required`,
 * `additionalProperties`, `items`, `enum`, `minLength`/`maxLength`, `minItems`/`maxItems`,
 * `minimum`/`maximum`, `pattern`, `format: date-time`).
 *
 * Si un schema empieza a usar algo fuera de esta lista (`$ref`, `oneOf`, `allOf`), este
 * validador **avisa y no valida** en vez de dar un falso OK: mejor un hueco visible que
 * una validación que miente.
 */

const KEYWORDS_SOPORTADAS = new Set([
  '$schema',
  '$id',
  'title',
  'description',
  'type',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'minimum',
  'maximum',
  'pattern',
  'format',
  'default',
  'examples',
])

/** Keywords presentes en el schema que este validador no entiende. */
export const keywordsNoSoportadas = (schema, encontradas = new Set()) => {
  if (schema == null || typeof schema !== 'object') return encontradas
  if (Array.isArray(schema)) {
    for (const item of schema) keywordsNoSoportadas(item, encontradas)
    return encontradas
  }
  for (const [key, value] of Object.entries(schema)) {
    if (!KEYWORDS_SOPORTADAS.has(key)) encontradas.add(key)
    if (key === 'properties' && value && typeof value === 'object') {
      for (const sub of Object.values(value)) keywordsNoSoportadas(sub, encontradas)
    } else if (key === 'items' || key === 'additionalProperties') {
      if (value && typeof value === 'object') keywordsNoSoportadas(value, encontradas)
    }
  }
  return encontradas
}

const tipoDe = (value) => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (Number.isInteger(value)) return 'integer'
  if (typeof value === 'number') return 'number'
  return typeof value // string | boolean | object
}

const coincideTipo = (value, esperado) => {
  const real = tipoDe(value)
  if (esperado === 'number') return real === 'number' || real === 'integer'
  return real === esperado
}

// `format: date-time` sin librería: ISO 8601 con zona (Z u offset) y fecha real.
const ES_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/

/**
 * Valida `data` contra `schema`. Devuelve `[]` si todo está bien, o una lista de
 * `{ path, message }` con rutas tipo `content.hero.subtitle` legibles para el modelo.
 */
export const validate = (schema, data, path = '') => {
  const errores = []
  if (schema == null || typeof schema !== 'object') return errores

  const donde = path || '(raíz)'

  if (schema.type !== undefined) {
    const tipos = Array.isArray(schema.type) ? schema.type : [schema.type]
    if (!tipos.some((t) => coincideTipo(data, t))) {
      errores.push({
        path: donde,
        message: `tipo inválido: se esperaba ${tipos.join(' | ')} y llegó ${tipoDe(data)}`,
      })
      return errores // sin el tipo correcto, el resto de comprobaciones no aporta nada
    }
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((v) => v === data)) {
    errores.push({
      path: donde,
      message: `valor no permitido: ${JSON.stringify(data)}. Válidos: ${schema.enum
        .map((v) => JSON.stringify(v))
        .join(', ')}`,
    })
  }

  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errores.push({ path: donde, message: `demasiado corto: ${data.length} caracteres, mínimo ${schema.minLength}` })
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errores.push({ path: donde, message: `demasiado largo: ${data.length} caracteres, máximo ${schema.maxLength}` })
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(data)) {
      errores.push({ path: donde, message: `no cumple el patrón ${schema.pattern}` })
    }
    if (schema.format === 'date-time' && (!ES_DATE_TIME.test(data) || Number.isNaN(Date.parse(data)))) {
      errores.push({ path: donde, message: 'fecha inválida: se espera ISO 8601 con zona, p. ej. 2026-08-19T15:04:05Z' })
    }
  }

  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errores.push({ path: donde, message: `valor menor que el mínimo (${schema.minimum})` })
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errores.push({ path: donde, message: `valor mayor que el máximo (${schema.maximum})` })
    }
  }

  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errores.push({ path: donde, message: `faltan elementos: ${data.length}, mínimo ${schema.minItems}` })
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errores.push({ path: donde, message: `demasiados elementos: ${data.length}, máximo ${schema.maxItems}` })
    }
    if (schema.items) {
      data.forEach((item, i) => errores.push(...validate(schema.items, item, `${path}[${i}]`)))
    }
  }

  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    for (const req of schema.required ?? []) {
      if (!(req in data)) errores.push({ path: path ? `${path}.${req}` : req, message: 'campo obligatorio ausente' })
    }
    const propiedades = schema.properties ?? {}
    for (const [key, value] of Object.entries(data)) {
      const hijo = path ? `${path}.${key}` : key
      if (propiedades[key]) {
        errores.push(...validate(propiedades[key], value, hijo))
      } else if (schema.additionalProperties === false) {
        errores.push({
          path: hijo,
          message: 'campo desconocido: no existe en el schema (¿nombre mal escrito o dato que no va aquí?)',
        })
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        errores.push(...validate(schema.additionalProperties, value, hijo))
      }
    }
  }

  return errores
}
