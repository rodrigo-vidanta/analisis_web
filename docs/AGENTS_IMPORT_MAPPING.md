# Vapi Agents Import Mapping

Este documento explica cómo se mapea un JSON completo de Vapi a la base de datos y a las vistas de la app.

## Objetivo

Separar un agente en catálogos reutilizables (plantillas, prompts, tools) y conservar la estructura de squad/miembros y parámetros.

## Mapeo

- Squad y Miembros
  - Se conserva `squad.*` dentro de `agent_templates.vapi_config.squad`.
  - Los `messages` por miembro se crean en `system_prompts` y se relacionan vía `agent_prompts` añadiendo `context_tags: ['member:<nombre>']`.
- Tools
  - Para `type: 'function'`: se crea/actualiza un registro en `tools_catalog` con `config.function.{name,description,parameters}` y `config.server.url`. La relación `agent_tools` guarda `custom_config` y, si aplica, `member`.
  - Para `type: 'endCall'`: se asegura en catálogo y queda seleccionada por defecto. El mensaje final se edita en Parámetros.
  - Para `assistantDestinations` se crea un tool sintético `transferCall` con `config.assistantName`, `message` y `description`.
- Parámetros
  - Se copian a `agent_templates.vapi_config.parameters`: `voice`, `transcriber`, `messagePlan`, `voicemailDetection`, `startSpeakingPlan`, `stopSpeakingPlan`, `firstMessage`, etc.

## Decisiones de Diseño

- No se añadieron tablas nuevas; se usan `context_tags` y `custom_config.member` para distinguir contenido por miembro.
- Se recomienda añadir vistas SQL si se requiere reporteo por miembro de squad.

## Pendientes / Extensiones

- Vista “Mis agentes” y “Mis herramientas” filtrando por `created_by` y `config.metadata.created_by`.
- Normalización opcional de squads si se requiere (tablas `agent_squads`, `agent_squad_members`).

