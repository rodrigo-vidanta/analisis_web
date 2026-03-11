# Handover: Diagnóstico Ticket Bot Pause + Rich Comments en Tickets

**Fecha:** 2026-03-10
**Sesión:** Diagnóstico TKT-20260310-0260 + mejora UI tickets

---

## Resumen

Se investigó un ticket de soporte donde un ejecutivo reportó que la IA estaba pausada pero envió un mensaje de todos modos. Tras investigación con el ingeniero de backend, se determinó que NO era un bug — la pausa corta expiró 2 segundos antes de que el mensaje del prospecto entrara. Adicionalmente, se agregó soporte de formato enriquecido (Markdown) a los comentarios y descripciones de tickets.

---

## Parte 1: Diagnóstico del Ticket TKT-20260310-0260

### Problema reportado
- Ejecutivo Rodrigo Meza reportó: "la IA estaba pausada y mandó mensaje"
- Prospecto: Alberto Onofre (8db2a811-6c9d-4367-b72b-5d3dd99cc15d), proveedor Twilio
- El sidebar mostraba ícono de pausa (⏸) pero la IA respondió

### Causa raíz (confirmada con ingeniero backend)
**No fue un bug.** Timeline real:
1. 21:25:06 UTC — Se creó registro en `bot_pause_status` (pausa corta)
2. 21:25:23 UTC — La pausa expiró (`paused_until: 21:25:23`)
3. 21:25:25 UTC — Entró ejecución N8N 2134077. `bot_pausado = false` (expiró 2s antes) → IA respondió
4. 21:26:42 UTC — El agente re-pausó por 30 días (indefinido, hasta 2026-04-09)

### Arquitectura de pausa (aprendida)
- La pausa vive en tabla dedicada `bot_pause_status`, NO en `prospectos`
- La vista `v_prospectos_ai_config` la computa en tiempo real: `CASE WHEN bp.paused_until > now() THEN true ELSE false END AS bot_pausado`
- La decisión `ai_debe_responder` es cascada: pausa → config etapa/override → agente asignado
- `paused_by = 'agent'` = la propia IA se pausó (no un humano)
- N8N workflow `QmpXVdF5LYWHIEAj` ([twilio-uchat] Message flow PQNC v4 [PROD]) SÍ checa pausa vía `v_prospectos_ai_config`

### Workflow N8N analizado (103 nodos)
- **Entrada dual:** `Webhook Uchat` (uChat) + `Twilio msg` (Execute Workflow Trigger)
- **Normalizer Dual:** Unifica formato de ambos proveedores
- **Proveedor2 switch:** Rutea por `whatsapp_provider`
- **any_ai_auto:** Checa `ai_debe_responder` (que ya incluye chequeo de pausa vía vista)
- **Proveedor1 switch:** Post rate-limit fail → uChat pausa bot 1h vía API, Twilio → Fin2
- **Subworkflow envío:** `luy2mQVAT46SAWZr` ([twilio] Enviar Respuesta WhatsApp)

### Acciones en el ticket
- Asignado a Samuel Rosales (admin)
- Status: en_progreso
- 3 comentarios actualizados con formato Markdown

---

## Parte 2: Rich Comments en Tickets de Soporte

### Problema
Los comentarios de tickets se renderizaban como texto plano — sin saltos de línea, negritas, ni listas.

### Solución
Se agregó `ReactMarkdown` (ya instalado en el proyecto) a los 4 puntos de renderizado de texto en tickets.

### Archivos modificados

**src/components/support/AdminTicketsPanel.tsx:**
- Agregado `import ReactMarkdown from 'react-markdown'`
- Descripción del ticket (línea ~608): `<p>` → `<ReactMarkdown>` con componentes custom
- Comentarios (línea ~726): `<p>` → `<ReactMarkdown>` con componentes custom

**src/components/support/MyTicketsModal.tsx:**
- Agregado `import ReactMarkdown from 'react-markdown'`
- Descripción del ticket (línea ~372): `<p>` → `<ReactMarkdown>` con componentes custom
- Comentarios (línea ~408): `<p>` → `<ReactMarkdown>` con componentes custom

### Patrón usado (consistente con ProspectDetailSidebar.tsx)
```tsx
<div className="prose prose-sm dark:prose-invert max-w-none text-sm ...">
  <ReactMarkdown
    components={{
      p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
      strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
      li: ({ children }) => <li className="text-sm">{children}</li>,
      br: () => <br />,
    }}
  >
    {content.replace(/\\n/g, '\n').replace(/\n/g, '  \n')}
  </ReactMarkdown>
</div>
```

### Detalle técnico: Hard breaks
Markdown estándar ignora saltos de línea simples. Se agregó `.replace(/\n/g, '  \n')` para forzar hard breaks (2 espacios + newline) sin necesidad de instalar `remark-breaks`.

### Formato soportado
- Saltos de línea simples
- **Negritas** (`**texto**`)
- *Cursivas* (`*texto*`)
- Listas con viñetas (`-`) y numeradas (`1.`)
- Clase `prose dark:prose-invert` de Tailwind

---

## Datos de BD actualizados
- 3 comentarios del ticket reformateados con Markdown (IDs: a1cf731a, 974e5b22, 212877c0)

## Dependencias
- `react-markdown` ^10.1.0 (ya existente en el proyecto)
- No se agregaron nuevas dependencias
