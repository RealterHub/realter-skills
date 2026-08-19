---
name: editar-paginas
description: >-
  Edita las páginas del sitio RealterID del asesor inmobiliario (home, sobre mí, servicios,
  propiedades, contacto, blog) vía MCP: heros, secciones, CTAs, SEO, y publicación explícita
  con publish_page. Úsala cuando el asesor quiera cambiar textos, imágenes o secciones de su
  web. Edits the advisor's RealterID site pages (hero, sections, CTAs, SEO) via MCP with
  explicit publish. Use when the user wants to change texts, images or sections of their website.
version: 0.1.0
---

# Editar páginas

> **ESQUELETO (v0.1.0)** — flujo y contrato MCP definidos; falta el desarrollo completo
> (ver TODO al final).

## Propósito

Que el asesor edite sus seis páginas conversando: leer qué hay en cada sección, corregir textos
y CTAs con su voz de marca, cambiar imágenes, encender/apagar secciones y publicar cuando él lo
diga. Páginas: `home-page`, `about-page`, `services-page`, `properties-page`, `contact-page`,
`blog-page` (se nombran por su slug real en las tools).

## Flujo resumido

1. `get_brand_foundations` antes de redactar cualquier texto. Workspace: `paginas/<slug>/`.
2. **Leer antes de escribir**: `get_page(page)` da el mapa de secciones (qué hay, qué está
   apagado, qué falta en `missing_required`, qué secciones son de solo lectura por venir de otra
   colección o de la configuración del sitio). `get_page(page, section)` trae la sección completa
   **con `row_id` por fila** — consérvalos al reescribir arrays o se destruye el otro idioma.
3. Editar por contrato (todas con `null` = no tocar, `clear[]` = vaciar explícito):
   - Compartidas: `set_page_hero` · `set_page_final_cta` · `set_page_seo` ·
     `set_page_faqs` (hoy solo `properties-page`).
   - Home: `set_home_cta` · `set_home_section_header` (enabled+título de 8 secciones) ·
     `set_home_trust_bar` · `set_home_about_agent` · `set_home_areas` (mínimo 1 zona).
   - Sobre mí: `set_about_story` · `set_about_expertise` · `set_about_credentials` ·
     `set_about_areas_served`.
   - Contacto: `set_contact_settings` · `set_contact_schedule`.
   - Listados: `set_listing_page_settings` (paginación de /propiedades y /blog, clusters destacados).
   - Ids: `list_page_references` (clusters, formularios) y `list_media`/`upload_image` — nunca inventarlos.
4. **La edición queda en borrador**: nada sale al sitio hasta `publish_page(page)`, que es
   explícito y **arrastra también los borradores autoguardados que el asesor dejó en el admin**
   — advertirlo antes de publicar. Toda escritura devuelve `has_unpublished_changes`.
   No existe `unpublish_page`: una página del sitio no se retira.
5. Fuera de alcance (decirlo, no ocultarlo): menú, footer, datos de contacto (tel/WhatsApp/redes)
   e idiomas viven en la configuración del sitio y **no se editan por MCP**. Página sin documento
   ⇒ `not_found`: se arregla desde el admin, la skill no la crea.
6. `locale` nulable (null = idioma principal). Cierre: `meta` del workspace + ofrecer commit.

## TODO para completar esta skill

- [ ] `schema/` por página (o schema único con las seis) derivado de los contratos compartidos
      (hero, finalCta, cta, faqs, meta) + campos propios.
- [ ] `templates/pieza.md` por página.
- [ ] `references/flujo-mcp.md`: las 19 tools con firmas, `clear[]` permitidos y errores.
- [ ] Banco de entrevista por página (home: cifras de la trust bar reales; sobre mí: historia
      con `storytelling.md`; contacto: horarios).
- [ ] Estrategia de diff: mostrar "así está / así quedaría" por sección antes de escribir.
- [ ] Manejo multi-idioma de arrays (row_id) con ejemplos.
