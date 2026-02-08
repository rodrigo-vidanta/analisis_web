# HANDOVER-2026-02-08-HORARIOS-REALTIME-LLAMADAS

**Fecha**: 2026-02-08 | **Versión**: v2.5.93+ | **Build**: tsc ok

## Contexto
1. Modal de llamada permitía ejecutar llamadas fuera de horario (botón submit no bloqueado). Horarios hardcodeados a 6am-12am ignorando `config_horarios_base`.
2. Estado de llamadas en chat no se actualizaba en realtime (requería refresh manual para ver "programada" → "transferida").
3. Limpieza masiva de prospectos sin título: 1,040 registros actualizados por inferencia de nombre.

## Delta

| Bloque | Descripción |
|--------|-------------|
| 1 | `isWithinMaxServiceHours` ahora usa datos dinámicos de `config_horarios_base` + `config_horarios_excepciones` + `config_horarios_bloqueos` |
| 2 | Botón "Iniciar Llamada" desactivado + validación en `handleSubmit` cuando `scheduleType === 'now' && nowCallBlocked.blocked` |
| 3 | Mensaje de horario en UI ahora es dinámico (muestra horas reales del día, no "6am-12am") |
| 4 | Suscripción Realtime a `llamadas_programadas` (UPDATE) en LiveChatCanvas - actualiza card de llamada en tiempo real |
| 5 | BD: 1,040 prospectos actualizados con `titulo` inferido por nombre (primer nombre, segundo nombre, nombre_whatsapp) |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/services/horariosService.ts` | `isWithinMaxServiceHours()` acepta `horariosBase?`, `excepciones?`, `bloqueos?`. Prioridad: excepciones → bloqueos → horario base → fallback 6am-12am. Usa timezone `America/Mexico_City` |
| `src/components/shared/ManualCallModal.tsx` | Import `HorarioExcepcion`, `HorarioBloqueo`. States `excepciones`, `bloqueos`. `loadHorarios()` retorna `{base, exc, bloq}` y carga 3 tablas en paralelo. `handleSubmit` bloquea si `now && blocked`. Botón disabled con condición triple. Mensaje UI dinámico via `nowCallBlocked.reason` |
| `src/components/chat/LiveChatCanvas.tsx` | Nueva suscripción 4 en canal Realtime: `UPDATE` en `llamadas_programadas`. Handler async que fetch `llamadas_ventas` para detalles, construye `Message` con `call_data`, y actualiza `messagesByConversation` |

## Decisiones Técnicas

- **Horarios dinámicos sincronos**: `isWithinMaxServiceHours` se mantiene síncrono (recibe datos ya cargados) en vez de hacerlo async. Los datos se cargan en `loadHorarios()` y se pasan como parámetros. Alternativa descartada: hacer la función async requeriría cambiar toda la cadena de llamadas.
- **Suscripción en canal existente**: La suscripción de `llamadas_programadas` se agregó al canal Realtime existente (no un canal nuevo) para minimizar conexiones WebSocket. Patrón consistente con las suscripciones 1-3.
- **Inferencia de título conservadora**: Solo se usaron nombres inequívocamente masculinos/femeninos en español (~200 nombres). Nombres ambiguos como "Guadalupe" (unisex) quedaron sin título. Se verificó primer nombre, segundo nombre, y `nombre_whatsapp` en 3 rondas.

## Trampas y Gotchas

- `llamadas_programadas.prospecto` = prospecto_id (NO `prospecto_id` como en otras tablas)
- `prospectos.titulo` usa valores completos: `'Señor'`, `'Señorita'`, `'Señora'` (NO abreviaciones)
- `config_horarios_base` L-V: hora_inicio=10, hora_fin=19 | S-D: hora_inicio=9, hora_fin=18
- `config_horarios_excepciones.recurrente_anual` = true para feriados (comparar MM-DD, no fecha completa)
- `mexicoTime.toISOString()` puede dar fecha incorrecta si se construye con `toLocaleString` — verificar en edge cases de medianoche

## Pendiente

1. Verificar en producción que la suscripción Realtime de `llamadas_programadas` funciona correctamente con el flujo real de N8N (cambio de estatus después de llamada ejecutada)
2. Los ~1,295 prospectos restantes sin título tienen nombres no inferibles (emojis, iniciales, nombres poco comunes) — requieren revisión manual o modelo ML

## Estado

- Build: tsc ok
- Deploy: pendiente
- Archivos sin commit: `src/services/horariosService.ts`, `src/components/shared/ManualCallModal.tsx`, `src/components/chat/LiveChatCanvas.tsx` (+ cambios previos de homologación UI en branch `ui-homologation-2026-02-07`)
