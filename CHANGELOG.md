# 📋 CHANGELOG - PQNC QA AI Platform

## [Unreleased]

### 🔧 Fix: Error 406 system_config en Sidebar [02-01-2026]

#### Problema Resuelto
- **Síntoma:** Errores `406 (Not Acceptable)` al cargar página por consulta a `system_config` desde `Sidebar.tsx`
- **Causa:** La tabla `system_config` no está expuesta a la API REST de Supabase en la base de datos PQNC
- **Impacto:** Errores en consola del navegador al cargar la aplicación
- **Solución:** Eliminada consulta directa a `system_config` desde `Sidebar.tsx`. El componente ahora usa logo sugerido por defecto y escucha cambios desde `SystemPreferences` cuando el usuario cambia el logo.

#### Cambios Realizados
- ✅ Eliminada consulta directa a `system_config` desde `Sidebar.tsx`
- ✅ Actualizado `consoleInterceptors.ts` para manejar errores 406 de `system_config`
- ✅ `Sidebar.tsx` ahora usa `getSuggestedLogo()` por defecto
- ✅ Sistema de eventos `logo-changed` para actualizar logo cuando se cambia desde `SystemPreferences`

#### Archivos Modificados
- `src/components/Sidebar.tsx` (eliminada consulta a system_config)
- `src/utils/consoleInterceptors.ts` (manejo de errores 406)

---

### 🔴 HOTFIX CRÍTICO: Loop Infinito + Coordinación Visible [29-12-2025]

#### Problema 1: ERR_INSUFFICIENT_RESOURCES (Loop Infinito)
- **Archivo:** `src/services/permissionsService.ts`
- **Síntoma:** 100+ consultas simultáneas a `auth_users.backup_id` causando `ERR_INSUFFICIENT_RESOURCES`
- **Causa:** Función `canAccessProspect()` consultaba BD sin caché por cada prospecto
- **Impacto:** Módulo WhatsApp inutilizable con admin, navegador colapsaba
- **Solución:** Agregado `backupCache` con TTL de 30 segundos
- **Resultado:** Reducción de queries ~99%, performance restaurada

#### Problema 2: Coordinación No Visible en Kanban
- **Archivo:** `src/components/analysis/AssignmentBadge.tsx`
- **Síntoma:** Coordinadores (incluyendo CALIDAD) no veían etiqueta de coordinación en cards de prospectos
- **Causa:** `showCoordinacion` no incluía rol `isCoordinador`
- **Impacto:** Coordinadores no podían ver a qué coordinación pertenecía cada prospecto
- **Solución:** `showCoordinacion` ahora incluye `isCoordinador`
- **Resultado:** Coordinadores ven coordinación + ejecutivo en todos los cards

#### Archivos Modificados
- `src/services/permissionsService.ts` (caché de backups)
- `src/components/analysis/AssignmentBadge.tsx` (lógica de display)

---

### 🔴 CRÍTICO: Corrección de Desincronización de Datos [29-12-2025]

#### Problema Identificado y Resuelto
- **Issue:** Dos tablas idénticas (`coordinador_coordinaciones` y `auth_user_coordinaciones`) almacenando las mismas coordinaciones
- **Causa:** Migración incompleta en Diciembre 2025 - se creó tabla nueva sin migrar código legacy
- **Impacto:** Desincronización de datos (caso detectado: Barbara Paola con permisos incorrectos)
- **Duración:** ~3-4 semanas sin detectar
- **Resolución:** Migración quirúrgica completa en 2 horas

#### Cambios Realizados
- ✅ Sincronización de 15 registros (7 migrados desde tabla legacy)
- ✅ Migración de 7 archivos críticos:
  - `permissionsService.ts` (permisos y filtros)
  - `coordinacionService.ts` (coordinadores/supervisores)
  - `authService.ts` (login)
  - `useInactivityTimeout.ts`
  - `UserManagement.tsx`
  - `UserCreateModal.tsx` (eliminada escritura dual)
  - `useUserManagement.ts` (eliminada escritura dual)
