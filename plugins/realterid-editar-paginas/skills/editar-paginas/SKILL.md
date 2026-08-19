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

<!-- NO EDITAR — generado por scripts/build-plugins.mjs desde src/skills/editar-paginas/SKILL.md. Los cambios hechos aquí se pierden en el próximo build; edita la fuente. -->

# Editar páginas

> **ESQUELETO (v0.1.0)** — flujo y contrato MCP definidos; falta el desarrollo completo
> (ver TODO al final).

## Método (obligatorio)

Esta skill sigue el **método común de RealterID**, en `references/metodo.md` (viaja dentro de
esta misma skill). Léelo antes de la primera pregunta. En corto:

1. **Propón para que confirme.** No le pidas al asesor que produzca en frío: deduce lo plausible
   del contexto y que él confirme, corrija o niegue. **Nada deducido se registra sin su "sí".**
2. **Evalúa como el consumidor final** antes de dar la pieza por terminada: simula sus 3-5
   preguntas, mira cuáles no responde el borrador y haz una tanda dirigida a eso (máx. 2-3
   pasadas; después, lista lo pendiente y decide el asesor).
3. **Archivo primero, MCP al final.** Todo se construye en la pieza local; las escrituras al MCP
   se ejecutan al final, desde el script derivado del archivo y aprobado por el asesor. Las
   **lecturas** (`get_*`, `list_*`, `search_*`) sí van al principio: son insumo, no escritura.

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

## Sobre mí (`about-page`): entrevista biográfica — desarrollado

Es la página que más se resiste y la que más rinde: **el asesor no sabe hablar de sí mismo**, así que
"cuéntame tu historia" devuelve una página vacía o un genérico que firmaría cualquiera. Aquí no se
pregunta por la página, se excava por territorios siguiendo `entrevista-biografica.md`
(`references/` de esta misma skill). Léela antes de la primera pregunta.

**Antes**: `get_brand_foundations` (mucho de esto ya puede estar en `track_record`, `differentiators`
y `specialties`: **no lo vuelvas a preguntar**, muéstralo y pide confirmar o ampliar) y
`get_page('about-page')` para ver qué secciones ya tienen texto.

Mapeo territorio → campo, que es el orden en que conviene preguntar:

| Territorio (checklist de la guía) | Preguntas de arranque | Va a |
| --- | --- | --- |
| Origin story · carrera previa · primera venta · hitos | "¿Qué hacías antes de bienes raíces?" · "¿En qué año empezaste y por qué?" · "¿Cómo fue tu primera venta?" · "¿Cuál fue la operación más difícil que cerraste?" | `set_about_story` |
| Especialidad real · números · qué resuelve mejor que nadie | "¿Qué tipo de operación haces mejor que el promedio?" · "¿Cuántas llevas de esas?" | `set_about_expertise` |
| Formación · certificaciones · licencias · idiomas · reconocimientos | "¿Qué estudiaste?" · "¿Tienes alguna certificación o licencia?" · "¿En qué idiomas atiendes?" · "¿Algún premio o mención?" | `set_about_credentials` |
| Origen y arraigo local | "¿De dónde eres y hace cuánto vives o trabajas ahí?" · "¿Qué zonas recorres de verdad cada semana?" | `set_about_areas_served` |

Reglas que no se negocian en esta página:

- **Nada de preguntas abiertas** ("háblame de ti", "describe tu trayectoria"): producen blanco o relleno.
  Se pregunta por hechos y episodios — con fecha, lugar, número o nombre.
- **Espejo antes de escribir**: devuelve cada dato en lenguaje de valor y pide confirmación
  (*"estudiaste ingeniería civil → puedes evaluar la obra por dentro; ¿lo pongo así?"*). Su corrección
  suele ser la frase que va a la página.
- **Una** repregunta suave por territorio si la respuesta es corta, con ejemplos **de terceros** y
  diciendo que son ajenos ("muchos asesores vienen de banca o construcción, ¿tú de dónde vienes?").
  Sin respuesta tras esa, se cierra el territorio: un campo vacío es honesto, un campo inventado no.
- **Lo que el asesor no confirme como propio no se escribe.** Desbloquear no es inducir a inventar:
  ni deducir (ingeniero ≠ dirigió obras), ni redondear años u operaciones al alza.
- La historia se estructura problema → decisión → resultado (`storytelling.md`), en su voz y su trato.
- Cuando el material sea claramente de marca (diferenciadores con prueba, track record), ofrécele
  llevarlo también al brief con `fundamentos-de-marca`: se escribe una vez y lo usan todas las skills.

## TODO para completar esta skill

- [ ] `schema/` por página (o schema único con las seis) derivado de los contratos compartidos
      (hero, finalCta, cta, faqs, meta) + campos propios.
- [ ] `templates/pieza.md` por página.
- [ ] `references/flujo-mcp.md`: las 19 tools con firmas, `clear[]` permitidos y errores.
- [ ] Banco de entrevista por página (home: cifras de la trust bar reales; contacto: horarios).
      Sobre mí ya está desarrollado arriba con `entrevista-biografica.md`.
- [ ] Estrategia de diff: mostrar "así está / así quedaría" por sección antes de escribir.
- [ ] Manejo multi-idioma de arrays (row_id) con ejemplos.
