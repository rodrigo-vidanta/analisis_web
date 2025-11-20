# 📋 Timeline Webhook N8N - Prompt Mejorado

## 🎯 Objetivo

Este documento describe el webhook de N8N mejorado para procesar listas de actividades escritas en texto libre, interpretando fechas relativas, prioridades conversacionales y asignaciones de manera inteligente.

---

## 📥 Payload de Entrada

```json
{
  "text": "Revisar presupuesto el 15 de noviembre, reunión con marketing mañana, presentación ejecutiva urgente el miércoles, asignar a Juan y María"
}
```

---

## 📤 Payload de Salida

```json
{
  "activities": [
    {
      "title": "Revisar presupuesto",
      "description": "Revisión del presupuesto",
      "due_date": "2025-11-15",
      "priority": "media",
      "asignado_a": []
    },
    {
      "title": "Reunión con marketing",
      "description": "Reunión con equipo de marketing",
      "due_date": "2025-01-21",
      "priority": "media",
      "asignado_a": []
    },
    {
      "title": "Presentación ejecutiva",
      "description": "Presentación para ejecutivos",
      "due_date": "2025-01-22",
      "priority": "critica",
      "asignado_a": []
    }
  ]
}
```

---

## 🎨 Valores de Prioridad

- `baja` - Prioridad baja
- `media` - Prioridad media (default)
- `alta` - Prioridad alta
- `critica` - Prioridad crítica/urgente

---

## 🤖 Prompt del Sistema Mejorado

```javascript
// Función para sanitizar strings y prevenir que rompan el JSON
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

// Extraer datos del input
const input = $input.first().json;
const textInput = sanitizeString(input.body?.text || input.text || "");

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
const mesActual = fechaActual.getMonth() + 1; // 1-12
const diaActual = fechaActual.getDate();
const diaSemanaActual = fechaActual.getDay(); // 0=Domingo, 1=Lunes, etc.

// Función para calcular próximo día de la semana
function calcularProximoDiaSemana(diaSemanaNombre) {
  const diasSemana = {
    'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3, 'miercoles': 3,
    'jueves': 4, 'viernes': 5, 'sábado': 6, 'sabado': 6
  };
  
  const diaObjetivo = diasSemana[diaSemanaNombre.toLowerCase()];
  if (diaObjetivo === undefined) return null;
  
  const diasHastaProximo = (diaObjetivo - diaSemanaActual + 7) % 7;
  const diasASumar = diasHastaProximo === 0 ? 7 : diasHastaProximo;
  
  const fechaProximo = new Date(fechaActual);
  fechaProximo.setDate(fechaActual.getDate() + diasASumar);
  
  return fechaProximo;
}

// System prompt mejorado
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
- Si no hay nombres mencionados, dejar array vacío: []

## FORMATO DE RESPUESTA (CRÍTICO):

Debes devolver ÚNICAMENTE un objeto JSON válido con esta estructura exacta, sin texto adicional antes o después. NO incluyas explicaciones, comentarios, ni texto fuera del JSON.

**ESTRUCTURA OBLIGATORIA:**
```json
{
  "activities": [
    {
      "title": "string (máximo 500 caracteres, conciso pero descriptivo)",
      "description": "string (opcional, puede ser null o string vacío)",
      "due_date": "YYYY-MM-DD (siempre en este formato, ejemplo: 2025-11-20)",
      "priority": "baja|media|alta|critica (SOLO estos 4 valores permitidos)",
      "asignado_a": ["array", "de", "nombres"] // Array de strings con nombres mencionados, [] si no hay asignaciones
    }
  ]
}
```

**REGLAS ESTRICTAS DEL JSON:**
- El JSON debe ser válido y parseable
- NO incluyas markdown, código, ni explicaciones
- NO uses triple backticks (```) ni bloques de código
- Empieza directamente con { y termina con }
- Todos los strings deben estar entre comillas dobles
- Los arrays vacíos deben ser []
- Las propiedades requeridas son: title, due_date, priority, asignado_a
- description es opcional pero recomendado

## EJEMPLOS DE INTERPRETACIÓN:

### Ejemplo 1: Fechas relativas y prioridades
Input: "Revisar presupuesto el 15 de noviembre, reunión con marketing mañana, presentación ejecutiva urgente el miércoles"

Output:
{
  "activities": [
    {
      "title": "Revisar presupuesto",
      "description": "Revisión del presupuesto",
      "due_date": "${añoActual}-11-15",
      "priority": "media",
      "asignado_a": []
    },
    {
      "title": "Reunión con marketing",
      "description": "Reunión con equipo de marketing",
      "due_date": "${new Date(fechaActual.getTime() + 24*60*60*1000).toISOString().split('T')[0]}",
      "priority": "media",
      "asignado_a": []
    },
    {
      "title": "Presentación ejecutiva",
      "description": "Presentación para ejecutivos",
      "due_date": "${calcularProximoDiaSemana('miércoles')?.toISOString().split('T')[0] || '2025-01-22'}",
      "priority": "critica",
      "asignado_a": []
    }
  ]
}

### Ejemplo 2: Prioridades conversacionales
Input: "Tarea urgente para hoy, algo importante para mañana, revisar documentos cuando puedas"

Output:
{
  "activities": [
    {
      "title": "Tarea urgente",
      "description": "Tarea urgente para hoy",
      "due_date": "${añoActual}-${String(mesActual).padStart(2, '0')}-${String(diaActual).padStart(2, '0')}",
      "priority": "critica",
      "asignado_a": []
    },
    {
      "title": "Algo importante",
      "description": "Algo importante para mañana",
      "due_date": "${new Date(fechaActual.getTime() + 24*60*60*1000).toISOString().split('T')[0]}",
      "priority": "alta",
      "asignado_a": []
    },
    {
      "title": "Revisar documentos",
      "description": "Revisión de documentos",
      "due_date": "${añoActual}-${String(mesActual).padStart(2, '0')}-${String(diaActual).padStart(2, '0')}",
      "priority": "baja",
      "asignado_a": []
    }
  ]
}