- ✅ Nomenclatura: `coordinador_id` → `user_id`
- ✅ Tabla única: `auth_user_coordinaciones` como fuente de verdad
- ✅ Documentación exhaustiva: POST-MORTEM completo

#### Archivos de Documentación
- `docs/POSTMORTEM_DUAL_TABLES.md` - Análisis completo del problema
- `docs/MIGRATION_COORDINADOR_COORDINACIONES.md` - Plan de migración
- `docs/MIGRATION_COMPLETED_20251229.md` - Cambios detallados
- `docs/MIGRATION_SUMMARY_20251229.md` - Resumen ejecutivo
- `scripts/migration/verify-and-sync-coordinaciones.ts` - Script de sincronización
- `scripts/migration/sync-coordinaciones-legacy-to-new.sql` - SQL de migración

#### Estado Post-Migración
- ⚠️ Tabla `coordinador_coordinaciones` DEPRECADA (no eliminada)
- ✅ Conservada 30 días para rollback
- ⏳ Pruebas pendientes de validación

#### Lecciones Aprendidas
- ❌ NO crear tablas nuevas sin migrar código completo
- ❌ NO usar "escritura dual" como solución permanente
- ✅ SÍ hacer migraciones atómicas (datos + código)
- ✅ SÍ documentar cambios estructurales inmediatamente

---

## [v2.2.1] - 2025-01-26

### 🎊 Sistema de Logos Personalizados

#### ✨ Nuevas Características

**Catálogo de Logos Intercambiables:**
- ✅ 3 logos disponibles: Default, Christmas, NewYear
- ✅ Selector visual estilo Google Doodles
- ✅ Preview interactivo con animaciones
- ✅ Guardado en system_config
- ✅ Actualización en tiempo real sin recargar

**Logo de Año Nuevo:**
- ✅ Contador regresivo hasta Año Nuevo 2026
- ✅ Fuegos artificiales al hacer clic (10 explosiones, 16 partículas c/u)
- ✅ Audio de fuegos artificiales
- ✅ Partículas diminutas como polvo (1.5px)
- ✅ Duración: 8 segundos

**Logo Navideño:**
- ✅ 15 luces titilantes en 4 colores
- ✅ 25 copos de nieve cayendo
- ✅ Jingle navideño al hacer clic

**Logo Estándar:**
- ✅ Texto "PQNC" con gradiente indigo→purple
- ✅ Sin animaciones

#### 🔄 Mejoras

**Selector en Administración:**
- ✅ Responsive al dark mode (todos los colores adaptados)
- ✅ Badge "Temporada" visible en dark mode
- ✅ Badge "Sugerido" con animación pulse
- ✅ Preview interactivo (click para animar)
- ✅ Texto siempre legible en ambos modos

**Integración:**
- ✅ Sidebar carga logo dinámicamente desde BD
- ✅ Evento `logo-changed` para actualización en tiempo real
- ✅ Sugerencias automáticas según fecha

---

## [v2.2.0] - 2025-01-26

### 🎨 REDISEÑO COMPLETO - Sistema de Diseño Minimalista

#### ✨ Nuevas Características

**Sistema de Tokens de Diseño:**
- ✅ Implementado sistema centralizado de tokens de diseño
- ✅ De 680+ gradientes → 6 gradientes corporativos (97% reducción)
- ✅ De 8 tamaños de iconos → 3 estandarizados (62% reducción)
- ✅ De 12 duraciones → 4 estandarizadas (67% reducción)
- ✅ Paleta homologada de 12 colores base
- ✅ Biblioteca de animaciones con Framer Motion

