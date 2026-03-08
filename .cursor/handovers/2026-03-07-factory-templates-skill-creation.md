# Handover: Skill /factory-templates - Generador de Plantillas WhatsApp

**Fecha:** 7 Marzo 2026
**Tipo:** Feature (Skill)
**Estado:** Completado

## Contexto

Las plantillas WhatsApp generadas manualmente carecian de consistencia en tono, compliance Meta, y efectividad psicologica. Se necesitaba un sistema que, con un simple prompt, generara plantillas optimizadas para venta en frio de certificados vacacionales Vidanta, embebiendo todas las reglas de negocio, compliance Meta, y tecnicas de persuasion.

## Problema que Resuelve

1. **Inconsistencia de tono**: Templates creados por diferentes personas con estilos dispares
2. **Errores de negocio**: Templates que mencionaban "zona", "area" o trataban el producto como cambaceo
3. **Baja calidad Meta**: Templates que bajaban quality rating por usar palabras/patrones penalizados
4. **Falta de estrategia psicologica**: Templates genericos sin tecnicas de persuasion aplicadas
5. **Variables incorrectas**: Usar variables en templates cold donde solo se tiene el telefono

## Investigacion Previa

### Analisis de Conversaciones (50 conversaciones, 654 mensajes)
- Flujo real: Bot AI Natalia califica → ejecutivo llama → presenta oferta → cierra
- Top destino: Riviera Maya (62%)
- Segmentos principales: parejas (escapada romantica), familias, ocasiones especiales
- Lo que funciona: saludo calido, framing experiencial, preguntas abiertas, emojis sutiles
- Lo que NO funciona: "en su zona", pitch generico, tono corporativo, presion directa

### Investigacion Meta Compliance (2025-2026)
- Julio 2025: pricing por mensaje (no por conversacion)
- Abril 2025: pacing expandido a UTILITY, auto-reclasificacion sin aviso
- 3 pauses = template deshabilitado permanentemente
- Read rate < 60% = zona de riesgo
- Templates < 160 chars tienen mejor quality rating

### Inventario de Grupos (al momento de creacion)
- 13 grupos totales (12 activos)
- 35 templates activos y aprobados
- Grupos prioritarios: Reenganche Suave (healthy, 50% reply), Gancho de Oportunidad (degraded, 50% reply)
- Grupos problematicos: Retomar Negociacion (degraded, 25% reply), Con Reserva Pendiente (mixed, 20% reply)

## Implementacion

### Archivo creado
- `.claude/skills/factory-templates/SKILL.md` (573 lineas)

### Estructura del Skill (secciones principales)

| Seccion | Lineas aprox | Contenido |
|---------|-------------|-----------|
| YAML + Reglas | 15 | Front matter, regla de NO insertar sin autorizacion |
| Invocacion | 15 | Modos: generar templates, analizar grupo, generar script |
| Persona | 20 | Vendedor elite + psicologo conductual + Meta compliance expert |
| Contexto de Negocio | 55 | Producto, destinos, selling points, flujo de venta, Do/Don't |
| Reglas Meta | 60 | Chars, palabras prohibidas, quality rating, pacing, pricing |
| Variables por Funnel | 35 | Frio=0, Tibio=nombre, Caliente=nombre+ejecutivo, Full=5 vars |
| 22 Tecnicas Psicologicas | 90 | Cada una con ejemplo aplicado a Vidanta |
| Inventario de Grupos | 40 | 12 grupos con templates, health, reply rates, sends |
| Reglas de Comunicacion | 35 | Tono, emojis, formato, palabras preferidas/prohibidas |
| Flujo de Generacion | 40 | 7 pasos: parsear → consultar BD → tecnicas → generar → validar |
| Formato de Output | 30 | Metadata completa por template generado |
| Checklist de Validacion | 25 | 13 puntos obligatorios pre-output |
| Modo Analisis | 25 | Queries SQL + analisis + recomendaciones |
| Script de Creacion | 25 | Patron .cjs para crear via webhook N8N |
| Archivos Clave + Notas | 30 | Referencias, tags, webhook, tendencias |

### Modos de Uso

1. **Generar templates**: `/factory-templates 10 reenganche suave sin variables`
2. **Analizar grupo**: `/factory-templates analizar grupo "Gancho de Oportunidad"`
3. **Generar script de creacion**: `/factory-templates script <templates aprobados>`

### Tecnicas Psicologicas Embebidas (22 total)
Curiosity Gap, Loss Aversion, Social Proof, Scarcity, Pattern Interrupt, FITD, Reciprocity, False Choice, Authority, Zeigarnik, Anchoring, Commitment, Endowment, Reactance, Identity Labeling, Self-Reference, Future Pacing, Sunk Cost, Regret Aversion, DITF, Contrast, Choice Architecture

### Checklist de Validacion (13 puntos)
V1-Chars, V2-Palabras prohibidas, V3-Presion Meta, V4-Variables correctas, V5-Emojis, V6-Pregunta final, V7-Categoria, V8-Tono, V9-Un CTA, V10-No precio, V11-Nombre valido, V12-Tecnica unica, V13-No duplica

## Dependencias

- MCP Supabase (execute_sql) para consultar templates existentes y health
- Tablas: `whatsapp_templates`, `template_groups`, `v_template_group_health`
- Webhook N8N para creacion: `POST /webhook/whatsapp-templates`
- Script patron: `scripts/create-number-update-templates.cjs`

## Archivos Relacionados

| Archivo | Relacion |
|---------|----------|
| `.claude/skills/factory-templates/SKILL.md` | **CREADO** - Skill principal |
| `src/types/whatsappTemplates.ts` | Tipos, etapas, destinos, interfaces |
| `src/services/whatsappTemplatesService.ts` | Logica de creacion y variables |
| `scripts/create-number-update-templates.cjs` | Patron de script para creacion masiva |
| `.claude/agents/whatsapp-agent.md` | Contexto del agente WhatsApp |

## Notas

- El skill es el 9no skill del proyecto (junto a comunicado, deploy, railway, uchat, aws, frontend-design, vapi, maintenance)
- REGLA: Solo genera propuestas. NUNCA inserta en BD sin autorizacion explicita
- El skill consulta la BD en tiempo real para ver templates existentes antes de generar nuevos
- Variables de templates se asignan segun etapa del funnel (frio=0, tibio=nombre, caliente=nombre+ejecutivo)
- Cada template generado pasa por checklist de 13 puntos de validacion Meta antes de presentarse
