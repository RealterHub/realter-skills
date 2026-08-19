#!/usr/bin/env node
/**
 * Materializa `plugins/` desde `src/` — Node puro, sin dependencias.
 *
 * ## Por qué existe
 *
 * El asesor instala **solo lo que necesita**: un plugin por skill (`realterid-cargar-propiedad`,
 * `realterid-crear-servicio`, …) más `realterid-core` con los hooks. Pero las guías compartidas y
 * los schemas son de todos, y `${CLAUDE_PLUGIN_ROOT}` apunta **solo al plugin propio**: un plugin
 * no puede leer archivos de otro. Así que lo compartido se **copia** dentro de cada plugin al
 * generar, igual que ya hace el build de zips para claude.ai.
 *
 * De ahí la regla del repo: **`src/` es la fuente y `plugins/` es generado**. Los plugins van
 * commiteados porque el marketplace instala el repo tal cual, pero se editan en `src/`.
 *
 * ## Qué produce
 *
 *   plugins/realterid-core/                 hooks + lib + schemas (copiados de las skills)
 *   plugins/realterid-<skill>/              una skill + las guías inyectadas en su references/
 *   .claude-plugin/marketplace.json         las 10 entradas, derivadas de src/plugins.json
 *
 * Uso:
 *   node scripts/build-plugins.mjs           regenera plugins/ y el marketplace
 *   node scripts/build-plugins.mjs --check   falla si lo generado no coincide con lo commiteado
 */

import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const GUIDES_DIR = join(SRC, 'guides')
const SKILLS_DIR = join(SRC, 'skills')
const HOOKS_DIR = join(SRC, 'hooks')

const manifiesto = JSON.parse(readFileSync(join(SRC, 'plugins.json'), 'utf8'))
const CHECK = process.argv.includes('--check')

/* -------------------------------------------------------------------------- */
/*  Encabezado de "no editar"                                                  */
/* -------------------------------------------------------------------------- */

const AVISO = (origen) =>
  `<!-- NO EDITAR — generado por scripts/build-plugins.mjs desde ${origen}. ` +
  `Los cambios hechos aquí se pierden en el próximo build; edita la fuente. -->`

/**
 * Inserta el aviso en un markdown. Si el archivo abre con frontmatter YAML, va **después** del
 * cierre: un comentario antes rompería el frontmatter y Claude Code dejaría de reconocer la skill.
 */
const marcarMarkdown = (contenido, origen) => {
  const aviso = AVISO(origen)
  if (contenido.startsWith('---\n')) {
    const cierre = contenido.indexOf('\n---\n', 4)
    if (cierre !== -1) {
      const corte = cierre + 5
      return `${contenido.slice(0, corte)}\n${aviso}\n${contenido.slice(corte)}`
    }
  }
  return `${aviso}\n\n${contenido}`
}

const walk = (dir, base = '') =>
  readdirSync(dir).flatMap((entrada) => {
    const abs = join(dir, entrada)
    const rel = base ? `${base}/${entrada}` : entrada
    return statSync(abs).isDirectory() ? walk(abs, rel) : [{ rel, abs }]
  })

const escribir = (destino, contenido) => {
  mkdirSync(dirname(destino), { recursive: true })
  writeFileSync(destino, contenido)
}

/** Copia un archivo de `src/` marcando los markdown como generados. */
const copiarMarcando = (abs, destino, origenRel) => {
  if (abs.endsWith('.md')) escribir(destino, marcarMarkdown(readFileSync(abs, 'utf8'), origenRel))
  else {
    mkdirSync(dirname(destino), { recursive: true })
    cpSync(abs, destino)
  }
}

const GENERADO_MD = (nombre, fuente) => `# ${nombre} — directorio GENERADO

**No edites nada de esta carpeta.** Se regenera entera con:

\`\`\`bash
node scripts/build-plugins.mjs
\`\`\`

La fuente de este plugin vive en \`${fuente}\` (y las guías compartidas, en \`src/guides/\`).
Cualquier cambio hecho aquí se pierde en el próximo build.
`

/* -------------------------------------------------------------------------- */
/*  Generación                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * `plugin.json` de un plugin. Solo campos del schema oficial: Claude Code **rechaza campos
 * desconocidos** (salvo `metadata`), así que aquí no se inventa nada.
 *
 * `dependencies` es el mecanismo real de la plataforma (no una convención nuestra): instalar
 * cualquier plugin de skill instala también `realterid-core`, que es donde viven los hooks. Se
 * declara SIN rango de versión a propósito — los rangos se resuelven contra tags git
 * `<plugin>--v<version>`, y este repo no los publica.
 */
const pluginJson = ({ name, displayName, description, keywords, dependencies }) => ({
  name,
  displayName,
  version: manifiesto.version,
  description,
  author: manifiesto.author,
  license: manifiesto.license,
  keywords,
  ...(dependencies ? { dependencies } : {}),
})

