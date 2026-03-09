# Handover de Sesión: CTWA 72h Window + 40 Templates + Countdown

**Fecha:** 2026-03-08
**Deploy:** v2.27.0 (B10.2.0N2.27.0)
**Commit:** `6a3ebaa`

---

## Resumen Ejecutivo

Sesión completa que abarcó tres áreas: creación masiva de plantillas WhatsApp, soporte frontend para ventana CTWA de 72h con countdown en tiempo real, y documentación de backend para captura de referral source.

---

## 1. Plantillas WhatsApp — 40 Templates Cold Outreach

Se generaron 40 plantillas usando el skill `/factory-templates`, optimizadas psicológicamente y Meta-compliant. Todas MARKETING, 0 variables (contactos en frío), subidas via Edge Function/webhook.

| Grupo | Templates | Group ID | Script |
|-------|-----------|----------|--------|
| Gancho de Oportunidad | 10 | `44249a5e-a4e1-4355-9d74-48b3cece8254` | `scripts/create-gancho-oportunidad-templates.cjs` |
| Concierto: El Buki | 10 | `d7ddb4ee-9f4a-4a72-8e26-d0e9760e6084` | `scripts/create-conciertos-templates.cjs` |
| Concierto: Michael Bublé | 10 | `9b406cde-deb8-415e-9178-8561215c2318` | `scripts/create-conciertos-templates.cjs` |
| Viaje en Familia (nuevo) | 10 | `d3d6ddfa-fcba-484d-86a0-c6d3b68d4827` | `scripts/create-familia-templates.cjs` |

### Correcciones aplicadas por el usuario

- NUNCA decir "vista al mar" → "rodeado de naturaleza, arena y mar"
- TODAS deben mencionar "Vidanta" o "Vacation Planner **de Vidanta**"
- NUNCA implicar que somos desconocidos ni desacreditar el canal oficial
- Tono premium de lujo, no agresivo
- No mentir sobre información pública (conciertos son públicos)
- "Su familia" en vez de "sus hijos" (tema sensible)
- Mencionar productos concretos de Vidanta (parque acuático, kids club, etc.)
- En False Choice, no revelar que Vidanta tiene ambas opciones

### Templates también reemplazados

20 templates que estaban en estado PENDING >24h fueron eliminados y reemplazados con 19 nuevos optimizados. Script: `scripts/replace-pending-templates.cjs`. Handover detallado: `2026-03-08-replace-pending-templates-v2.md`.

---

## 2. CTWA 72h Window — Frontend

### Problema
WhatsApp Business API otorga **72 horas** de mensajería gratuita cuando un prospecto llega desde un anuncio Click-to-WhatsApp (CTWA), pero el frontend solo manejaba 24h fijas.

### Solución implementada

**Archivo:** `src/components/chat/LiveChatCanvas.tsx`

| Cambio | Ubicación | Descripción |
|--------|-----------|-------------|
| `referral_source` en Message | línea ~211 | Campo `'ctwa_ad' \| 'organic' \| null` |
| `getConversationWindowHours()` | línea ~7460 | Retorna 72 si primer mensaje tiene `referral_source='ctwa_ad'`, 24 si no |
| `isWithin24HourWindow()` | línea ~7490 | Usa ventana dinámica (24h o 72h) |
| `WindowCountdown` componente | línea ~1058 | Timer aislado, solo re-renderiza el `<span>` cada 60s |
| Integración date nav | línea ~8600 | Countdown en pills HOY y AYE |
| Banner ventana cerrada | línea ~9855 | Texto dinámico "(Ventana extendida CTWA)" |

### WindowCountdown — Decisión de arquitectura

El timer inicialmente vivía como `useState` en LiveChatCanvas, provocando re-render completo (~10,000 líneas) cada 60 segundos con parpadeo visible. Se extrajo a componente aislado `WindowCountdown` que recibe `lastMessageAt`, `windowHours` e `isCTWA` como props y maneja su propio `setInterval` internamente.

### Semáforo de colores

| Color | Condición | Clase Tailwind |
|-------|-----------|----------------|
| Verde | > 5 horas | `text-emerald-500` |
| Naranja | ≤ 5 horas | `text-amber-500` |
| Rojo | ≤ 1 hora o expirado | `text-red-500` |

Tamaño: `text-[11px]` (más grande que el contador de mensajes `text-[9px]`).

### Dependencia de backend (PENDIENTE)

El frontend está 100% listo. Falta que el backend escriba `referral_source = 'ctwa_ad'` en `mensajes_whatsapp`. Handover completo para el ingeniero: `2026-03-08-backend-ctwa-referral-source-capture.md`.

Resumen de lo que necesita el backend:
1. `ALTER TABLE mensajes_whatsapp ADD COLUMN referral_source VARCHAR(20) DEFAULT NULL`
2. En workflow N8N `QmpXVdF5LYWHIEAj`, detectar `ReferralCtwaClid` o `ReferralSourceType === 'ad'` del webhook Twilio
3. Guardar `referral_source = 'ctwa_ad'` o `'organic'` en el INSERT

---

## 3. Comunicado Publicado

| Campo | Valor |
|-------|-------|
| ID | `242ba8c9-e47e-4533-83fc-4a232ba8a7a4` |
| Título | Nuevo: Contador de Ventana de Mensajería |
| Subtítulo | Módulo WhatsApp |
| Tipo | feature |
| Icono | Clock |
| Audiencia | Todos |
| Estado | Activo |

Contenido: explica dónde aparece el contador, el semáforo de colores, y qué hacer cuando la ventana se cierra.

---

## Archivos Creados/Modificados

| Archivo | Acción | Propósito |
|---------|--------|-----------|
| `src/components/chat/LiveChatCanvas.tsx` | Modificado | CTWA detection + WindowCountdown + dynamic window |
| `scripts/create-gancho-oportunidad-templates.cjs` | Creado | Script batch 10 templates Gancho |
| `scripts/create-conciertos-templates.cjs` | Creado | Script batch 20 templates Buki+Bublé |
| `scripts/create-familia-templates.cjs` | Creado | Script batch 10 templates Familia |
| `scripts/replace-pending-templates.cjs` | Creado | Script reemplazo 20 templates pending |
| `.cursor/handovers/2026-03-08-backend-ctwa-referral-source-capture.md` | Creado | Handover backend referral_source |
| `.cursor/handovers/2026-03-08-ctwa-window-countdown-frontend.md` | Creado | Handover técnico frontend countdown |
| `.cursor/handovers/2026-03-08-replace-pending-templates-v2.md` | Creado | Handover reemplazo templates |

---

## Pendientes

| Tarea | Responsable | Prioridad |
|-------|-------------|-----------|
| Agregar columna `referral_source` a `mensajes_whatsapp` | Backend (N8N) | Alta |
| Modificar workflow N8N para capturar `ReferralCtwaClid` de Twilio | Backend (N8N) | Alta |
| Opcional: campo `referral_data` JSONB para analytics de campañas | Backend (N8N) | Media |
| Verificar que las 40 templates nuevas pasen aprobación Meta | Monitoreo | Media |
