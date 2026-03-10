# Handover: Auditoría de Grupos de Plantillas + Gancho de Oportunidad v2

**Fecha:** 2026-03-10
**Sesion:** Auditoría conceptual de template groups + creación de 10 nuevas plantillas
**Estado:** Completado

---

## Contexto

Los usuarios reportaron que algunas plantillas no encajaban en su grupo asignado. Ejemplo: en "Reenganche Suave" había una plantilla que pregunta por destino, lo cual puede dar la percepción de que no se pone atención al prospecto si ya se había hablado de un destino específico.

El problema no era hiper-personalización, sino **no revolver conceptos** — cada grupo debe tener plantillas que respeten su propósito sin asumir contexto que no corresponde.

---

## Parte 1: Auditoría de Grupos

### Metodología
- Se analizaron las 160 plantillas activas en 14 grupos
- Se evaluó cada template contra la descripción/propósito de su grupo
- Se identificaron 17 templates mal clasificados

### Hallazgos principales

**Reenganche Suave (20 → 14 propias):** 6 templates asumían historial previo (contradicen "frío/suave")
- `retomar_saludo` — asume contacto reciente por campaña
- `curiosidad_pura_1` — "Quedó pendiente nuestra plática"
- `reenganche_vacaciones_nombre` — "retomando el tema de sus vacaciones"
- `reenganche_suave` — "Me quedé pensando en su viaje"
- `reeng_destino_ideal` — pregunta por destino específico
- `ultima_oportunidad` — tono de cierre/despedida

**Gancho de Oportunidad (26 → 16 propios):** 10 templates sin urgencia/escasez real
- `gancho_mi_contacto`, `gancho_planner_experto`, `gancho_sin_vender`, `gancho_playa_o_montana` — presentación pasiva, cero urgencia
- `gancho_solo_escuchar`, `gancho_merecen_vacaciones`, `gancho_ya_tiene_plan`, `gancho_sin_compromiso` — tono suave sin hook
- `en_3minutos` — pitch de llamada
- `escapada_puente` — temporal/estacional

**Seguimiento de Llamada:** 1 template proactivo vs post-intento fallido

### Movimientos ejecutados (17 total)

| Template | De | A |
|----------|-----|-----|
| `retomar_saludo` | Reenganche Suave | Retomar Negociación |
| `curiosidad_pura_1` | Reenganche Suave | Retomar Negociación |
| `reenganche_vacaciones_nombre` | Reenganche Suave | Retomar Negociación |
| `reenganche_suave` | Reenganche Suave | Seguimiento Post-Contacto |
| `reeng_destino_ideal` | Reenganche Suave | Primer Contacto Frío |
| `ultima_oportunidad` | Reenganche Suave | Último Contacto (nuevo) |
| `gancho_mi_contacto` | Gancho | Primer Contacto Frío |
| `gancho_planner_experto` | Gancho | Primer Contacto Frío |
| `gancho_sin_vender` | Gancho | Primer Contacto Frío |
| `gancho_playa_o_montana` | Gancho | Primer Contacto Frío |
| `gancho_solo_escuchar` | Gancho | Reenganche Suave |
| `gancho_merecen_vacaciones` | Gancho | Reenganche Suave |
| `gancho_ya_tiene_plan` | Gancho | Reenganche Suave |
| `gancho_sin_compromiso` | Gancho | Reenganche Suave |
| `en_3minutos` | Gancho | Seguimiento de Llamada |
| `escapada_puente` | Gancho | Estacional / Puentes y Fechas (nuevo) |
| `agendar_llamada_v2` | Seg. Llamada | Retomar Negociación |

### Grupos nuevos creados

| Grupo | ID | Descripción |
|-------|-----|-------------|
| Último Contacto | `559da3f2-ed91-4756-95fd-81180a47f88d` | Mensaje cierre/despedida, tono amable, deja puerta abierta |
| Estacional / Puentes y Fechas | `22e0b28f-cdc6-4d4b-b5ff-666c5e78ef29` | Templates atados a temporadas, puentes, vacaciones |

### Conteo final post-auditoría

