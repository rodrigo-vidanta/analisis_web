# Handover: Reemplazo de 20 Plantillas PENDING (+24h) con Versiones Optimizadas

**Fecha:** 8 Marzo 2026
**Tipo:** Operacion (Templates WhatsApp)
**Estado:** Completado

## Contexto

Se detectaron 40 plantillas WhatsApp en estado PENDING. De ellas, 20 llevaban mas de 24 horas sin ser aprobadas por Meta/Twilio. Se solicito refrasearlas usando las reglas del skill `/factory-templates` y reenviarlas a traves del edge function pipeline.

## Plantillas Eliminadas (20)

### Grupo "Pendientes" (4) - Eliminadas via webhook N8N
Estas existian en Twilio y se eliminaron correctamente:
| Template | Dias Pendiente | Problema Principal |
|----------|---------------|-------------------|
| `agendar_llamada` | 54 dias | Nombre hardcodeado "Srita. Rosalba", "asesor vacacional", no pregunta final |
| `michael_buble_en_vidanta_v2` | 37 dias | Tuteo ("has/tu/ti"), 370 chars, venta directa sin pregunta |
| `prospecto_puente__marzo` | 19 dias | Variables al inicio, tuteo, fecha pasada (14-16 marzo) |
| `test_delete_prueba` | 8 dias | Template de prueba vacio |

### Grupos Varios (16) - Eliminadas via soft-delete BD (fallback)
Creadas el 6 de marzo (~27h pending). El webhook fallo con "resource not found" porque nunca fueron aprobadas por Meta (no existian en Twilio). Se aplico el mismo fallback que usa el frontend (`is_deleted: true, is_active: false`):
- `post_contacto_breve`, `post_contacto_seguimiento`, `post_contacto_pregunta_abierta`
- `retomar_sin_presion`, `retomar_propuesta_nueva`
- `buki_experiencia_exclusiva`, `buble_experiencia_exclusiva`
- `conciertos_2026_breve`, `conciertos_2026_temporada`
- `oportunidad_exclusiva`, `oportunidad_microcompromiso`
- `reserva_pendiente_breve`, `reserva_vencimiento`
- `llamada_pendiente_breve`, `llamada_empatia`
- `escapada_en_pareja`

## Plantillas Creadas (19) - Via webhook N8N (edge function pipeline)

Todas creadas exitosamente con status PENDING (esperando aprobacion Meta).

### Seguimiento de Llamada (3 templates)
| Template | Tecnica | Chars | Variables |
|----------|---------|-------|-----------|
| `agendar_llamada_v2` | FITD | 179 | {{1}}=ejecutivo_nombre |
| `llamada_sin_presion` | Pattern Interrupt | 150 | ninguna |
| `llamada_breve` | FITD | 124 | ninguna |

### Concierto: Michael Buble (2 templates)
| Template | Tecnica | Chars | Variables |
|----------|---------|-------|-----------|
| `buble_concierto_intimo` | Future Pacing | 188 | ninguna |
| `buble_concierto_lujo` | Authority | 164 | ninguna |

### Concierto: El Buki (1 template)
| Template | Tecnica | Chars | Variables |
|----------|---------|-------|-----------|
| `buki_formato_intimo` | Curiosity Gap | 159 | ninguna |

### Concierto: Series 2026 (2 templates)
| Template | Tecnica | Chars | Variables |
|----------|---------|-------|-----------|
| `conciertos_formato_unico` | Contrast Effect | 161 | ninguna |
| `conciertos_escapada` | Regret Aversion | 165 | ninguna |

### Gancho de Oportunidad (3 templates)
| Template | Tecnica | Chars | Variables |
|----------|---------|-------|-----------|
| `gancho_curiosidad` | Curiosity Gap | 127 | ninguna |
| `gancho_oportunidad_nueva` | Scarcity implicita | 124 | ninguna |
| `escapada_puente` | Scarcity | 187 | ninguna |

### Con Reserva Pendiente (2 templates)
| Template | Tecnica | Chars | Variables |
|----------|---------|-------|-----------|
| `reserva_pendiente_v2` | Endowment Effect | 151 | ninguna |
| `reserva_vigencia` | Loss Aversion | 179 | ninguna |

