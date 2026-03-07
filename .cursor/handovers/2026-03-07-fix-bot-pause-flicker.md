# Handover: Fix Bot Pause Flicker + ConversacionesWidget Dual Support

**Fecha:** 2026-03-07
**Estado:** Verificado manualmente, listo para deploy
**Branch:** main (cambios sin commit)

---

## Bug 1: Pausa indefinida desaparece después de ~1 segundo (flicker)

**Síntoma:** Usuario pausa bot indefinidamente (30 días), la UI muestra la pausa por ~1 segundo y luego vuelve a idle. Sin errores en consola. Save en BD correcto.

**Causa raíz:** Callback de Realtime en `bot_pause_status` hacía REEMPLAZO TOTAL del estado. `getAllActivePauses()` tiene `catch(() => [])` silencioso — error transitorio retorna `[]` y el reemplazo borra todas las pausas locales.

**Fix (2 capas):**
1. **Cooldown 3s** (`pauseSaveCooldownRef`) — Después de save/resume, Realtime callback se ignora 3s
2. **No reemplazar con vacío** — Si query retorna `[]` pero hay pausas locales, preservar estado local

## Bug 2: ConversacionesWidget pauseBot/resumeBot no soportaba Twilio

**Causa:** Solo validaba formato uchat (`isValidUchatId`). UUID de Twilio fallaba silenciosamente.

**Fix:** Patrón dual UUID vs uchat format → rutea al método de servicio correspondiente.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/chat/LiveChatCanvas.tsx` | Cooldown ref + protección Realtime vacío + activación en pauseBot/resumeBot |
| `src/components/dashboard/widgets/ConversacionesWidget.tsx` | Dual pauseBot/resumeBot + cooldown + protección Realtime vacío |

## Verificación

- [x] `tsc --noEmit` sin errores
- [x] `npm run build` exitoso (18.63s)
- [x] Pruebas manuales: pausa/quitar funciona en BD, bot responde cuando no está pausado
