/**
 * Localizar la pieza local y decidir si está lista para tocar el MCP.
 *
 * Lo comparten los dos gates (`gate-publish` y `gate-writes`) para que la puerta dura y la de
 * escrituras juzguen EXACTAMENTE con el mismo criterio; que divergieran sería peor que no tener
 * gate, porque el asesor vería reglas distintas según la tool.
 */
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { contentHash, readJson } from './workspace.mjs'

/**
 * A qué pieza del workspace apunta la tool que se va a llamar: `{ carpeta, slug }`, o `null` si
 * no apunta a ninguna.
 *
 * Se mira el nombre sin el prefijo del servidor (`mcp__loquesea__set_property_pricing`): el
 * asesor puede haber registrado su MCP con cualquier nombre.
 *
 * `slug` sale del propio nombre en las páginas isGlobal (`set_about_story` ⇒ `about-page`),
 * porque esas tools no llevan ningún id en el input. En el resto es `null` y la pieza se
 * localiza por id.
 *
 * ⚠️ Las tools de TAXONOMÍA no son piezas: `create_post_category` crea una categoría, no un
 * artículo. Mapearlas a `articulos/` haría que el gate frenara algo que no tiene pieza posible.
 */
export const objetivoDeTool = (tool) => {
  if (/_categor/i.test(tool)) return null

  if (/_propert(y|ies)(_|$)/.test(tool)) return { carpeta: 'propiedades', slug: null }
  if (/_service(_|$)/.test(tool)) return { carpeta: 'servicios', slug: null }
  if (/_post(_|$)/.test(tool)) return { carpeta: 'articulos', slug: null }
  if (/_testimonial(_|$)/.test(tool)) return { carpeta: 'testimonios', slug: null }

  // Páginas: por slug en el input (`publish_page`, `set_page_hero`) o por el nombre de la tool.
  if (/_page(_|$)/.test(tool)) return { carpeta: 'paginas', slug: null }
  for (const [marca, slug] of [
    [/_home_/, 'home-page'],
    [/_about_/, 'about-page'],
    [/_contact_/, 'contact-page'],
  ]) {
    if (marca.test(tool)) return { carpeta: 'paginas', slug }
  }

  return null
}

/** Ids que puede traer la tool para identificar la pieza (todos viajan como string). */
const idDeEntrada = (toolInput) =>
  [
    toolInput?.property_id,
    toolInput?.service_id,
    toolInput?.post_id,
    toolInput?.testimonial_id,
    toolInput?.id,
  ]
    .filter((v) => v != null)
    .map(String)[0] ?? null

const piezasDe = (workspace, carpeta) => {
  const base = join(workspace, carpeta)
  if (!existsSync(base)) return []
  return readdirSync(base)
    .map((entrada) => join(base, entrada, 'pieza.json'))
    .filter((file) => existsSync(file))
}

/**
 * Localiza la pieza local que corresponde a la llamada.
 *
 * Tres vías, en orden de fiabilidad:
 *  1. `page`: las páginas se nombran por su slug (`about-page`), que es la carpeta.
 *  2. Un id en el input ⇒ la pieza cuyo `meta.remoteId` coincide.
 *  3. Sin id (un `create_*_draft`) ⇒ la pieza **en curso**: la única de ese tipo que todavía no
 *     existe en el sitio (`remoteId: null`). Si hay varias, es ambiguo y se devuelve `null`:
 *     ante la duda NO se bloquea, que es la diferencia entre una red de seguridad y un estorbo.
 */
export const localizarPieza = (workspace, objetivo, toolInput) => {
  const { carpeta } = objetivo
  const slug = objetivo.slug ?? (typeof toolInput?.page === 'string' ? toolInput.page : null)
  if (slug) {
    const file = join(workspace, carpeta, slug, 'pieza.json')
    return existsSync(file) ? file : null
  }

  const archivos = piezasDe(workspace, carpeta)
  const id = idDeEntrada(toolInput)

  if (id) {
    for (const file of archivos) {
      const { data } = readJson(file)
      if (data?.meta?.remoteId != null && String(data.meta.remoteId) === id) return file
    }
    return null
  }

  const enCurso = archivos.filter((file) => {
    const { data } = readJson(file)
    return data && data.meta?.remoteId == null
  })
  return enCurso.length === 1 ? enCurso[0] : null
}

/**
 * ¿Puede esta pieza tocar el MCP? Devuelve el motivo del rechazo, o `null` si está lista.
 *
 * El orden de las comprobaciones es el del método (`metodo.md`): primero la lectura como
 * cliente, luego la aprobación, luego que la aprobación siga siendo de ESTE contenido.
 *
 * ⚠️ Lo que se verifica es que los pasos quedaron **registrados**, no que fueran buenos: la
 * calidad la ponen el método y el criterio del usuario, no un hook.
 */
export const motivoParaFrenar = (data, { accion = 'publiqué' } = {}) => {
  const meta = data?.meta ?? {}
  const review = meta.consumerReview

  if (!review?.passedAt) {
    return (
      `No ${accion}: falta la lectura como cliente. El método (metodo.md §2) pide evaluar la pieza ` +
      'poniéndote en el lugar de su consumidor final ANTES de pedir aprobación: simula sus 3-5 ' +
      'preguntas, mira cuáles no responde, haz una tanda dirigida a eso, comunícale tu veredicto al ' +
      'asesor y regístralo en `meta.consumerReview` ' +
      '({passedAt, pasadas, preguntas:[{pregunta, responde}], veredicto}).'
    )
  }

  if (!meta.approvedAt) {
    return (
      `No ${accion}: el asesor todavía no ha aprobado esta pieza (falta \`meta.approvedAt\`). ` +
      'Muéstrale el `pieza.md` COMPLETO con tu veredicto de la lectura como cliente, pídele su visto ' +
      'bueno explícito y escribe `meta.approvedAt` + `meta.approvedHash` con ese "sí". ' +
      'No los escribas por tu cuenta para saltar este aviso.'
    )
  }

  const tsReview = Date.parse(review.passedAt)
  const tsAprobacion = Date.parse(meta.approvedAt)
  if (!Number.isNaN(tsReview) && !Number.isNaN(tsAprobacion) && tsAprobacion < tsReview) {
    return (
      `No ${accion}: la lectura como cliente es POSTERIOR a la aprobación, así que el asesor aprobó ` +
      'algo que aún no habías evaluado. Cuéntale el veredicto y pídele que apruebe de nuevo.'
    )
  }

  if (meta.approvedHash && data?.content !== undefined && contentHash(data.content) !== meta.approvedHash) {
    return (
      `No ${accion}: el contenido cambió DESPUÉS de que el asesor lo aprobara ` +
      '(`meta.approvedHash` ya no coincide). Vuelve a mostrarle el borrador completo, que lo apruebe ' +
      'otra vez, actualiza `approvedAt`/`approvedHash` y reintenta.'
    )
  }

  return null
}
