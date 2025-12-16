# 📋 Webhook N8N - Procesamiento de Timeline con LLM

## 🎯 Propósito

Procesar texto libre con actividades y fechas escritas por el usuario y convertirlas en un array estructurado de actividades con título, descripción, fecha y prioridad.

---

## 📥 Payload de Entrada

### Estructura
```json
{
  "text": "Revisar presupuesto Q1 el 15 de febrero\nReunión con equipo de marketing el 20 de febrero\nPresentación ejecutiva el 25 de febrero\nRevisar contratos urgentes mañana"
}
```

### Ejemplo Real
```json
{
  "text": "- Revisar presupuesto Q1 el 15 de febrero\n- Reunión con equipo de marketing el 20 de febrero para discutir campaña\n- Presentación ejecutiva el 25 de febrero, alta prioridad\n- Revisar contratos urgentes mañana\n- Llamar a cliente importante el próximo lunes"
}
```

---

## 📤 Payload de Salida

### Estructura Esperada
```json
{
  "activities": [
    {
      "title": "Revisar presupuesto Q1",
      "description": "Revisión del presupuesto del primer trimestre",
      "due_date": "2025-02-15",
      "priority": "high"
    },
    {
      "title": "Reunión con equipo de marketing",
      "description": "Reunión para discutir campaña de marketing",
      "due_date": "2025-02-20",
      "priority": "medium"
    },
    {
      "title": "Presentación ejecutiva",
      "description": "Presentación para ejecutivos",
      "due_date": "2025-02-25",
      "priority": "high"
    },
    {
      "title": "Revisar contratos urgentes",
      "description": "Revisión de contratos pendientes",
      "due_date": "2025-01-XX", // Fecha calculada para "mañana"
      "priority": "urgent"
    }
  ]
}
```

### Formato de Fechas
- Formato: `YYYY-MM-DD` (ISO 8601)
- Ejemplos válidos:
  - `2025-02-15` (fecha específica)
  - `2025-01-20` (fecha específica)
  - Fechas relativas deben calcularse:
    - "mañana" → fecha de mañana
    - "próximo lunes" → próximo lunes
    - "en 3 días" → fecha actual + 3 días

### Prioridades Válidas
- `low` - Prioridad baja
- `medium` - Prioridad media (default)
- `high` - Prioridad alta
- `urgent` - Prioridad urgente

---

## 🤖 Prompt del Sistema (System Prompt)

```javascript
const systemPrompt = `Eres un asistente especializado en procesar listas de actividades y pendientes escritas en texto libre. Tu tarea es extraer cada actividad, identificar su fecha de compromiso, y estructurarla en un formato JSON consistente.

## INSTRUCCIONES:

1. **Extraer actividades**: Identifica cada actividad o pendiente mencionado en el texto
2. **Identificar fechas**: Extrae fechas explícitas o relativas (hoy, mañana, próximo lunes, etc.)
3. **Determinar prioridad**: Analiza el contexto para asignar prioridad:
   - "urgente", "urgente", "inmediato", "ya" → urgent
   - "importante", "prioritario", "alto" → high
   - "baja", "sin prisa" → low
   - Sin indicación → medium (default)
4. **Generar descripción**: Crea una descripción breve y clara si no está explícita
5. **Normalizar fechas**: Convierte todas las fechas al formato YYYY-MM-DD

## REGLAS DE FECHAS:

- "hoy" → fecha actual
- "mañana" → fecha actual + 1 día
- "pasado mañana" → fecha actual + 2 días
- "próximo lunes/martes/etc" → próximo día de la semana mencionado
- "en X días" → fecha actual + X días
- Fechas específicas: mantener formato YYYY-MM-DD

## REGLAS DE PRIORIDAD:

- Palabras clave "urgente", "inmediato", "ya", "ahora" → urgent
- Palabras clave "importante", "prioritario", "alto", "crítico" → high
- Palabras clave "baja", "sin prisa", "cuando puedas" → low
- Sin palabras clave o contexto neutral → medium

## FORMATO DE RESPUESTA:

Debes devolver SOLO un objeto JSON con la siguiente estructura:
{
  "activities": [
    {
      "title": "Título de la actividad (máximo 500 caracteres)",
      "description": "Descripción breve y clara (opcional pero recomendado)",
      "due_date": "YYYY-MM-DD",
      "priority": "low|medium|high|urgent"
    }
  ]
}

## EJEMPLOS:

