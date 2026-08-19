#!/usr/bin/env node
/**
 * Genera un .zip por skill para subir a claude.ai (Configuración → Capacidades → Skills).
 *
 * Cada zip contiene la carpeta de la skill (SKILL.md en su raíz) con las guías compartidas
 * de `plugins/realterid/guides/` inyectadas en `references/` para que la skill sea
 * autocontenida fuera del plugin.
 *
 * ⚠️ Los **hooks NO viajan en los zips**, y no es un olvido: `src/hooks/` es un mecanismo de
 * Claude Code (se distribuye en el plugin `realterid-core`), y claude.ai no los ejecuta. Este
 * build solo empaqueta `src/skills/` + `src/guides/`, así que quedan fuera por construcción. La validación
 * que allí desaparece la sigue haciendo el MCP del sitio, que valida en todos los clientes
 * (ver "Calidad en capas" en el README).
 *
 * Node puro, sin dependencias (zlib para deflate, CRC32 propio).
 * Uso: node scripts/build-zips.mjs   → escribe en dist/
 */

import { deflateRawSync } from 'node:zlib'
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// Se empaqueta desde la FUENTE (`src/`), no desde `plugins/` — que es generado
// (ver scripts/build-plugins.mjs). Así los zips no dependen de haber corrido antes ese build.
const SKILLS_DIR = join(ROOT, 'src', 'skills')
const GUIDES_DIR = join(ROOT, 'src', 'guides')
const OUT_DIR = join(ROOT, 'dist')

// ---------- CRC32 ----------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// ---------- ZIP (local headers + central directory + EOCD) ----------
const dosDateTime = (d = new Date()) => ({
  time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  date: (((d.getFullYear() - 1980) & 0x7f) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
})

function buildZip(entries) {
  const { time, date } = dosDateTime()
  const locals = []
  const centrals = []
  let offset = 0

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8')
    const crc = crc32(data)
    const deflated = deflateRawSync(data, { level: 9 })
    const useDeflate = deflated.length < data.length
    const payload = useDeflate ? deflated : data
    const method = useDeflate ? 8 : 0

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // UTF-8 flag
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(payload.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28)
    locals.push(local, nameBuf, payload)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4) // version made by
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(method, 10)
    central.writeUInt16LE(time, 12)
    central.writeUInt16LE(date, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(payload.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    // extra len, comment len, disk, int attrs, ext attrs = 0
    central.writeUInt32LE(offset, 42)
    centrals.push(central, nameBuf)

    offset += 30 + nameBuf.length + payload.length
  }

  const centralBuf = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralBuf.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, centralBuf, eocd])
}

// ---------- recorrido ----------
const walk = (dir, base = '') =>
  readdirSync(dir).flatMap((entry) => {
    const abs = join(dir, entry)
    const rel = base ? `${base}/${entry}` : entry
    return statSync(abs).isDirectory() ? walk(abs, rel) : [{ rel, abs }]
  })

// ---------- build ----------
mkdirSync(OUT_DIR, { recursive: true })
const guides = walk(GUIDES_DIR)
const skills = readdirSync(SKILLS_DIR).filter((s) => statSync(join(SKILLS_DIR, s)).isDirectory())

for (const skill of skills) {
  const skillDir = join(SKILLS_DIR, skill)
  const entries = []
  const seen = new Set()

  for (const { rel, abs } of walk(skillDir)) {
    entries.push({ name: `${skill}/${rel}`, data: readFileSync(abs) })
    seen.add(`${skill}/${rel}`)
  }
  // Inyectar las guías compartidas en references/ (autocontención para claude.ai).
  for (const { rel, abs } of guides) {
    const name = `${skill}/references/${rel}`
    if (!seen.has(name)) entries.push({ name, data: readFileSync(abs) })
  }

  entries.sort((a, b) => a.name.localeCompare(b.name))
  const zip = buildZip(entries)
  const out = join(OUT_DIR, `${skill}.zip`)
  writeFileSync(out, zip)
  console.log(`✓ ${out} (${entries.length} archivos, ${(zip.length / 1024).toFixed(1)} KB)`)
}
