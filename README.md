# Realter Skills

**Skills de Realter para trabajar con RealterID y RealterHub desde tu cliente de IA.**

Instala este paquete en ChatGPT, Codex, Claude o Claude Code y conversa con él como con un
asistente que conoce tu negocio: te entrevista, redacta con tu voz y publica en tu sitio — con
tu aprobación, siempre.

```
> acabo de visitar un apartamento en Piantini, ayúdame a cargarlo
> escríbeme los copies de Instagram y TikTok de esa propiedad
> quiero un guion de video para presentarme como asesor
```

## Qué puedes hacer

El marketplace se organiza por producto. `realterid` gestiona el contenido del sitio del asesor.
`realterhub-operations` usa las tools del MCP de la cuenta RealterHub del usuario; su primera
skill, `project-property-quotation`, genera cotizaciones con proyección de pagos para unidades de
proyecto y propiedades listas o de reventa.

### RealterID

| Le dices... | La skill que trabaja |
| --- | --- |
| "Quiero definir mi marca" — te entrevista sobre quién eres, tu trayectoria y tu forma de hablar, y crea el perfil que la IA usará para escribir **como tú** | `fundamentos-de-marca` |
| "Ayúdame a cargar esta propiedad" — te guía por la visita habitación por habitación, te propone amenidades para que solo confirmes, y la publica completa | `cargar-propiedad` |
| "Crea mi página de servicio de venta de proyectos" — entrevista, redacción y publicación de la landing completa | `crear-servicio` |
| "Hazme los copies de redes de esta propiedad" — pack por plataforma (Instagram, Facebook, TikTok...) con ganchos alternativos y hashtags | `crear-copies-sociales` |
| "Quiero grabar un reel de esta propiedad" — guion listo para grabar: qué mostrar, qué decir, texto en pantalla y lista de tomas | `crear-guion-video` |
| Escribir artículos del blog, cargar testimonios, editar las páginas de tu sitio y sincronizar todo | próximamente |

**Tres promesas de las skills de RealterID:**
1. **Nunca inventan datos tuyos ni de tus propiedades** — lo que no des, te lo preguntan o queda vacío.
2. **Nada se publica sin que lo apruebes** — siempre ves el borrador completo antes.
3. **Tu contenido queda en archivos en tu computadora** — tuyo, versionado, sin depender de ningún chat.

## Instalación

### Codex y Claude Code

El repositorio incluye manifiestos nativos para ambos clientes: `.codex-plugin/plugin.json` y
`.claude-plugin/plugin.json`. En Claude Code puedes instalar el marketplace con:

```bash
claude plugin marketplace add RealterHub/realter-skills
claude plugin install realterid
# En desarrollo:
claude plugin install realterhub-operations
```

Instala solo el plugin del producto con el que vas a trabajar. Sus skills se activan según el pedido.

En Codex, instala el plugin desde el marketplace compatible de OpenAI. Durante desarrollo también
puedes cargar directamente `plugins/realterhub-operations`.

### ChatGPT y Claude

Descarga el `.zip` de cada skill que quieras desde
[**Releases**](https://github.com/RealterHub/realter-skills/releases). El mismo ZIP autocontenido
sirve para las superficies de ChatGPT y Claude que permiten instalar skills y ejecutar sus scripts.
También se puede distribuir el plugin completo mediante los directorios de plugins de cada proveedor.

Los hooks son una protección adicional en los clientes que los ejecutan. La exactitud no depende de
ellos: preguntas, estado, fórmulas, redondeo, validaciones, integridad y HTML/PDF pertenecen al script
determinista incluido en la skill.

> **¿Y la conexión con el producto?** Las skills que operan datos usan el MCP del producto y los
> permisos de la cuenta conectada. La conexión se configura fuera del plugin; ninguna skill guarda
> credenciales en sus archivos.

## Por dónde empezar

Empieza siempre por **tu marca**:

```
> quiero definir mi marca
```

Esa primera entrevista (unos 20-30 minutos, se puede pausar y retomar) crea el perfil con el que
la IA escribirá todo lo demás: tu tono, tus palabras, tu trayectoria, tu mercado. Después, pide
lo que necesites — cargar una propiedad, una página de servicio, los copies de la semana.

## Preguntas frecuentes

**¿Necesito saber programar?** No. Instalas con dos comandos y de ahí en adelante todo es conversación.

**¿La IA puede publicar algo sin mi permiso?** No. Todo borrador se te muestra completo y solo se publica cuando dices que sí. Además, tu clave del panel controla exactamente qué puede tocar.

**¿Dónde queda mi contenido?** En una carpeta en tu computadora (y en tu sitio cuando publicas). Puedes revisarla, editarla y respaldarla como cualquier archivo tuyo.

**¿Todos los plugins hacen lo mismo?** No. Cada plugin pertenece a un producto o dominio y solo
debe usar los contratos y las tools que le corresponden.