Input: "Revisar presupuesto el 15 de febrero, reunión con marketing el 20, presentación ejecutiva urgente el 25"

Output:
{
  "activities": [
    {
      "title": "Revisar presupuesto",
      "description": "Revisión del presupuesto",
      "due_date": "2025-02-15",
      "priority": "medium"
    },
    {
      "title": "Reunión con marketing",
      "description": "Reunión con equipo de marketing",
      "due_date": "2025-02-20",
      "priority": "medium"
    },
    {
      "title": "Presentación ejecutiva",
      "description": "Presentación para ejecutivos",
      "due_date": "2025-02-25",
      "priority": "urgent"
    }
  ]
}

## IMPORTANTE:

- Si una actividad no tiene fecha explícita, intenta inferirla del contexto
- Si no puedes determinar una fecha, usa la fecha actual como fallback
- Títulos deben ser concisos pero descriptivos
- Descripciones deben ser opcionales pero útiles cuando el título es ambiguo
- Prioridad debe ser siempre una de las 4 opciones válidas
- Fechas deben estar siempre en formato YYYY-MM-DD`;
```

---

## 💻 Código Completo del Nodo N8N

```javascript
// Función para sanitizar strings y prevenir que rompan el JSON
function sanitizeString(str) {
  if (str === null || str === undefined) {
    return "";
  }
  
  return String(str)
    // Escapar comillas dobles
    .replace(/"/g, '\\"')
    // Escapar barras invertidas
    .replace(/\\/g, '\\\\')
    // Eliminar caracteres de control excepto \n y \t
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalizar saltos de línea
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Limitar saltos de línea consecutivos a máximo 2
    .replace(/\n{3,}/g, '\n\n')
    // Trim de espacios al inicio y final
    .trim();
}

// Extraer datos del input
const input = $input.first().json;
const textInput = sanitizeString(input.text || input.body?.text || "");

// Validar que hay texto
if (!textInput || textInput.length === 0) {
  return {
    json: {
      error: "No se proporcionó texto para procesar",
      activities: []
    }
  };
}

// Obtener fecha actual para cálculos de fechas relativas
const fechaActual = new Date();
const añoActual = fechaActual.getFullYear();
const mesActual = fechaActual.getMonth();
const diaActual = fechaActual.getDate();

// System prompt
const systemPrompt = `Eres un asistente especializado en procesar listas de actividades y pendientes escritas en texto libre. Tu tarea es extraer cada actividad, identificar su fecha de compromiso, y estructurarla en un formato JSON consistente.

## INSTRUCCIONES:

1. **Extraer actividades**: Identifica cada actividad o pendiente mencionado en el texto
2. **Identificar fechas**: Extrae fechas explícitas o relativas (hoy, mañana, próximo lunes, etc.)
3. **Determinar prioridad**: Analiza el contexto para asignar prioridad:
   - "urgente", "urgente", "inmediato", "ya" → urgent
   - "importante", "prioritario", "alto" → high
   - "baja", "sin prisa" → low
   - Sin indicación → medium (default)
4. **Generar descripción**: Crea una descripción breve y clara si no está explícita
5. **Normalizar fechas**: Convierte todas las fechas al formato YYYY-MM-DD

## REGLAS DE FECHAS:

- "hoy" → ${añoActual}-${String(mesActual + 1).padStart(2, '0')}-${String(diaActual).padStart(2, '0')}
- "mañana" → fecha actual + 1 día
- "pasado mañana" → fecha actual + 2 días
- "próximo lunes/martes/etc" → próximo día de la semana mencionado
- "en X días" → fecha actual + X días
- Fechas específicas: mantener formato YYYY-MM-DD

## REGLAS DE PRIORIDAD:

- Palabras clave "urgente", "inmediato", "ya", "ahora" → urgent
- Palabras clave "importante", "prioritario", "alto", "crítico" → high
- Palabras clave "baja", "sin prisa", "cuando puedas" → low
- Sin palabras clave o contexto neutral → medium

## FORMATO DE RESPUESTA:

Debes devolver SOLO un objeto JSON con la siguiente estructura:
{
  "activities": [
    {
      "title": "Título de la actividad (máximo 500 caracteres)",
      "description": "Descripción breve y clara (opcional pero recomendado)",
      "due_date": "YYYY-MM-DD",
      "priority": "low|medium|high|urgent"
    }
  ]
}

## IMPORTANTE:

