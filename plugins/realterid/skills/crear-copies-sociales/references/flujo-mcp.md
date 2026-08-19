# Flujo MCP de un pack de copies sociales — solo lecturas

Esta skill **nunca escribe en el MCP**. Su entregable es 100% local (`pieza.json` + `pieza.md`);
el asesor copia y pega el copy donde vaya a postear. No hay `create_social_copy`, `set_social_*`
ni `publish_social_copy` — no existen, y esta skill no debe simular que existen. Si en algún punto
sientes la tentación de "publicar" el pack, repasa el método: aquí el paso final es mostrar el
pack completo y aprobado, no ejecutar un script MCP.

Todas las salidas del MCP son JSON con `{schema_version, ok, data|error, warnings}`; los errores
llegan como `{ok:false, code}`. Los ids viajan siempre como string.

## Las cuatro tools que sí se usan (todas de lectura, todas al principio de la sesión)

| Tool | Para qué | Notas |
| --- | --- | --- |
| `get_brand_foundations` | Trato, vocabulario (`words_to_use`/`words_to_avoid`), reglas de contenido y especialidades del asesor. Se llama SIEMPRE primero: sin esto no se sabe si tutea o trata de usted, ni qué palabras evitar. | Si vuelve vacío en lo esencial, se redacta igual pero se avisa que el copy no tiene voz propia todavía. |
| `search_properties(query, …)` | Encontrar la propiedad cuando el asesor la nombra por título o zona, o listar las más recientes si no la nombra. | Evita pedirle el id de memoria. |
| `get_property(property_id \| slug)` | Ficha completa de la propiedad: título, descripción, ubicación, precio, amenidades confirmadas — la materia prima del copy. | **Nunca se re-entrevista la propiedad aquí.** Si algo clave falta (portada, descripción), se dice y se sugiere `cargar-propiedad` primero — no se inventa para rellenar. |
| `list_media(search, page, page_size)` | Biblioteca de fotos de la propiedad, para sugerir cuáles usar en cada plataforma/slide. | Solo lectura: no se sube ni asigna nada (`upload_image` no se llama desde esta skill). |

## Por qué no hay ciclo de escritura

El resto de las skills de este plugin terminan con `create_*_draft → set_* → publish_*` porque su
contenido vive en el sitio del asesor. Un pack de copies sociales no vive ahí: vive en Instagram,
TikTok, Facebook — plataformas que este MCP no controla. Publicarlo es una acción manual del
asesor (o de una herramienta de programación de posts que él ya use), fuera del alcance de este
plugin. Por eso el "cierre" de esta skill es la aprobación del `pieza.md`, no una llamada MCP.

## Errores del MCP (lecturas)

| Código | Qué significa aquí | Qué hacer |
| --- | --- | --- |
| `not_found` | El `property_id`/`media_id` no existe en la cuenta del asesor | Re-resolver con `search_properties`/`list_media`; nunca asumir que es de otro asesor. |
| `forbidden` | Cuenta suspendida (conserva lectura, pierde escritura) | No aplica de lleno aquí porque esta skill no escribe, pero si la lectura también falla, decírselo al asesor tal cual: es su suscripción, no un fallo técnico. |