const generar = (destinoPlugins, destinoMarketplace) => {
  rmSync(destinoPlugins, { recursive: true, force: true })
  const entradasMarketplace = []

  /* --- core: hooks + lib + schemas ---------------------------------------- */
  const core = manifiesto.core
  const coreDir = join(destinoPlugins, core.name)

  escribir(join(coreDir, '.claude-plugin', 'plugin.json'), `${JSON.stringify(pluginJson(core), null, 2)}\n`)
  escribir(join(coreDir, 'GENERADO.md'), GENERADO_MD(core.name, 'src/hooks/'))

  // `src/hooks/` se lee cómodo; el plugin necesita el layout que espera Claude Code:
  //   src/hooks/hooks.json    → hooks/hooks.json      (ubicación por defecto del manifiesto)
  //   src/hooks/scripts/x.mjs → scripts/hooks/x.mjs   (lo que apunta ${CLAUDE_PLUGIN_ROOT} en
  //                                                    hooks.json, y de donde los scripts
  //                                                    derivan su PLUGIN_ROOT con '../..')
  for (const { rel, abs } of walk(HOOKS_DIR)) {
    const destinoRel = rel === 'hooks.json' ? 'hooks/hooks.json' : `scripts/hooks/${rel.replace(/^scripts\//, '')}`
    copiarMarcando(abs, join(coreDir, destinoRel), `src/hooks/${rel}`)
  }

  // Los schemas son de las skills, pero los hooks los necesitan y no pueden leer otro plugin:
  // se copian aquí (ver el comentario de SCHEMAS en scripts/hooks/lib/workspace.mjs).
  for (const skill of readdirSync(SKILLS_DIR)) {
    const schemaDir = join(SKILLS_DIR, skill, 'schema')
    if (!existsSync(schemaDir)) continue
    for (const archivo of readdirSync(schemaDir)) {
      cpSync(join(schemaDir, archivo), join(coreDir, 'schemas', archivo), { recursive: false, force: true })
    }
  }

  entradasMarketplace.push({
    name: core.name,
    source: `./plugins/${core.name}`,
    displayName: core.displayName,
    description: core.description,
  })

  /* --- una skill por plugin ----------------------------------------------- */
  const guias = walk(GUIDES_DIR)

  for (const entrada of manifiesto.skills) {
    const nombre = `${manifiesto.prefix}-${entrada.skill}`
    const dir = join(destinoPlugins, nombre)
    const skillSrc = join(SKILLS_DIR, entrada.skill)
    if (!existsSync(skillSrc)) throw new Error(`No existe src/skills/${entrada.skill}`)

    escribir(
      join(dir, '.claude-plugin', 'plugin.json'),
      `${JSON.stringify(
        pluginJson({ ...entrada, name: nombre, dependencies: [core.name] }),
        null,
        2,
      )}\n`,
    )
    escribir(join(dir, 'GENERADO.md'), GENERADO_MD(nombre, `src/skills/${entrada.skill}/`))

    const destinoSkill = join(dir, 'skills', entrada.skill)
    const propios = new Set()
    for (const { rel, abs } of walk(skillSrc)) {
      copiarMarcando(abs, join(destinoSkill, rel), `src/skills/${entrada.skill}/${rel}`)
      propios.add(rel)
    }

    // Guías compartidas → references/ de la skill. Es la ÚNICA forma de que estén disponibles:
    // un plugin no puede leer archivos de otro plugin instalado.
    for (const { rel, abs } of guias) {
      const relDestino = `references/${rel}`
      if (propios.has(relDestino)) continue // una referencia propia de la skill manda
      copiarMarcando(abs, join(destinoSkill, relDestino), `src/guides/${rel}`)
    }

    entradasMarketplace.push({
      name: nombre,
      source: `./plugins/${nombre}`,
      displayName: entrada.displayName,
      description: entrada.description,
    })
  }

  /* --- marketplace --------------------------------------------------------- */
  escribir(
    destinoMarketplace,
    `${JSON.stringify(
      {
        name: manifiesto.marketplaceName ?? 'realter-skills',
        owner: manifiesto.author,
        description: manifiesto.marketplaceDescription,
        plugins: entradasMarketplace,
      },
      null,
      2,
    )}\n`,
  )

  return entradasMarketplace
}

/* -------------------------------------------------------------------------- */
/*  Modos                                                                      */
/* -------------------------------------------------------------------------- */

const inventario = (dir) =>
  existsSync(dir)
    ? Object.fromEntries(walk(dir).map(({ rel, abs }) => [rel.split(sep).join('/'), readFileSync(abs)]))
    : {}

if (CHECK) {
  const tmp = mkdtempSync(join(tmpdir(), 'realterid-build-'))
  const entradas = generar(join(tmp, 'plugins'), join(tmp, 'marketplace.json'))

  const esperado = { ...inventario(join(tmp, 'plugins')) }
  esperado['../marketplace.json'] = readFileSync(join(tmp, 'marketplace.json'))
  const actual = { ...inventario(join(ROOT, 'plugins')) }
  actual['../marketplace.json'] = existsSync(join(ROOT, '.claude-plugin', 'marketplace.json'))
    ? readFileSync(join(ROOT, '.claude-plugin', 'marketplace.json'))
    : Buffer.from('')

  const diferencias = []
  for (const clave of new Set([...Object.keys(esperado), ...Object.keys(actual)])) {
    const a = esperado[clave]
    const b = actual[clave]
    if (!a) diferencias.push(`sobra:  ${clave}`)
    else if (!b) diferencias.push(`falta:  ${clave}`)
    else if (!a.equals(b)) diferencias.push(`difiere: ${clave}`)
  }
  rmSync(tmp, { recursive: true, force: true })

  if (diferencias.length > 0) {
    console.error('✗ plugins/ no coincide con src/. Corre `node scripts/build-plugins.mjs`.\n')
    console.error(diferencias.map((d) => `  ${d}`).join('\n'))
    process.exit(1)
  }
  console.log(`✓ plugins/ está al día (${entradas.length} plugins).`)
} else {
  const entradas = generar(join(ROOT, 'plugins'), join(ROOT, '.claude-plugin', 'marketplace.json'))
  for (const entrada of entradas) {
    const archivos = walk(join(ROOT, 'plugins', entrada.name)).length
    console.log(`✓ ${entrada.name} (${archivos} archivos)`)
  }
  console.log(`✓ .claude-plugin/marketplace.json (${entradas.length} plugins)`)
}
