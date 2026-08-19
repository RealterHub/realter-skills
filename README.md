# Realter Skills

**Tu asistente de IA, entrenado para trabajar tu sitio RealterID contigo.**

Instala este paquete en tu cliente de IA (Claude Code o Claude) y conversa con él como con un
asistente que conoce tu negocio: te entrevista, redacta con tu voz y publica en tu sitio — con
tu aprobación, siempre.

```
> acabo de visitar un apartamento en Piantini, ayúdame a cargarlo
> escríbeme los copies de Instagram y TikTok de esa propiedad
> quiero un guion de video para presentarme como asesor
```

## Qué puedes hacer

| Le dices... | La skill que trabaja |
| --- | --- |
| "Quiero definir mi marca" — te entrevista sobre quién eres, tu trayectoria y tu forma de hablar, y crea el perfil que la IA usará para escribir **como tú** | `fundamentos-de-marca` |
| "Ayúdame a cargar esta propiedad" — te guía por la visita habitación por habitación, te propone amenidades para que solo confirmes, y la publica completa | `cargar-propiedad` |
| "Crea mi página de servicio de venta de proyectos" — entrevista, redacción y publicación de la landing completa | `crear-servicio` |
| "Hazme los copies de redes de esta propiedad" — pack por plataforma (Instagram, Facebook, TikTok...) con ganchos alternativos y hashtags | `crear-copies-sociales` |
| "Quiero grabar un reel de esta propiedad" — guion listo para grabar: qué mostrar, qué decir, texto en pantalla y lista de tomas | `crear-guion-video` |
| Escribir artículos del blog, cargar testimonios, editar las páginas de tu sitio y sincronizar todo | próximamente |

**Tres promesas de todas las skills:**
1. **Nunca inventan datos tuyos ni de tus propiedades** — lo que no des, te lo preguntan o queda vacío.
2. **Nada se publica sin que lo apruebes** — siempre ves el borrador completo antes.
3. **Tu contenido queda en archivos en tu computadora** — tuyo, versionado, sin depender de ningún chat.

## Instalación

### Claude Code (recomendado)

[Claude Code](https://claude.com/claude-code) es la app de Claude para tu computadora. Con ella instalada, abre una terminal y ejecuta:

```bash
claude plugin marketplace add RealterHub/realter-skills
claude plugin install realterid
```

Listo. Las skills se activan solas cuando conversas sobre tu marca, tus propiedades o tu contenido.

### Claude (claude.ai, web y escritorio)

Descarga el `.zip` de cada skill que quieras desde
[**Releases**](https://github.com/RealterHub/realter-skills/releases) y súbelo en
**Configuración → Capacidades → Skills**. Aquí no hay archivos locales: trabajas los borradores
en la conversación y publicas directo a tu sitio.

### ChatGPT

Estas skills están hechas para los clientes de Claude; en ChatGPT no están disponibles.

> **¿Y la conexión con mi sitio?** Para publicar, tu cliente de IA se conecta a tu sitio
> RealterID — eso se configura una sola vez desde tu panel (**Inteligencia Artificial**), que
> te guía paso a paso. Las skills te avisan si aún no está conectado.

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

**¿Sirve para otro sitio que no sea RealterID?** No — estas skills están hechas para el sitio del asesor de [RealterHub](https://realterhub.com).

---

<sub>¿Eres desarrollador o mantienes este repo? La documentación técnica está en [docs/DESARROLLO.md](docs/DESARROLLO.md).</sub>
