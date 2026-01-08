# 📋 CHANGELOG - MÓDULO DE CAMPAÑAS

## [2.3.1] - 2026-01-08

### 🛠️ Correcciones de Bugs

#### Filtro de Menores (3 estados)
- **Antes**: Botón "Hijos" y sub-filtro duplicado "Con/Sin menores"
- **Ahora**: Botón único "Menores" con ciclo de 3 estados:
  1. Neutral (gris): "Menores" - sin filtro
  2. Activo (rosa): "Con menores" - `cantidad_menores > 0`
  3. Inverso (slate): "Sin menores" - `cantidad_menores IS NULL OR = 0`
- Eliminado sub-filtro duplicado

#### Limpieza de Filtros
- **Estado Civil**: Corregida lógica de limpieza (`as EstadoCivil || null` → condicional explícito)
- **Tiene Email**: Corregido botón "Todos" con lógica redundante
- **Destinos**: Agregado botón "Limpiar"
- **Viaja Con + Menores**: Agregado botón "Limpiar" que resetea ambos filtros
- **Etiquetas**: Agregado botón "Limpiar" en el indicador de selección

### 🔧 Mejoras UX
- Todos los filtros ahora tienen botón "Limpiar" visible cuando hay selección
- Contador de prospectos se recalcula correctamente al limpiar

---

## [2.3.0] - 2025-01-08

### ✨ Nuevas Funcionalidades

#### Filtros de Audiencia Mejorados
- **Filtro de Email**: Nuevo filtro para segmentar prospectos con/sin correo electrónico
  - Tres opciones: Todos, Con email, Sin email
  - UI con botones visuales claros
  
- **Filtro de Etiquetas**: Segmentar por etiquetas de WhatsApp Business
  - Multi-select con colores de etiquetas
  - Consulta a SystemUI para obtener `whatsapp_labels_preset`
  - Lógica OR: incluye prospectos con CUALQUIERA de las etiquetas seleccionadas

- **Días sin Contacto Mejorado**: Ahora consulta `mensajes_whatsapp`
  - Antes: Usaba `prospectos.updated_at`
  - Ahora: Usa última interacción en `mensajes_whatsapp.fecha_hora`
  - Incluye mensajes humanos, bot y plantillas

#### Etapas Actualizadas
- Sincronizadas con vista Kanban del módulo de prospectos
- Corregido `Validando membresia` (sin acento, como está en BD)
- Agregado `Primer contacto` (86 prospectos activos)
- Eliminadas etapas obsoletas: Nuevo, Sin contactar, No interesado, Cerrado

### 🔧 Mejoras Técnicas

- Import de `supabaseSystemUI` agregado a CampanasManager
- Conteo de prospectos ahora incluye TODOS los filtros
- Construcción de WHERE clauses incluye filtros de email y etiquetas
- Payload al webhook incluye `audience_etiquetas` para N8N

### 📝 Documentación

- Creado `README_CAMPANAS.md` con documentación técnica completa
- Creado `CHANGELOG_CAMPANAS.md` (este archivo)
- Creadas reglas de Cursor en `.cursor/rules/campanas-rules.mdc`

---

## [2.2.0] - 2025-01-07

### ✨ Nuevas Funcionalidades

#### Campañas A/B Test
- Soporte para crear campañas con dos variantes
- Cada variante tiene su propio registro en BD vinculado por `ab_group_id`
- UI con dos phone mockups para preview lado a lado
- Slider para ajustar distribución de prospectos

#### Validación de Cobertura de Variables
- Análisis automático de qué prospectos tienen las variables requeridas
- Si cobertura < 100%, fuerza A/B test automáticamente
- Template B solo muestra plantillas con 100% cobertura

#### Ejecución Programada
- Campo `execute_at` para programar campañas
- Presets: "Ahora", "En 1 hora", "En 3 horas", "Mañana 9am", "Mañana 2pm"
- Selector de fecha/hora personalizado

### 🔧 Mejoras Técnicas

- Integración con Realtime de Supabase
- Webhook ya no inserta en BD desde frontend
- N8N maneja inserción y genera queries UNION ALL

---

## [2.1.0] - 2025-01-06

### ✨ Nuevas Funcionalidades

#### Cards de Campaña Mejorados
- Barra de progreso para campañas estándar
- Barras separadas para variantes A/B
- Header con gradiente azul-esmeralda
- Bordes neutrales consistentes

#### Bloqueo de Edición
- Campañas con status `running` no se pueden editar
- Botón "Programar Envío" deshabilitado
- Banner informativo en modal

### 🔧 Mejoras Técnicas

- Agrupación de campañas A/B por `ab_group_id` en UI
- Eliminación conjunta de variantes A/B
- Estadísticas combinadas para grupos A/B

---

## [2.0.0] - 2025-01-05

### ✨ Nuevas Funcionalidades

#### Sistema de Campañas Completo
- Dashboard con estadísticas animadas
- Vista de cards y grid con paginación
- Modal de creación estilo Meta
- Phone mockup con preview de mensaje

#### Integración con Audiencias
- Selección de audiencia con conteo en tiempo real
- Filtros: etapa, estado civil, viaja con, destinos
- Días sin contacto con presets

#### Integración con Plantillas
- Selección de plantilla con preview
- Resolución de variables con datos reales
- Soporte para texto, imágenes y videos

### 🔧 Mejoras Técnicas

- Webhook a N8N para ejecución
- Payload con WHERE clauses para seguridad
- Validación de SQL injection en guardrail

---

## [1.0.0] - 2024-12-15

### 🎉 Release Inicial

- Estructura base del módulo de campañas
- Placeholder para CampanasManager
- Integración con CampaignsDashboardTabs

---

**Formato de versión:** MAJOR.MINOR.PATCH
- MAJOR: Cambios incompatibles
- MINOR: Nuevas funcionalidades
- PATCH: Correcciones de bugs

