---
name: escribir-articulo
description: >-
  Escribe y publica un artículo del blog del asesor inmobiliario en su sitio RealterID:
  entrevista, redacta con su voz y publica vía MCP (create_post_draft → set_post_content →
  publish_post). Úsala cuando el asesor quiera escribir, editar o publicar un artículo o post.
  Writes and publishes a blog article on the advisor's RealterID site via MCP. Use when the
  user wants to write, edit or publish a blog post or article.
version: 0.1.0
---

# Escribir artículo

> **ESQUELETO (v0.1.0)** — flujo y contrato MCP definidos; falta el desarrollo completo
> (ver TODO al final). Las reglas de oro ya aplican.

## Propósito

Que el asesor publique artículos de blog útiles y con su voz: una intención de búsqueda por
artículo, hechos y anécdotas suyas, 800+ palabras que respondan de verdad. Sigue las guías
compartidas (`storytelling.md`, `copywriting.md`, `seo-basico.md`) y la regla de oro:
**jamás inventar datos, cifras ni experiencias del asesor** — la IA redacta, el asesor aporta
los hechos.

## Flujo resumido

1. `get_brand_foundations` SIEMPRE antes de redactar. Workspace: `articulos/<slug>/pieza.json`
   (+ `pieza.md`), convención de `guides/workspace.md`; modo degradado sin filesystem.
2. Entrevista corta (tandas de 2-4): tema y búsqueda que responde, experiencia del asesor sobre
   el tema (anécdotas, cifras, posturas), a qué servicio suyo enlaza.
3. Redactar en **Markdown** (títulos, listas, citas, enlaces; el cuerpo entra y sale como
   markdown). Mostrar el borrador completo para aprobación.
4. Publicar vía MCP:
   - `list_post_categories` antes de tocar categorías; `create_post_category` solo con
     confirmación explícita del asesor (tope de 12 por sitio; una taxonomía inflada es peor que ninguna).
   - `create_post_draft(title, category_ids)` → `post_id` + `missing_for_publish`.
   - `set_post_details` (excerpt, slug, fecha) · `set_post_content` (markdown; reemplaza todo) o
     `append_post_content` para artículos largos por secciones (¡no es idempotente: dos llamadas
     duplican texto!) · `set_post_cover_image` (portada **requerida**; `upload_image`/`list_media`
     primero) · `set_post_seo` (opcional; el sitio cae a title/excerpt).
   - Imágenes intercaladas: **solo** `![media:ID]()` con ids de `upload_image` — una URL externa
     en el markdown es rechazada (`invalid_input`).
   - `publish_post` — si falta algo: `unprocessable` con la lista. Fija la fecha a "ahora" si el
     asesor no la dio. Retirar: `unpublish_post`.
5. Topes: 20.000 caracteres por llamada, 60.000 acumulados; `get_post` recorta a 20.000 con
   warning — no reescribas un artículo desde una lectura truncada.
6. El autor del post es el portador de la credencial MCP. `locale` nulable (null = idioma
   principal del sitio).
7. Cierre: actualizar `meta` del workspace, ofrecer commit.

## TODO para completar esta skill

- [ ] `schema/articulo.schema.json` derivado de los campos reales del post (title, excerpt,
      categoryIds, coverMediaId, contentMarkdown, publishedDate, seo.*, meta de sync).
- [ ] `templates/pieza.md` (vista legible con estado y pendientes).
- [ ] `references/entrevista.md`: banco de preguntas (ángulo, experiencia, long-tail) al estilo
      de `crear-servicio`.
- [ ] `references/flujo-mcp.md`: tabla completa de las 14 tools de blog con sus reglas.
- [ ] Guía de estructura del artículo (H1 = la búsqueda; primer párrafo = el problema del lector;
      enlace obligatorio a un servicio).
- [ ] Manejo de series/traducciones (conservar ids de fila y slug por idioma).