**Componentes Base Reutilizables:**
- ✅ Button (6 variantes, 3 tamaños)
- ✅ Card (4 variantes + 5 sub-componentes)
- ✅ Badge (6 variantes, dot, removible)
- ✅ Modal (5 tamaños, animaciones corporativas)
- ✅ Input (4 variantes, validación visual)
- ✅ Tabs (3 variantes, keyboard navigation)

**Tema Twilight (Crepúsculo) 🆕:**
- ✅ Nuevo tema intermedio entre claro y oscuro
- ✅ Background: #1a202e (azul-gris suave)
- ✅ Perfecto para trabajo prolongado
- ✅ Contraste WCAG 8:1
- ✅ Selector de 3 temas con iconos animados

#### 🔄 Mejoras

**Módulo WhatsApp (Live Chat):**
- ✅ Header slim minimalista (py-2.5, 37.5% más compacto)
- ✅ Sin título, solo icono vectorizado
- ✅ Componente Tabs homologado
- ✅ Card e Input en configuración
- ✅ Colores neutral-* homologados
- ✅ Icono verde (success-500) identificador

**Widget de Conversaciones (Dashboard):**
- ✅ Icono 🤖 para mensajes del bot (no letra "B")
- ✅ Icono 📄 para mensajes de plantilla (no letra "P")
- ✅ Etiqueta verde "Plantilla enviada por: [Ejecutivo]"
- ✅ Colores diferenciados por tipo de mensaje
- ✅ Detección correcta de plantillas vía whatsapp_template_sends

**Sistema de Colores:**
- ✅ Unificación de colores: slate/gray → neutral
- ✅ Gradientes corporativos por módulo
- ✅ Soporte completo para 3 temas

#### 🎯 Animaciones

**Selector de Tema:**
- ✅ Sol: Rayos girando + centro pulsante
- ✅ Luna: 5 estrellas titilantes + balanceo
- ✅ Crepúsculo: Atardecer con sol poniéndose, nubes, rayos

**Componentes:**
- ✅ SCALE_IN para modales
- ✅ FADE_IN para elementos simples
- ✅ SPRING_POP para badges
- ✅ Stagger para listas
- ✅ Physics consistentes (stiffness, damping)

#### 📚 Documentación

**Nuevas Guías:**
- ✅ DESIGN_SYSTEM_AUDIT_2025.md (Auditoría completa 50+ páginas)
- ✅ DESIGN_SYSTEM_SUMMARY.md (Resumen ejecutivo)
- ✅ DESIGN_TOKENS_IMPLEMENTATION.md (Tokens)
- ✅ BASE_COMPONENTS_IMPLEMENTATION.md (Componentes)
- ✅ DESIGN_GUIDE_MODALS_V2.md (Guía de modales V2.0)
- ✅ LIVE_CHAT_MIGRATION.md (Migración WhatsApp)
- ✅ CONVERSACIONES_WIDGET_UPDATE.md (Widget actualizado)
- ✅ src/styles/tokens/README.md (Uso de tokens)
- ✅ src/components/base/README.md (Uso de componentes)

#### 🔒 Backup

- ✅ Backup completo del diseño anterior
- ✅ 14 archivos respaldados (452 KB)
- ✅ Instrucciones de restauración completas

#### 🛠️ Técnico

**Archivos Creados:** 37 archivos (~678 KB)
- 6 archivos de tokens (~25 KB)
- 7 componentes base (~46 KB)
- 2 archivos de configuración (~5 KB)
- 11 archivos de documentación (~150 KB)
- 14 archivos de backup (452 KB)

**Código Generado:**
- ~4,251 líneas de código TypeScript
- ~1,501 líneas de componentes base
- ~500 líneas de tokens
- ~2,000 líneas de documentación

---

## [v2.1.26] - Versión Anterior

(Contenido legacy preservado)

---

**Migración:** De v2.1.26 → v2.2.0  
**Tipo:** Major Update (Rediseño completo)  
**Breaking Changes:** Ninguno (retrocompatible)  
**Estado:** ✅ Completado y testeado
