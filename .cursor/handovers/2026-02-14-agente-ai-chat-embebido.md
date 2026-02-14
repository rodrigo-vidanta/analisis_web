# Handover: Agente AI Chat Embebido en Plataforma

> **Fecha:** 2026-02-14 | **Estado:** Planificacion completa, listo para implementar
> **Prioridad:** Alta | **Complejidad:** Alta (multi-capa)

## Resumen Ejecutivo

Se diseño la arquitectura completa para un **agente AI conversacional embebido** en la plataforma. Un boton flotante en la esquina que abre un chat donde los usuarios pueden interactuar en lenguaje natural con sus datos: consultar prospectos, ver estadisticas, y ejecutar acciones masivas como enviar seguimientos por WhatsApp.

## Decision Arquitectural

### Opcion elegida: Anthropic API + Tool Use via Edge Function

Se descartaron:
- **Claude Agent SDK**: Requiere Node.js completo, infra adicional (Railway/Lambda). Overkill para consultas BD + acciones.
- **API directa sin tools**: No escala, requiere enviar todos los datos en el prompt.

### Por que esta opcion:
- **Sin infra nueva** — usa Edge Functions existentes de Supabase
- **Seguridad nativa** — JWT del usuario + RLS filtra datos automaticamente
- **Costo bajo** — Sonnet 4.5 ~$0.001/pregunta con prompt caching
- **Streaming** — Edge Functions soportan SSE

## Arquitectura Completa

```
┌──────────────────────────────────────────┐
│  Frontend (React)                        │
│  FloatingAgentWidget                     │
│  - Bubble button (z-[55])                │
│  - Chat panel con mensajes               │
│  - agentStore (Zustand)                  │
│  - Streaming SSE display                 │
└──────────────┬───────────────────────────┘
               │ SSE + JWT
               ▼
┌──────────────────────────────────────────┐
│  Edge Function: ai-agent                 │
│  1. Valida JWT → extrae user_id          │
│  2. Carga tools de BD segun rol          │
│  3. Carga prompts/reglas de BD           │
│  4. Llama Anthropic API + tools          │
│  5. Ejecuta tool calls con JWT usuario   │
│  6. Stream respuesta via SSE             │
└──────────────┬───────────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
 Supabase   Supabase   N8N Webhook
 (queries)  (actions)  (bulk actions)
```

## Modelo de Datos (3 tablas nuevas)

### Tabla: `agent_tools`
Almacena los tools que Claude puede usar, configurables por rol sin deploy.

```sql
CREATE TABLE agent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- "consultar_sin_respuesta"
  description TEXT NOT NULL,           -- Lo que Claude ve para decidir si usarlo
  parameters JSONB NOT NULL DEFAULT '{}', -- JSON Schema de parametros
  type TEXT NOT NULL CHECK (type IN ('query', 'action', 'bulk_action')),
  sql_template TEXT,                   -- Template SQL para type=query (usa $user_id, $params)
  n8n_webhook TEXT,                    -- URL webhook N8N para type=bulk_action
  roles TEXT[] NOT NULL,               -- Roles que pueden usar este tool
  requires_confirm BOOLEAN DEFAULT false, -- Pedir confirmacion antes de ejecutar
  max_results INT DEFAULT 50,          -- Limite de resultados para queries
  rate_limit_daily INT DEFAULT 100,    -- Limite diario por usuario
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: solo admin puede escribir, authenticated puede leer
```

### Tabla: `agent_prompts`
Reglas de negocio, system prompts, y templates de mensajes por rol.