| Grupo | Antes | Después |
|-------|-------|---------|
| Reenganche Suave | 20 | 18 |
| Gancho de Oportunidad | 26 | 16 |
| Primer Contacto Frío | 15 | 20 |
| Retomar Negociación | 6 | 10 |
| Seguimiento Post-Contacto | 5 | 6 |
| Seguimiento de Llamada | 6 | 6 |
| Último Contacto (nuevo) | — | 1 |
| Estacional (nuevo) | — | 1 |

---

## Parte 2: Creación de 10 Templates Gancho de Oportunidad v2

### Análisis data-driven previo

**Top performers del grupo:**
| Template | Reply Rate | Effectiveness | Chars | Patrón |
|----------|-----------|---------------|-------|--------|
| `gancho_curiosidad` | 19.05% | 23.9 | 127 | Curiosity gap puro, "¿Le cuento?" |
| `gancho_despertar_mar` | 15.79% | 26.1 | 144 | Future pacing sensorial |
| `gancho_entre_nos` | 14.29% | 21.1 | 143 | Exclusividad interpersonal |

**Anti-patrones identificados (0% reply en 11 templates):**
- "Hola." sin emoji = muerte
- Social proof genérico = 0%
- Escasez sin variable y sin personalidad = 0%
- "¿Le interesa?" como CTA = peor rendimiento

**Patrones aplicados a las nuevas:**
- "Hola 👋" o "Hola 😊" obligatorio
- 144-173 chars (sweet spot ampliado)
- CTAs probados: "¿Le cuento?", "¿Quiere saber más?", "¿Me permite?"
- *Vidanta* + _Vacation Planner_ en cada una
- 10 técnicas psicológicas distintas

### Templates creados

| # | Nombre | Chars | Técnica | Twilio SID |
|---|--------|-------|---------|------------|
| 1 | `gancho_upgrade_cancelado` | 144 | Scarcity | HX98a6... |
| 2 | `gancho_experiencia_vip` | 154 | Curiosity Gap | HXe4f5... |
| 3 | `gancho_precio_cierra_pronto` | 154 | Loss Aversion | HXc89b... |
| 4 | `gancho_antes_que_se_vaya` | 159 | Regret Aversion | HX64d4... |
| 5 | `gancho_suite_disponible` | 162 | Authority | HX6126... |
| 6 | `gancho_espacio_exclusivo` | 162 | Social Proof + Scarcity | HX15c6... |
| 7 | `gancho_suite_mar_liberada` | 169 | Future Pacing + Scarcity | HX6e17... |
| 8 | `gancho_evento_privado` | 154 | DITF | HXaaf7... |
| 9 | `gancho_beneficio_extra` | 173 | Reciprocity | HX4e49... |
| 10 | `gancho_temporada_agotada` | 162 | Contrast Effect | HXa4e5... |

**Status:** Todas en PENDING esperando aprobación de Meta.

### Correcciones durante la sesión

3 templates originales fueron rechazados por el usuario:
1. `gancho_solo_unos_accesos` — "no quiero que después diga que nadie le avisó" → reproche anticipado, ofensivo
2. `gancho_acabo_de_ver` — "algo en el sistema de Vidanta" → ambiguo, "¿el sistema de qué?"
3. `gancho_lista_espera` — "había lista de espera para cierta disponibilidad" → ambiguo, "¿lista de espera de qué?"

**Lección:** Evitar frases que suenen a reproche anticipado o que usen conceptos abstractos sin especificar el objeto concreto.

---

## Archivos creados/modificados

| Archivo | Acción |
|---------|--------|
| `scripts/create-gancho-oportunidad-v2-templates.cjs` | Creado — script de creación masiva |

## Cambios en BD

- 17 templates movidos de grupo (UPDATE template_group_id)
- 2 grupos nuevos creados en `template_groups`
- 10 templates nuevos creados en `whatsapp_templates` via webhook N8N → Twilio

## Estado final del grupo Gancho de Oportunidad

26 templates totales (16 existentes + 10 nuevas). Todas con urgencia/escasez genuina. Sin templates de presentación pasiva ni sondeo casual.

## Seguimiento recomendado

1. **Monitorear aprobación Meta** de las 10 nuevas (normalmente horas)
2. **Evaluar reply rates** después de 50+ envíos por template para validar las nuevas
3. **Poblar grupos nuevos** (Último Contacto y Estacional) con más templates cuando se necesite
4. **Considerar pausar** los 11 templates con 0% reply rate del grupo original para mejorar el health score
