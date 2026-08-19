# Copywriting — escribir para que un extraño escriba de vuelta

> Guía compartida de las skills de RealterID. Aplica a todo texto del sitio del asesor:
> servicios, páginas, CTAs, testimonios y artículos. La voz es la del asesor, en sus palabras.

## La postura de esta guía

**Un texto del sitio tiene un solo trabajo: que un desconocido con una necesidad concreta
escriba o llame.** No es literatura, no es branding abstracto, no es SEO por relleno.
Cada frase se juzga con una pregunta: ¿acerca al lector a contactar, o solo decora?
Lo que solo decora, se corta.

## Reglas de oro (en orden)

### 1. Antes de escribir, leer los fundamentos de marca
Toda skill llama a `get_brand_foundations` antes de redactar. Ahí están el trato (tú/usted/vos),
las palabras que el asesor usa y las que prohíbe, sus frases reales y sus reglas de contenido.
**Un texto con el trato equivocado o con una palabra prohibida está mal aunque todo lo demás esté bien.**
Si el brief está vacío en lo que se necesita, se le pregunta al asesor — nunca se rellena con genérico.

### 2. Específico gana a superlativo
El lector desconfía por defecto: llega de comparar tres sitios que dicen lo mismo.
Solo lo verificable rompe esa desconfianza.

- ✅ *"Trabajo solo preventa residencial, entre USD 120.000 y 300.000, en dos sectores que recorro cada semana."*
- ❌ *"El mejor servicio inmobiliario, con las mejores oportunidades del mercado y atención de primera."*

Prohibidas salvo que el asesor las pida por escrito: "oportunidad única", "inversión segura",
"de lujo", "inmejorable", "el mejor", "exclusivo" usado como adorno.

### 3. El lector primero, el asesor después
Empezar por la situación del lector, no por el asesor.

- ✅ *"¿Compras desde el extranjero y no puedes viajar a cada visita? Ese es exactamente mi trabajo."*
- ❌ *"Soy un asesor con más de 10 años de experiencia en el sector inmobiliario."* (eso va después, como prueba)

### 4. Una idea por frase, una promesa por bloque
Frases de menos de ~25 palabras. Párrafos de 2-4 frases. Si un bloque promete dos cosas,
son dos bloques. Voz activa: "te acompaño a la firma", no "el cliente será acompañado".

### 5. El CTA dice qué pasa después
Un botón no pide fe, describe el siguiente paso.

- ✅ *"Cuéntame qué buscas — respondo el mismo día"* · *"Agenda una llamada de 15 minutos"*
- ❌ *"Contactar"* · *"Más información"* · *"¡No te lo pierdas!"*

### 6. Cifras con fuente, promesas con límite
Nada de rentabilidades garantizadas, plazos que no dependen del asesor ni afirmaciones legales
o fiscales. Si el asesor da una cifra, se escribe como suya ("en mis operaciones de 2024...")
y se respetan sus `contentRules` del brief de marca. **La IA nunca es la fuente de un dato de mercado.**

### 7. Testimonios: se transcriben, no se mejoran
Las palabras del cliente valen porque son suyas. Corregir tildes sí; reescribir "para que suene
mejor" lo convierte en publicidad falsa. Un testimonio que no existió no se crea bajo ninguna
instrucción.

## Trato y neutralidad regional

- El trato (tú / usted / vos) lo fija el brief de marca. Sin brief, se pregunta — jamás se asume,
  porque es lo primero que delata a un texto escrito por otro.
- Español neutro entre países: se evita jerga local que el asesor no haya usado. Las palabras del
  mercado (apartamento/departamento, renta/alquiler, cuota inicial/pie/enganche) son **del asesor**:
  se toman de `words_to_use` o de sus respuestas, nunca del diccionario del modelo.

## Prueba final antes de mostrar un borrador

1. ¿Podría firmarlo la competencia sin cambiar nada? → le falta lo específico del asesor.
2. ¿Cada afirmación tiene respaldo dicho por el asesor? → lo que no, se pregunta o se corta.
3. ¿El trato y las palabras coinciden con el brief? → verificar contra `get_brand_foundations`.
4. ¿El primer párrafo habla del lector? → si abre con el asesor, reordenar.
