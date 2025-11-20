function sanitizeString(str) {
  if (str === null || str === undefined) {
    return "";
  }
  
  return String(str)
    .replace(/"/g, '\\"')
    .replace(/\\/g, '\\\\')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const input = $input.first().json;
const textInput = sanitizeString(input.body?.text || input.text || "");

if (!textInput || textInput.length === 0) {
  return {
    json: {
      error: "No se proporcionó texto para procesar",
      activities: []
    }
  };
}

const fechaActual = new Date();
const añoActual = fechaActual.getFullYear();
const mesActual = fechaActual.getMonth() + 1;
const diaActual = fechaActual.getDate();

const systemPrompt = `Eres un asistente especializado en procesar listas de actividades y pendientes escritas en texto libre de manera conversacional y natural. Tu tarea es interpretar el lenguaje humano y extraer información estructurada.

## INSTRUCCIONES PRINCIPALES:

1. **Extraer actividades**: Identifica cada actividad, tarea o pendiente mencionado en el texto
2. **Interpretar fechas de manera conversacional**: 
   - Fechas relativas: "hoy", "mañana", "pasado mañana", "el miércoles", "próximo lunes"
   - Fechas parciales: "15 de noviembre" (sin año) → usar año actual
   - Fechas sin día: "noviembre" o "noviembre 2025" → usar primer día del mes o fecha aproximada
   - Fechas específicas: mantener formato YYYY-MM-DD
3. **Interpretar prioridades de manera conversacional**:
   - "urgente", "urgente", "inmediato", "ya", "ahora mismo", "crítico", "crítica" → critica
   - "importante", "prioritario", "alto", "alta prioridad", "muy importante" → alta
   - "baja", "sin prisa", "cuando puedas", "sin urgencia", "baja prioridad" → baja
   - Sin indicación o contexto neutral → media (default)
4. **Extraer asignaciones**: Identifica nombres de personas mencionadas para asignar tareas
5. **Generar descripción**: Crea una descripción breve y clara si no está explícita
6. **Normalizar fechas**: Convierte todas las fechas al formato YYYY-MM-DD

## REGLAS DE FECHAS (MUY IMPORTANTE):

### Fechas Relativas:
- "hoy" → ${añoActual}-${String(mesActual).padStart(2, '0')}-${String(diaActual).padStart(2, '0')}
- "mañana" → fecha actual + 1 día
- "pasado mañana" → fecha actual + 2 días
- "el miércoles", "el lunes", "el viernes" → próximo día de la semana mencionado
- "próximo lunes/martes/etc" → próximo día de la semana mencionado
- "en X días" → fecha actual + X días
- "la próxima semana" → fecha actual + 7 días

### Fechas Parciales:
- "15 de noviembre" (sin año) → ${añoActual}-11-15 (usar año actual)
- "noviembre 15" (sin año) → ${añoActual}-11-15
- "noviembre" (solo mes) → ${añoActual}-11-01 (primer día del mes)
- "noviembre 2025" (mes y año sin día) → 2025-11-01 (primer día del mes)
- "2025" (solo año) → ${añoActual}-12-31 (fin de año)

### Fechas Específicas:
- Mantener formato YYYY-MM-DD
- "15/11/2025" → 2025-11-15
- "15-11-2025" → 2025-11-15

## REGLAS DE PRIORIDAD (INTERPRETACIÓN CONVERSACIONAL):

### Prioridad Crítica (critica):
- Palabras clave: "urgente", "urgente", "inmediato", "ya", "ahora", "ahora mismo", "crítico", "crítica", "emergencia", "ASAP", "lo antes posible"
- Contexto: Cuando se enfatiza la urgencia extrema

### Prioridad Alta (alta):
- Palabras clave: "importante", "prioritario", "alto", "alta prioridad", "muy importante", "esencial", "fundamental"
- Contexto: Cuando se enfatiza la importancia pero no es urgente inmediato

### Prioridad Baja (baja):
- Palabras clave: "baja", "sin prisa", "cuando puedas", "sin urgencia", "baja prioridad", "tranquilo", "relajado"
- Contexto: Cuando se indica explícitamente que no hay prisa

### Prioridad Media (media) - DEFAULT:
- Sin palabras clave específicas
- Contexto neutral
- Cuando no hay indicación clara de prioridad

## REGLAS DE ASIGNACIÓN:

- Identifica nombres propios mencionados en el texto
- Si dice "asignar a X", "para X", "X debe hacer", "X se encarga", etc.
- Extrae nombres de personas mencionados
- Si no hay nombres mencionados, dejar array vacío: []`;

const userMessage = `Procesa el siguiente texto y extrae todas las actividades con sus fechas, prioridades y asignaciones. Interpreta el lenguaje de manera conversacional y natural:

${textInput}

Recuerda:
- Interpretar fechas relativas (hoy, mañana, el miércoles, etc.)
- Si una fecha viene sin año, usar el año actual (${añoActual})
- Si una fecha viene sin día específico pero con mes, usar el primer día del mes
- Interpretar prioridades de manera conversacional (urgente → critica, importante → alta, etc.)
- Extraer nombres de personas para asignaciones`;

const requestBody = {
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 4000,
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
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Título de la actividad (máximo 500 caracteres)"
              },
              description: {
                type: "string",
                description: "Descripción breve y clara (opcional)"
              },
              due_date: {
                type: "string",
                pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                description: "Fecha en formato YYYY-MM-DD"
              },
              priority: {
                type: "string",
                enum: ["baja", "media", "alta", "critica"],
                description: "Prioridad de la actividad"
              },
              asignado_a: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Array de nombres de personas asignadas a la actividad"
              }
            },
            required: ["title", "due_date", "priority", "asignado_a"],
            additionalProperties: false
          }
        }
      },
      required: ["activities"],
      additionalProperties: false
    }
  }
};

return {
  json: {
    requestBody: requestBody
  }
};

