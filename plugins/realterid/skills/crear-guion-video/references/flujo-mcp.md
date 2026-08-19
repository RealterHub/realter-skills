# Flujo MCP de un guion de video — solo lecturas

Esta skill **no escribe nada en el sitio del asesor**. El MCP se usa como fuente de contexto y
nada más; el entregable es el archivo local (`pieza.json` + `pieza.md`) que el asesor se lleva a
grabar. No existe `create_video_script`, `set_video_*` ni `publish_video` — y si algún día el
sitio expusiera algo así, esta referencia sería lo primero que habría que reescribir.

## Las dos tools que se usan (lectura, al principio de la sesión)

| Tool | Para qué | Cuándo |
| --- | --- | --- |
| `get_brand_foundations` | Trato (`addressForm`), `wordsToUse`/`wordsToAvoid`, `contentRules` y `samplePhrases` — la voz con la que se escribe el guion. | **Siempre**, antes de redactar una sola línea. |
| `get_property` (y `search_properties` para encontrarla) | La ficha ya confirmada de la propiedad cuando el video es un `tour` o la usa de ejemplo: habitaciones, amenidades, ubicación, lo que la distingue. | Solo si el video es de una propiedad. |

`list_media` es opcional y solo informativa (saber qué fotos existen); esta skill **no sube ni
asigna medios**: no llama `upload_image` ni ninguna `set_*`.

## Por qué no hay ciclo de escritura

El guion es un documento de trabajo para grabar, no contenido publicable del sitio: nadie visita
`/guiones/…`. Lo que se publica es el **video ya grabado**, en la red social del asesor, y eso
ocurre fuera de este plugin. Por eso la pieza no tiene `remoteId` ni `publishedAt`, y por eso los
hooks `gate-writes`/`gate-publish` no se disparan nunca aquí: no hay escritura que frenar.

Que no haya red de seguridad **no relaja el método**: la lectura como espectador
(`meta.consumerReview`) y la aprobación del asesor (`meta.approvedAt`) se registran igual, y el
hook de escritura de archivos sí valida esta pieza contra `schema/guion.schema.json`.

## Errores del MCP (lecturas)

| Código | Qué significa | Qué hacer |
| --- | --- | --- |
| `not_found` | La propiedad no existe en la cuenta del asesor | No inventes la ficha: ofrécele cargarla con `cargar-propiedad`, o sigue con lo que él cuente ahora. |
| `forbidden` | Cuenta suspendida (conserva lectura, pierde escritura) | Las lecturas de esta skill siguen funcionando; si algo falla, díselo tal cual. |
| Sin conexión MCP | No hay brief ni ficha | La skill funciona igual: se entrevista todo a mano y se avisa que el resultado mejora con `fundamentos-de-marca`. |
