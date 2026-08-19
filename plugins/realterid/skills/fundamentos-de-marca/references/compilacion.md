# Reglas de compilación: de la conversación al brief-para-LLM

El asesor habla en anécdotas y rodeos; el brief se guarda en **formato-para-LLM**. Estas reglas
convierten lo primero en lo segundo sin perder verdad.

## Qué es formato-para-LLM

1. **Denso y factual**: cada frase carga un dato. Se elimina todo lo que no informe a un modelo
   que va a redactar (muletillas, contexto conversacional, cortesía).
2. **Declaraciones directas** en primera persona del asesor: "Trabajo solo preventa residencial",
   no "al asesor le gusta enfocarse en...".
3. **Ejemplos completos**: si un rasgo de tono necesita ejemplo, el ejemplo va entero y textual,
   no descrito. "Directo: digo el precio en el primer párrafo" > "es directo".
4. **Sin adornos ni marketing**: el brief no se publica; pulirlo para que "suene bien" lo empeora.
   Mientras más concreto y aburrido, mejor escribe después la IA.
5. **Autocontenido**: quien lo lea no tiene la conversación. Nada de "como dije antes" ni
   referencias a la entrevista.

## Transformaciones permitidas y prohibidas

| Permitido | Prohibido |
| --- | --- |
| Condensar tres frases del asesor en una declaración | Añadir un hecho, número o matiz que él no dijo |
| Quitar muletillas y repeticiones | "Mejorar" una cifra o redondearla sin confirmar |
| Reordenar material al bloque que corresponde | Mover una frase textual a `samplePhrases` editada — ahí van tal cual |
| Traducir jerga conversacional a declaración ("yo no vendo humo" → "No afirmo nada del proyecto que no haya verificado") **confirmándolo con él** | Compilar sin confirmar cuando la transformación cambia el sentido |
| Dejar un campo vacío | Rellenar con genéricos plausibles |

## Por campo

- `valueProposition`: 2-3 frases: qué + para quién + por qué él. Si tras compilar podría firmarla
  otro asesor, aún no está: falta lo específico.
- `idealClient` / `notIdealClient`: perfil con datos (origen, edad aproximada, presupuesto,
  momento, miedo principal). Los adjetivos se sustituyen por el hecho que los originó.
- `clientObjections[]`: la objeción con las palabras del cliente; la respuesta con las del asesor,
  condensada pero reconocible como suya.
- `toneDescription`: 3-6 rasgos, formato "Rasgo: cómo se ve en la práctica". Cada rasgo sale de
  algo observado en sus mensajes reales, no de su autoevaluación.
- `wordsToUse` / `wordsToAvoid`: términos textuales, uno por entrada, sin duplicados y sin
  cruces entre listas. Solo lo que él dijo o validó.
- `samplePhrases`: **cero edición** (solo ortografía evidente con su permiso). Son la muestra de
  ADN de su voz.
- `contentRules`: en imperativo negativo, una regla por línea: "Nunca garantizar rentabilidad.
  Nunca dar consejo fiscal: derivar a su contador."
- `differentiators[]`: `claim` en una línea; `evidence` con el dato verificable (≥20 caracteres,
  regla del MCP). Afirmación sin prueba = no entra.
- `trackRecord`: una línea por dato, números primero: "12 años en el mercado. ~30 cierres/año,
  ticket medio USD 200k."
- `specialties[]` / `areasServed[]`: nombre corto + detalle concreto. Solo lo que trabaja de
  verdad: inflar esta lista hace que la IA escriba de lo que no vende.
- `typicalPriceRange`: rango con moneda, tal cual opera.

## Control final antes de mostrar el borrador

1. ¿Todo dato tiene origen en palabras del asesor? (trazabilidad mental: pregunta → respuesta → campo)
2. ¿Hay algún adjetivo sin hecho detrás? → convertir o eliminar.
3. ¿Las listas respetan topes y reglas del schema? (`schema/fundamentos.schema.json`)
4. ¿`missing_for_brief` refleja honestamente lo que quedó vacío?