- Si una actividad no tiene fecha explícita, intenta inferirla del contexto
- Si no puedes determinar una fecha, usa la fecha actual como fallback
- Títulos deben ser concisos pero descriptivos
- Descripciones deben ser opcionales pero útiles cuando el título es ambiguo
- Prioridad debe ser siempre una de las 4 opciones válidas
- Fechas deben estar siempre en formato YYYY-MM-DD`;

// User message con el texto a procesar
const userMessage = `Procesa el siguiente texto y extrae todas las actividades con sus fechas y prioridades:

${textInput}

Recuerda:
- Extraer TODAS las actividades mencionadas
- Identificar fechas explícitas o relativas
- Asignar prioridad según el contexto
- Generar descripciones cuando sean útiles
- Formato de fecha: YYYY-MM-DD`;

// Construir el body completo del request
const requestBody = {
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 2000,
  temperature: 0.1,
  system: systemPrompt,
  messages: [
    {
      role: "user",
      content: userMessage
    }
  ],
  output_format: {
    type: "json_schema",
    schema: {
      type: "object",
      properties: {
        activities: {
          type: "array",
          description: "Array de actividades extraídas del texto",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Título de la actividad (máximo 500 caracteres)"
              },
              description: {
                type: "string",
                description: "Descripción breve y clara de la actividad"
              },
              due_date: {
                type: "string",
                pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                description: "Fecha de compromiso en formato YYYY-MM-DD"
              },
              priority: {
                type: "string",
                enum: ["low", "medium", "high", "urgent"],
                description: "Prioridad de la actividad"
              }
            },
            required: ["title", "due_date"],
            additionalProperties: false
          }
        }
      },
      required: ["activities"],
      additionalProperties: false
    }
  }
};

// Retornar el body sanitizado y listo para enviar
return {
  json: {
    requestBody: requestBody,
    metadata: {
      textInput: textInput.substring(0, 100) + (textInput.length > 100 ? "..." : ""),
      fechaActual: `${añoActual}-${String(mesActual + 1).padStart(2, '0')}-${String(diaActual).padStart(2, '0')}`
    }
  }
};
```

---

## 📝 Notas de Implementación

1. **Sanitización**: El código sanitiza el texto de entrada para prevenir errores de JSON
2. **Fechas relativas**: El prompt incluye la fecha actual para ayudar al LLM a calcular fechas relativas
3. **Validación**: El schema JSON valida que las fechas estén en formato correcto y las prioridades sean válidas
4. **Manejo de errores**: Si no hay texto, devuelve un array vacío con un mensaje de error

---

## 🔗 Endpoint

**URL**: `https://primary-dev-d75a.up.railway.app/webhook/timeline`  
**Método**: `POST`  
**Content-Type**: `application/json`

---

## ✅ Validación de Respuesta

### ⚠️ IMPORTANTE: Procesamiento en N8N

El webhook de N8N debe **procesar la respuesta de Anthropic** y devolver solo el JSON parseado. 

**NO devolver la respuesta cruda de Anthropic.** El frontend espera recibir:

```json
{
  "activities": [
    {
      "title": "Revisar presupuesto",
      "description": "Revisar presupuesto",
      "due_date": "2026-01-15",
      "priority": "medium"
    }
  ]
}
```

O alternativamente (fallback):
```json
[
  {
    "title": "Revisar presupuesto",
    "description": "Revisar presupuesto",
    "due_date": "2026-01-15",
    "priority": "medium"
  }
]
```

### 🔧 Código para Procesar Respuesta de Anthropic en N8N

Después de recibir la respuesta de Anthropic, agrega un nodo de código que procese la respuesta:

```javascript
// Extraer respuesta de Anthropic
const anthropicResponse = $input.first().json;

// Verificar si es array con estructura Anthropic
if (Array.isArray(anthropicResponse) && anthropicResponse.length > 0) {
  const message = anthropicResponse[0];
  
  // Buscar contenido de texto
  const textContent = message.content?.find(c => c.type === 'text')?.text;
  
  if (textContent) {
    try {
      // Parsear JSON del texto
      const parsed = JSON.parse(textContent);
      
      // Devolver solo el objeto con activities
      return {
        json: parsed  // { activities: [...] }
      };
    } catch (error) {
      return {
        json: {
          error: "Error al parsear respuesta",
          activities: []
        }
      };
    }
  }
}

// Si no es formato Anthropic, devolver tal cual
return {
  json: anthropicResponse
};
```