```sql
CREATE TABLE agent_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,                  -- "ejecutivo", "coordinador", "admin", "*"
  type TEXT NOT NULL CHECK (type IN ('system', 'rule', 'template', 'guardrail')),
  name TEXT NOT NULL,                  -- "prompt_principal", "regla_seguimiento", etc.
  content TEXT NOT NULL,               -- El prompt/regla en lenguaje natural
  priority INT DEFAULT 0,             -- Orden de ensamblaje (menor = primero)
  variables JSONB DEFAULT '{}',       -- Variables disponibles: {nombre}, {rol}, etc.
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla: `agent_audit_log`
Registro de todas las acciones del agente (seguridad + analytics).

```sql
CREATE TABLE agent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tool_name TEXT NOT NULL,
  tool_type TEXT NOT NULL,
  parameters JSONB,
  result_summary TEXT,
  tokens_used INT,
  model TEXT,
  confirmed BOOLEAN DEFAULT false,     -- Si el usuario confirmo la accion
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: usuarios solo ven su propio log, admin ve todo
```

## Tools Iniciales por Rol

### Ejecutivo/Supervisor
| Tool | Tipo | Descripcion |
|------|------|-------------|
| `consultar_mis_prospectos` | query | Listar prospectos con filtros (etapa, destino, fecha) |
| `detalle_prospecto` | query | Info completa de un prospecto especifico |
| `sin_respuesta` | query | Prospectos sin respuesta en N dias |
| `mis_estadisticas` | query | Resumen: totales, por etapa, conversion, tendencias |
| `tendencia_mensual` | query | Comparativa mes actual vs anterior |
| `cumpleanos_periodo` | query | Prospectos que cumplen anos en rango |
| `enviar_seguimiento` | action | Enviar mensaje individual via UChat |
| `enviar_seguimiento_masivo` | bulk_action | Seguimiento masivo via N8N + UChat |
| `enviar_info_destino` | action | Enviar info de destino especifico |
| `felicitar_masivo` | bulk_action | Felicitaciones cumpleanos via N8N |

### Coordinador (todo de ejecutivo +)
| Tool | Tipo | Descripcion |
|------|------|-------------|
| `prospectos_coordinacion` | query | Todos los prospectos de la coordinacion |
| `comparar_ejecutivos` | query | Metricas comparativas de ejecutivos |
| `ejecutivos_sin_actividad` | query | Ejecutivos que no han contactado prospectos |
| `reasignar_prospecto` | action | Mover prospecto a otro ejecutivo |

### Admin (todo +)
| Tool | Tipo | Descripcion |
|------|------|-------------|
| `estadisticas_globales` | query | Metricas de toda la plataforma |
| `gestionar_tools` | action | CRUD de tools desde el chat |
| `gestionar_prompts` | action | CRUD de prompts/reglas desde el chat |

## Prompts y Reglas de Negocio (agent_prompts)

### System Prompt (priority: 0)
```
Eres el asistente personal de {nombre}, {rol} en Vida Vacations.
- Solo puedes acceder a datos que {nombre} tiene permiso de ver.
- Nunca inventar datos. Si no tienes info, dilo.
- Para acciones masivas, SIEMPRE mostrar lista y pedir confirmacion.
- Responde en espanol, tono profesional pero cercano.
- Si te piden algo fuera de tu alcance, explica que solo manejas
  prospectos, seguimientos y estadisticas.
```

### Reglas de Seguimiento (priority: 1)
```
Para mensajes de seguimiento WhatsApp:
- 3-5 dias sin respuesta → tono amigable, recordatorio suave
- 5-10 dias → ofrecer valor adicional (info del destino)
- 10+ dias → ultimo intento, dar opcion de no ser contactado
- NUNCA presionar. NUNCA enviar fuera de 9am-7pm CST.
- Maximo 20 mensajes por accion masiva.
- No enviar a etapas: "Activo PQNC", "No interesado", "Vendido".
```

### Templates de Mensaje (priority: 2)
```
Seguimiento 3-5 dias:
"Hola {prospecto_nombre}, soy {ejecutivo} de Vida Vacations.
Vi que te interesa {destino}. Te gustaria que te comparta
mas informacion sobre nuestros paquetes? 🏖️"

Seguimiento 5-10 dias:
"Hola {prospecto_nombre}, te comparto que tenemos promociones
especiales para {destino} este mes. Si te interesa, con gusto
te doy los detalles. Saludos, {ejecutivo}."
```

## Seguridad (3 capas)

| Capa | Mecanismo | Que protege |
|------|-----------|-------------|
| **1. RLS** | Postgres Row Level Security | Datos: usuario solo ve sus prospectos |
| **2. Tools por rol** | `agent_tools.roles` filtrado en Edge Function | Acciones: solo tools autorizados |
| **3. Confirmacion** | `requires_confirm` + UI confirm | Destructivas: no ejecuta sin "si" |
| **4. Rate limiting** | `rate_limit_daily` + audit_log | Abuso: limite diario por usuario |
| **5. Guardrails** | `agent_prompts` type=guardrail | Prompt: reglas que Claude sigue |
| **6. Audit** | `agent_audit_log` | Trazabilidad: todo queda registrado |

## Edge Function: `ai-agent`

### Dependencias
- `@anthropic-ai/sdk` (Anthropic oficial para Deno)
- Supabase client con JWT del usuario
- Streaming SSE

### Flujo interno
```
1. Recibir POST { message, conversation_id? }
2. Validar JWT → extraer user_id, rol
3. SELECT * FROM agent_prompts WHERE role IN (user_rol, '*') AND active
4. SELECT * FROM agent_tools WHERE user_rol = ANY(roles) AND active
5. Armar system prompt con variables ({nombre}, {rol}, {coordinacion})
6. Convertir agent_tools → formato Claude tools []
7. Llamar Anthropic API con streaming
8. Si Claude pide tool_use:
   a. Validar tool existe y rol tiene acceso
   b. Si type=query → ejecutar sql_template con JWT usuario
   c. Si type=action → verificar confirm → ejecutar
   d. Si type=bulk_action → verificar confirm → POST a n8n_webhook
   e. Registrar en agent_audit_log
   f. Enviar resultado a Claude → continuar streaming
