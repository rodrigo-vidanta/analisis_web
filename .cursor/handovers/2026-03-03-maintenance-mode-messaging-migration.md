# Handover: Modo Mantenimiento - Migración Infraestructura Mensajería

**Fecha:** 2026-03-03
**Tipo:** Mantenimiento planificado
**Estado:** ACTIVO - Plataforma en modo mantenimiento

---

## Contexto

Meta bloqueó el número de WhatsApp de la plataforma por un problema con el método de pago. Esto causó:
- Imposibilidad de enviar plantillas WhatsApp
- Problemas en campañas publicitarias
- Necesidad de migrar a Twilio con un nuevo número

## Qué se hizo

### Activación del modo mantenimiento

**Archivos modificados:**
- `src/App.tsx` — `MAINTENANCE_MODE = true`, import de MaintenancePage activo, bloque if activo
- `src/components/MaintenancePage.tsx` — Mensajes actualizados para migración mensajería

### Mensaje al usuario

- **Título:** "Mejorando tu experiencia"
- **Subtítulo:** "Volveremos en breve con novedades"
- **Status badge:** "Actualización en progreso" (sin puntos suspensivos animados)
- **Mensaje principal:** "Estamos mejorando nuestra infraestructura de mensajería para brindarte una experiencia más estable y rápida."
- **Intro tips:** "Mientras tanto, aquí tienes algunos tips para maximizar tus ventas:"
- **25 tips de ventas** rotando cada 10s con animación blur/fade (efecto humo)
- **Footer:** "Te notificaremos cuando la plataforma esté lista."

### Sin HealthCheckGuard

A diferencia del incidente Supabase (2026-02-12), esta vez NO se usa HealthCheckGuard. La reactivación es **manual** — cambiar `MAINTENANCE_MODE = false` y hacer deploy.

## Cómo desactivar

1. En `src/App.tsx`:
   - Cambiar `const MAINTENANCE_MODE = true;` → `const MAINTENANCE_MODE = false;`
   - O comentar todo el bloque como estaba antes
2. Deploy a producción

## Componentes involucrados

| Componente | Ruta | Función |
|------------|------|---------|
| MaintenancePage | `src/components/MaintenancePage.tsx` | Página fullscreen z-99999, dark mode forzado, tips rotatorios |
| HealthCheckGuard | `src/components/HealthCheckGuard.tsx` | Auto-detección outage Supabase (NO usado esta vez) |
| App.tsx | `src/App.tsx` | Flag MAINTENANCE_MODE + condicional |

## Deshabilitaciones previas (aún activas)

Además del modo mantenimiento completo, estas funciones siguen deshabilitadas con `{false && ...}`:
1. **LiveChatModule.tsx:187** — Botón importación manual
2. **LiveChatCanvas.tsx:9146** — Botón reactivar con plantilla
3. **LiveChatCanvas.tsx:9218** — Mensaje "Envío de plantillas temporalmente suspendido"

Ver handover: `2026-03-02-temp-disable-plantillas-meta-payment-v2.md`

## Skill disponible

Usar `/maintenance` para activar/desactivar modo mantenimiento en el futuro.
