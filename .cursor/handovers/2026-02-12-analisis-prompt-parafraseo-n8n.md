# Handover: Analisis Prompt "Parafrasear mensaje agente" (N8N)

**Fecha:** 2026-02-12
**Tipo:** Auditoria / Analisis (sin cambios de codigo)
**Workflow N8N:** `58EiIGUSfFmGQVFz` ("Parafrasear mensaje agente")
**Prompt version:** v103 (almacenado en Airtable, record `recNo2hQ46SoqwAKl`)
**Estado:** Analisis completo, pendiente implementar mejoras en Airtable

---

## Contexto

El workflow recibe mensajes escritos por ejecutivos de Vida Vacations antes de enviarse por WhatsApp. Un LLM (Claude via Anthropic Chat Model) los corrige/mejora y devuelve dos opciones:
- **option1**: Version corta, sin emojis
- **option2**: Version completa con emojis y calidez

Pipeline completo: Webhook → Rate Limit → Black&White List (Airtable, 195 entries) → Merge Prompt (Airtable v103) → Anthropic LLM → Structured Output Parser → Guardrail Capa 2 (B&W validation) → Respond

---

## Errores Detectados en Produccion (15 ejecuciones analizadas)

### Error critico: Inversion semantica

| Ejecucion | Input | Problema |
|-----------|-------|----------|
| **1280140** (#5) | "se nos corto la llamada sr efren" | option2 agrega "Disculpe, ¿sigue disponible?" — frase inventada |
| **1280113** (#6) | "...noi se si es de su agrado hospedarse..." | option2 agrega "Me encantaria platicarle mas sobre lo que ofrecemos" — inventado |
| **1279953** (#11) | "LE MARCA DEL NUMERO 800 223 3444" (ella llama al cliente) | option1: "Puede marcarle al 800..." — **INVIERTE quien llama a quien** |
| **1279917** (#14) | "NOS ESTAMOS TRATANDO DE COMUNICAR..." | option2 agrega "¿Se encuentra disponible en este momento?" — pregunta inventada |

**Exec #11 es la mas grave:** Cambia la semantica del mensaje. El agente dice "ella le marca", el output dice "usted puede marcarle". El cliente recibiria informacion incorrecta.

### Inconsistencia por no-determinismo

Las ejecuciones #11, #12, #13 procesan el mismo input identico y producen 3 outputs diferentes. Sugiere temperatura > 0 en el modelo.

---

## Problemas del Prompt

### 1. Redundancia excesiva (dilusion de instrucciones)

| Concepto | Repeticiones | Secciones |
|----------|-------------|-----------|
| "No respondas/no inventes" | 5x | `<rol>`, `<direccion_comunicacion>`, `<instrucciones>`, `<reglas_criticas>`, `<recordatorio>` |
| "Manten la direccion" | 4x | `<direccion_comunicacion>`, `<instrucciones>`, `<reglas_criticas>`, `<recordatorio>` |
| Diferencia option1 vs option2 | 4x | `<instrucciones>`, `<diferencia_entre_opciones>`, `<reglas_criticas>`, `<recordatorio>` |

Repetir la misma instruccion con redaccion diferente puede hacer que el LLM la trate como sugerencia en vez de regla dura.

### 2. Contradiccion interna

- `<instrucciones>` paso 7: "option1: 30-50% mas breve que option2"
- `<reglas_criticas>`: "MANTEN TODO el contenido original"

Estas dos instrucciones son mutuamente excluyentes. El modelo debe decidir que quitar, y a veces quita/cambia lo incorrecto (evidencia: exec #11).

### 3. Personalidad "Natalia" empuja creatividad

La seccion `<personalidad_vida_vacations>` describe una persona con emociones, expresiones y estilo. Esto es util para generacion, pero contraproducente para un sistema de correccion. Empuja al modelo a inyectar calidez que no existia en el mensaje original (causa directa de errores #5, #6, #14).

### 4. Diccionario Vidanta subutilizado

~400 tokens del Diccionario Vidanta se cargan en cada llamada. De 15 ejecuciones, solo 1 lo uso ("circo" → "Cirque du Soleil"). Mejor candidato para post-procesamiento determinista.

### 5. Sobre-ejemplificacion

7 ejemplos cuando 3-4 bien elegidos bastarian. Los ejemplos 2-4 y 5-6 son redundantes entre si.

---

## Recomendaciones

### Prioridad Alta (reduce errores)

1. **Reformular option1 vs option2 sin contradiccion:**
   ```
   option1: Correccion MINIMA - Solo ortografia, gramatica, tono grave.
            Cambia lo MENOS posible. SIN emojis.
   option2: Version MEJORADA - Mejor redaccion, calidez y 2-4 emojis.
            Puede reorganizar frases pero NUNCA agregar informacion nueva.
   ```

2. **Eliminar `<personalidad_vida_vacations>`** y reemplazar con regla de estilo corta:
   ```
   <estilo>
   - Trato de "usted" con calidez
   - Tono profesional pero cercano
   - NO agregues frases de cortesia que el agente no escribio
   - Solo mejora lo que existe, no inyectes personalidad
   </estilo>
   ```

3. **Consolidar las 5 repeticiones** en UNA seccion fuerte al final:
   ```
   <regla_absoluta>
   PROHIBIDO agregar contenido que el agente NO escribio.
   Cada palabra del output debe ser rastreable al input original.
   Si no esta en el input, no va en el output.
   </regla_absoluta>
   ```

4. **Agregar ejemplo negativo de inversion semantica:**
   ```
   <ejemplo_error>
   Input: "LE MARCA DEL NUMERO 800 223 3444"
   ❌ "Puede marcarle al 800 223 3444" (cambio quien llama)
   ✅ "Le marca del numero 800 223 3444" (mantiene quien llama)
   </ejemplo_error>
   ```

5. **Reducir temperatura a 0** para outputs deterministas.

### Prioridad Media (optimizacion)

6. **Mover Diccionario Vidanta a capa 2** (post-procesamiento determinista con string-match en N8N, no en el prompt)
7. **Reducir ejemplos de 7 a 4** bien diferenciados (pregunta, afirmacion, multi-parte, guardrail)
8. **Eliminar secciones redundantes** — dejar solo `<instrucciones>` + `<estilo>` + `<regla_absoluta>` + `<formato_output>` + `<ejemplos>` + `<guardrail_criterios>`

### Prioridad Baja (mejora futura)

9. Agregar campo `confidence` al output para que el frontend pueda advertir al ejecutivo cuando el modelo tiene baja confianza
10. Logging de diff input→output para detectar automaticamente cuando se agrego contenido

---

## Estructura del Prompt Propuesto (esqueleto)

```
<rol> (3 lineas max)
<estilo> (4 lineas)
<instrucciones> (pasos 1-6, sin repetir conceptos de otras secciones)
<formato_output> (JSON schema)
<guardrail_criterios> (que si / que no)
<ejemplos> (4 ejemplos: pregunta, afirmacion, multi-parte, guardrail)
<ejemplo_error> (1 ejemplo de inversion semantica)
<regla_absoluta> (3 lineas, al final del prompt para recencia)
```

Estimacion: ~60% menos tokens que el prompt actual, con mejor adherencia a las reglas.

---

## Datos Tecnicos del Pipeline

- **Tiempo de respuesta:** ~2-3 segundos por mensaje
- **Modelo:** Anthropic Claude (via N8N Anthropic Chat Model node)
- **Guardrail capa 1:** LLM evalua contenido
- **Guardrail capa 2:** N8N valida contra B&W list de Airtable (195 entradas)
- **Todas las 15 ejecuciones:** guardrail=false, capa2 aprobado=true, 0 errores de guardrail

---

## Archivos / Recursos Relacionados

- **Workflow N8N:** https://primary-dev-d75a.up.railway.app/workflow/58EiIGUSfFmGQVFz
- **Prompt en Airtable:** record `recNo2hQ46SoqwAKl` (v103)
- **B&W List:** Airtable (195 entradas con blacklist/whitelist)
- **Ejecuciones analizadas:** IDs 1279891 a 1280800 (2026-02-12 ~17:37-18:08 UTC)

---

## Siguiente Paso

Implementar las recomendaciones de prioridad alta directamente en Airtable (prompt v104). No requiere cambios en el workflow N8N ni en el codigo frontend. Probar con las mismas 5 entradas que fallaron para validar mejora.