9. Stream respuesta final al frontend via SSE
```

## Componente Frontend

### Archivos a crear
```
src/
  components/
    agent/
      FloatingAgentWidget.tsx    -- Bubble + panel principal
      AgentChatPanel.tsx         -- Lista de mensajes + input
      AgentMessage.tsx           -- Burbuja de mensaje (user/agent)
      AgentConfirmAction.tsx     -- UI de confirmacion para acciones
      AgentToolResult.tsx        -- Visualizacion de resultados (tablas, listas)
  stores/
    agentStore.ts               -- Estado: mensajes, loading, conversacion
  services/
    agentService.ts             -- Conexion SSE con Edge Function
```

### agentStore (Zustand)
```typescript
interface AgentStore {
  isOpen: boolean
  messages: AgentMessage[]
  isLoading: boolean
  conversationId: string | null
  pendingConfirm: PendingAction | null

  toggleChat: () => void
  sendMessage: (text: string) => Promise<void>
  confirmAction: (confirmed: boolean) => Promise<void>
  clearConversation: () => void
}
```

### Widget specs
- Boton flotante: esquina inferior derecha, `z-[55]` (debajo de comunicados z-[60])
- Panel: ~400x600px, animacion slide-up con Framer Motion
- Dark mode obligatorio (Tailwind)
- Responsive: en mobile ocupa pantalla completa
- Icono: sparkles o robot, con badge de "AI"

## Plan de Implementacion (orden sugerido)

### Fase 1: Fundacion (BD + Edge Function basica)
1. Crear tablas: `agent_tools`, `agent_prompts`, `agent_audit_log` con RLS
2. Seed: insertar tools iniciales (queries) y prompts por rol
3. Edge Function `ai-agent` con queries basicas (sin acciones)
4. Probar: llamar edge function con JWT real → verificar respuestas

### Fase 2: Frontend (Componente React)
5. `agentStore` + `agentService` (conexion SSE)
6. `FloatingAgentWidget` + `AgentChatPanel` + `AgentMessage`
7. Integrar en `MainApp.tsx`
8. Probar: chat funcional con queries en vivo

### Fase 3: Acciones (UChat + N8N)
9. Agregar tools tipo `action` y `bulk_action` en BD
10. `AgentConfirmAction` component (UI de confirmacion)
11. N8N Workflow: "Agent Seguimiento Masivo" (webhook → UChat)
12. Probar: enviar seguimiento individual → masivo

### Fase 4: Polish
13. Panel admin para gestionar tools y prompts desde la UI
14. Historial de conversaciones (opcional)
15. Analytics del agente (queries mas frecuentes, acciones, costos)

## Costos Estimados

| Concepto | Costo |
|----------|-------|
| Anthropic API (Sonnet 4.5) | ~$0.001-0.005/pregunta |
| Con prompt caching | 90% descuento en tokens repetidos |
| 100 preguntas/dia plataforma | ~$0.10-0.50/dia |
| Edge Function | Incluido en plan Pro Supabase |
| N8N webhooks | Incluido en Railway actual |

## Datos Reales de Referencia (Roberto Raya)

Usado como ejemplo durante el diseno:
- **Usuario:** Raya Salas Roberto Alejandro (supervisor)
- **ID:** `2f245ac5-75e4-4365-811a-21baaf50b429`
- **Email:** robertoraya@vidavacations.com
- **Prospectos:** 54 total
- **Por etapa:** Interesado(22), Importado manual(11), En seguimiento(8), Atendio llamada(5), Con ejecutivo(4), Activo PQNC(3), Validando membresia(1)
- **Destinos:** Riviera Maya(19), Acapulco(18), Nuevo Vallarta(6)
- **Requieren atencion:** 11 prospectos
- **Nuevos 7 dias:** 5 | **Nuevos 30 dias:** 23
- **Score:** No calculado aun (todos null)

## Notas Tecnicas

- **Anthropic SDK para Deno** existe: `npm:@anthropic-ai/sdk` funciona en Edge Functions
- **SSE en Edge Functions**: Supabase soporta streaming responses
- **API Key Anthropic**: Guardar como Supabase secret (`ANTHROPIC_API_KEY`)
- **Modelo recomendado**: `claude-sonnet-4-5-20250929` (balance costo/calidad)
- **Prompt caching**: Activar para system prompt + tools (ahorra 90% en tokens repetidos)
- **Conversacion multi-turn**: Guardar mensajes en `agentStore`, enviar historial completo en cada request

## Referencias

- Anthropic API Tool Use: https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Prompt Caching: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- Existing Edge Functions: ver `docs/EDGE_FUNCTIONS_CATALOG.md`
- UChat API: ver `.claude/agents/uchat-agent.md`
- N8N Workflows: ver `.claude/agents/n8n-agent.md`
