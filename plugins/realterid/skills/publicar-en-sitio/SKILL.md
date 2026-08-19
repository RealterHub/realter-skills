---
name: publicar-en-sitio
description: >-
  Sincroniza el workspace local del asesor con su sitio RealterID: detecta qué piezas son
  nuevas, cuáles cambiaron y cuáles están al día, y publica vía MCP lo que el asesor apruebe.
  Úsala cuando el asesor pida "publica esto", "sube mis cambios" o "¿qué me falta por publicar?".
  Syncs the advisor's local workspace with their RealterID site: detects create/update/up-to-date
  per piece and publishes via MCP. Use when the user asks to publish or sync their content.
version: 0.1.0
---

# Publicar en sitio

> **ESQUELETO (v0.1.0)** — flujo y contrato definidos; falta el desarrollo completo
> (ver TODO al final).

## Propósito

El paso final del workspace (`guides/workspace.md`): mirar todas las piezas locales, decidir
por su bloque `meta` qué hay que hacer con cada una, y ejecutarlo vía MCP con aprobación del
asesor. Nunca publica en bloque sin listar antes qué va a pasar.

## Flujo resumido

1. Reconocer el workspace (`.realterid/config.json`); sin workspace esta skill no aplica
   (en modo degradado cada skill publica directo).
2. **Inventario**: recorrer `perfil/`, `servicios/`, `articulos/`, `testimonios/`, `paginas/`
   y clasificar cada `pieza.json` por su `meta`:
   - `remoteId: null` → **crear** (ciclo create_*_draft → set_* de su tipo).
   - hash actual ≠ `contentHash` → **actualizar** (set_* de los bloques que cambiaron).
   - hash igual → **al día** (no tocar).
   - `publishedAt: null` con `remoteId` → borrador remoto pendiente de **publicar**.
3. Mostrar el plan como tabla (pieza · acción · detalle) y pedir aprobación; permitir elegir
   un subconjunto. La aprobación del **plan** no sustituye la aprobación del **contenido**: una
   pieza sin `meta.approvedAt`, o cuyo `approvedHash` ya no coincide con su `content`, se muestra
   entera y se aprueba antes de publicarla (en Claude Code el hook de pre-publicación la frena).
4. Ejecutar por pieza con las tools de su dominio (servicios, posts, testimonios, páginas,
   marca), verificando antes el estado remoto con la `get_*`/`search_*` correspondiente:
   si el remoto cambió desde `lastSyncedAt`, es **conflicto** — mostrar la diferencia y que
   decida el asesor, jamás sobrescribir a ciegas.
5. Publicación explícita donde el tipo lo exige (`publish_service`, `publish_post`,
   `publish_page`) y visibilidad en testimonios (`set_testimonial_visibility`).
   Reportar `missing_for_publish`/warnings de lo que no pudo publicarse.
6. Actualizar `meta` de cada pieza tocada (`remoteId`, `publishedAt`, `lastSyncedAt`,
   `contentHash`) y regenerar su `pieza.md`. `approvedAt`/`approvedHash` **no se tocan aquí**:
   los escribe la skill que mostró el borrador cuando el asesor dijo que sí.
7. Cierre: resumen (creadas / actualizadas / publicadas / al día / con conflicto) y commit
   descriptivo ("sync: 2 servicios actualizados, 1 artículo publicado").

## TODO para completar esta skill

- [ ] Algoritmo de hash normalizado (JSON canónico) documentado en `references/`, idéntico
      al que usan las demás skills al escribir `meta.contentHash`.
- [ ] Mapa tipo→ciclo de tools (qué set_* corresponde a cada bloque de cada schema).
- [ ] Detección de conflicto remoto por tipo (qué campos comparar de cada `get_*`).
- [ ] Estrategia de reintentos y de errores parciales (una pieza falla, el resto sigue).
- [ ] Modo "dry-run" por defecto cuando el asesor pide "¿qué falta por publicar?".
- [ ] Manejo de medios referenciados aún no subidos (upload_image antes del set_* que los usa).