### Retomar Negociacion (2 templates)
| Template | Tecnica | Chars | Variables |
|----------|---------|-------|-----------|
| `retomar_sin_compromiso` | Reactance | 147 | ninguna |
| `retomar_opciones_nuevas` | Reciprocity | 139 | {{1}}=nombre |

### Seguimiento Post-Contacto (3 templates UTILITY)
| Template | Tecnica | Chars | Variables |
|----------|---------|-------|-----------|
| `seg_pregunta_destino` | Zeigarnik Effect | 111 | ninguna |
| `seg_retomar_platica` | Commitment & Consistency | 152 | {{1}}=nombre |
| `seg_post_contacto` | Reciprocity | 136 | ninguna |

### Viaje en Pareja (1 template)
| Template | Tecnica | Chars | Variables |
|----------|---------|-------|-----------|
| `pareja_experiencia` | Future Pacing | 163 | ninguna |

## Correcciones Aplicadas (vs originales)

1. **Tuteo eliminado**: Todas usan "usted" (originales usaban "tu/has/tienes")
2. **Scarcity explicita removida**: "Quedan pocos lugares" → "Una experiencia que no se repite"
3. **Referencias a costos eliminadas**: "costos que normalmente no manejamos" → "algo que normalmente no esta disponible"
4. **Variables corregidas**: Nunca al inicio del body (V4), precedidas por 3+ palabras
5. **Pregunta final obligatoria**: Todas terminan con pregunta abierta (V6)
6. **CTA unico**: Doble CTA eliminado ("duda O apoyo" → solo una pregunta)
7. **Tono calido mexicano**: "A sus ordenes" → "Al pendiente", "Intentamos contactarle" → "Le llamamos"
8. **Variable de hora eliminada**: `agendar_llamada_v2` usa "mas tarde" en vez de {{2}} (dificil de determinar en roundrobin)
9. **Formato *Vidanta***: Todas usan negritas para la marca
10. **Fechas hardcodeadas removidas**: `prospecto_puente__marzo` → `escapada_puente` (generico, reusable)

## Script

`scripts/replace-pending-templates.cjs` - Ejecuta DELETE (20) + CREATE (19) via webhook N8N con mismo Auth header que el edge function proxy.

## Arquitectura del Pipeline

```
Script (.cjs) → POST webhook N8N → N8N workflow → Twilio Content API → Meta Review → Status update en BD
                                                                        ↓
Edge Function (proxy) → POST webhook N8N (misma ruta)          Frontend lee status
     ↑
Frontend (createTemplate/deleteTemplate)
```

- DELETE exitoso: N8N elimina de Twilio + soft-delete en BD
- DELETE fallido (resource not found): Frontend fallback → soft-delete BD directamente
- CREATE: N8N crea Content Template en Twilio → guarda en BD con `twilio_content_sid`

## Lecciones

1. **Templates PENDING sin Content SID en Twilio**: Al intentar DELETE via webhook, falla con "resource not found". El frontend ya maneja esto con fallback a `is_deleted: true`. En scripts, hay que hacer lo mismo.
2. **Variable de hora en roundrobin**: No es practico mapear {{hora}} cuando los envios se hacen por roundrobin automatico. Mejor usar texto generico ("mas tarde").
3. **Checklist de 13 puntos del skill**: Cada template fue validado contra las reglas de `/factory-templates` antes de crearse. Los problemas mas comunes fueron: variable al inicio (V4), falta de pregunta final (V6), y doble CTA (V9).

## Archivos Relevantes

| Archivo | Proposito |
|---------|-----------|
| `scripts/replace-pending-templates.cjs` | Script de reemplazo masivo (DELETE + CREATE) |
| `.claude/skills/factory-templates/SKILL.md` | Skill con reglas de generacion |
| `supabase/functions/whatsapp-templates-proxy/index.ts` | Edge function proxy al webhook N8N |
| `src/services/whatsappTemplatesService.ts` | Servicio frontend (createTemplate, deleteTemplate) |