### Ejemplo 3: Asignaciones
Input: "Juan debe revisar el presupuesto mañana, asignar a María la presentación para el viernes"

Output:
{
  "activities": [
    {
      "title": "Revisar presupuesto",
      "description": "Revisión del presupuesto",
      "due_date": "${new Date(fechaActual.getTime() + 24*60*60*1000).toISOString().split('T')[0]}",
      "priority": "media",
      "asignado_a": ["Juan"]
    },
    {
      "title": "Presentación",
      "description": "Preparar presentación",
      "due_date": "${calcularProximoDiaSemana('viernes')?.toISOString().split('T')[0] || '2025-01-24'}",
      "priority": "media",
      "asignado_a": ["María"]
    }
  ]
}

## IMPORTANTE (LEER ANTES DE RESPONDER):

- **RESPUESTA DEBE SER SOLO JSON**: No incluyas texto antes o después del JSON. Empieza con { y termina con }
- **VALIDACIÓN DE FECHAS**: Si una actividad no tiene fecha explícita, intenta inferirla del contexto. Si no puedes determinar una fecha, usa la fecha actual como fallback (${añoActual}-${String(mesActual).padStart(2, '0')}-${String(diaActual).padStart(2, '0')})
- **AÑO POR DEFECTO**: Si una fecha viene sin año, SIEMPRE usar el año actual (${añoActual})
- **DÍA POR DEFECTO**: Si una fecha viene sin día específico pero con mes, usar el primer día del mes
- **TÍTULOS**: Deben ser concisos pero descriptivos (máximo 500 caracteres)
- **DESCRIPCIONES**: Opcionales pero útiles cuando el título es ambiguo. Puede ser string vacío ""
- **PRIORIDAD**: Debe ser SIEMPRE una de las 4 opciones válidas: "baja", "media", "alta", "critica" (en minúsculas, sin acentos)
- **FORMATO DE FECHAS**: Siempre YYYY-MM-DD (ejemplo: 2025-11-20, no 20/11/2025)
- **ASIGNADO_A**: Array de strings con nombres mencionados, o [] si no hay asignaciones. Ejemplo: ["Juan", "María"] o []
- **INTERPRETACIÓN**: Interpreta el lenguaje de manera conversacional y natural
- **FLEXIBILIDAD**: Sé flexible con variaciones de escritura (ej: "miércoles" vs "miercoles")

## EJEMPLO DE RESPUESTA CORRECTA:

Para el input: "revisar presupuesto 15 de enero 2026, pagarle a darig un aumento del 50% 15 dic 2025"

La respuesta debe ser EXACTAMENTE:
```json
{
  "activities": [
    {
      "title": "Revisar presupuesto",
      "description": "Revisión del presupuesto",
      "due_date": "2026-01-15",
      "priority": "media",
      "asignado_a": []
    },
    {
      "title": "Pagar aumento a Darig",
      "description": "Pagarle a Darig un aumento del 50%",
      "due_date": "2025-12-15",
      "priority": "media",
      "asignado_a": []
    }
  ]
}
```

**NO incluyas explicaciones, comentarios, ni texto fuera del JSON. Solo el objeto JSON puro.**`;

// User message
const userMessage = `Procesa el siguiente texto y extrae todas las actividades con sus fechas, prioridades y asignaciones. Interpreta el lenguaje de manera conversacional y natural:

${textInput}

Recuerda:
- Interpretar fechas relativas (hoy, mañana, el miércoles, etc.)
- Si una fecha viene sin año, usar el año actual (${añoActual})
- Si una fecha viene sin día específico pero con mes, usar el primer día del mes
- Interpretar prioridades de manera conversacional (urgente → critica, importante → alta, etc.)
- Extraer nombres de personas para asignaciones
- Responder ÚNICAMENTE con el JSON, sin texto adicional`;

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

// Retornar el body sanitizado y listo para enviar
return {
  json: {
    requestBody: requestBody
  }
};
```

---

## 📝 Notas Importantes

1. **Interpretación Conversacional**: El prompt está diseñado para interpretar lenguaje natural y conversacional, no solo comandos estructurados.

2. **Fechas Relativas**: El sistema calcula automáticamente fechas relativas basándose en la fecha actual del servidor.

3. **Prioridades**: Las prioridades se interpretan de manera conversacional, mapeando términos comunes a los valores de la base de datos.

4. **Asignaciones**: El sistema extrae nombres de personas mencionados en el texto, aunque la asignación real se maneja en el frontend mediante IDs de usuario.

5. **Validación**: El JSON schema asegura que la respuesta siempre tenga el formato correcto.

---

## 🔄 Flujo Completo

1. Usuario escribe texto libre en el modal
2. Frontend envía texto al webhook N8N
3. N8N procesa con LLM usando el prompt mejorado
4. LLM devuelve JSON estructurado
5. Frontend recibe y muestra previsualización
6. Usuario confirma y se guardan las actividades

---

## ✅ Checklist de Implementación

- [x] Prompt mejorado con interpretación conversacional
- [x] Manejo de fechas relativas y parciales
- [x] Mapeo de prioridades conversacionales
- [x] Extracción de asignaciones
- [x] JSON schema con validación
- [x] Ejemplos de uso

