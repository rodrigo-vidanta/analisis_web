# 📚 ÍNDICE: Migración coordinador_coordinaciones → auth_user_coordinaciones

**Fecha:** 29 Diciembre 2025  
**Estado:** ✅ Migración Completada - Pendiente Validación  
**Documentación Total:** 1,654 líneas

---

## 🎯 INICIO RÁPIDO

### ¿Qué pasó?
Durante 3-4 semanas existieron **DOS tablas idénticas** almacenando las mismas coordinaciones, causando desincronización de datos y permisos incorrectos para usuarios.

### ¿Por qué?
Migración incompleta: se creó tabla nueva (`auth_user_coordinaciones`) en Diciembre 2025 pero NO se migró el código que usaba la tabla legacy (`coordinador_coordinaciones`).

### ¿Cuál fue el impacto?
- 7 registros desincronizados
- Barbara Paola con permisos incorrectos (veía 2 coordinaciones en UI, permisos solo aplicaban para 1)
- Escritura dual en 7 archivos (riesgo de fallas)

### ¿Qué se hizo?
Migración quirúrgica completa en 2 horas:
- Sincronización de datos (15 registros totales)
- Migración de 7 archivos críticos
- Eliminación de escritura dual
- Documentación exhaustiva

---

## 📂 DOCUMENTACIÓN DISPONIBLE

### 0. 🔴 HOTFIX: Loop Infinito (29-12-2025 14:00)
**Archivo:** `docs/HOTFIX_LOOP_INFINITO_20251229.md` (230 líneas)

**Contenido:**
- Loop infinito de consultas `ERR_INSUFFICIENT_RESOURCES`
- Caché de backups implementado (99% reducción queries)
- Fix coordinación visible para coordinadores
- Deploy: commit 88c5aee, deploy-046

**Cuándo leer:** Para entender el hotfix crítico aplicado inmediatamente después de la migración

---

### 1. 🔍 POST-MORTEM (Análisis Completo)
**Archivo:** `docs/POSTMORTEM_DUAL_TABLES.md` (467 líneas)

**Contenido:**
- Historia completa del problema (Noviembre → Diciembre 2025)
- Cronología detallada (5 fases)
- Análisis de causa raíz (6 causas identificadas)
- Impacto en usuarios y servicios
- Lecciones aprendidas
- Métricas del problema

**Cuándo leer:** Para entender QUÉ pasó, POR QUÉ pasó, y CÓMO evitarlo en el futuro

---

### 2. 📋 Plan de Migración (Análisis Técnico)
**Archivo:** `docs/MIGRATION_COORDINADOR_COORDINACIONES.md` (433 líneas)

**Contenido:**
- Análisis exhaustivo de impacto (7 archivos)
- Detalle por archivo (funciones, líneas, criticidad)
- Estructura de tablas (legacy vs nueva)
- Plan de migración por fases
- Checklist de implementación
- Riesgos y mitigaciones
- Plan de rollback

**Cuándo leer:** Para entender el análisis técnico ANTES de la migración

---

### 3. ✅ Cambios Realizados (Migración Completa)
**Archivo:** `docs/MIGRATION_COMPLETED_20251229.md` (334 líneas)

**Contenido:**
- Archivos migrados (7 total)
- Cambios específicos por archivo (código antes/después)
- Datos sincronizados (15 registros)
- Checklist de pruebas
- Plan de rollback detallado
- Estado post-migración
- Criterios de éxito

**Cuándo leer:** Para ver QUÉ se cambió exactamente y CÓMO validarlo

---

### 4. 📊 Resumen Ejecutivo
**Archivo:** `docs/MIGRATION_SUMMARY_20251229.md` (290 líneas)

**Contenido:**
- Resumen de cambios
- Estructura de tablas (antes/después)
- Checklist pre-deployment
- Plan de rollback rápido
- Métricas de migración
- Beneficios obtenidos
- Próximos pasos

**Cuándo leer:** Para vista rápida del problema y solución (5 minutos)

---

### 5. 🛠️ Scripts de Migración
**Archivo:** `scripts/migration/README_MIGRATION.md` (130 líneas)

**Contenido:**
- Documentación de scripts TypeScript y SQL
- Guía de uso de `verify-and-sync-coordinaciones.ts`
- Guía de uso de `sync-coordinaciones-legacy-to-new.sql`
- Contexto del problema
- Resultado de sincronización
- Plan de deprecación

**Cuándo leer:** Para ejecutar o entender los scripts de sincronización

---

### 6. 📝 CHANGELOG (Registro Oficial)
**Archivo:** `CHANGELOG.md` (entrada del 29-12-2025)

**Contenido:**
- Entrada crítica en CHANGELOG oficial
- Resumen del problema y solución
- Lista de archivos modificados
- Referencias a documentación completa
- Estado y próximos pasos

**Cuándo leer:** Para consulta rápida en historial del proyecto

---

## 🗺️ GUÍA DE LECTURA RECOMENDADA

### Para Desarrolladores (Nueva incorporación al equipo)
1. `MIGRATION_SUMMARY_20251229.md` (resumen rápido)
2. `POSTMORTEM_DUAL_TABLES.md` (historia completa)
3. `MIGRATION_COMPLETED_20251229.md` (cambios técnicos)

**Tiempo estimado:** 30 minutos

---

### Para Gerencia/Stakeholders
1. `MIGRATION_SUMMARY_20251229.md` (resumen ejecutivo)
2. `POSTMORTEM_DUAL_TABLES.md` secciones:
   - Resumen Ejecutivo
   - Impacto Detallado
   - Lecciones Aprendidas

**Tiempo estimado:** 15 minutos

---

### Para Debugging/Troubleshooting
1. `MIGRATION_COMPLETED_20251229.md` (qué se cambió)
2. `POSTMORTEM_DUAL_TABLES.md` (contexto del problema)
3. Scripts en `scripts/migration/` (herramientas)

**Tiempo estimado:** 20 minutos

---

### Para Auditoría/Compliance
1. `POSTMORTEM_DUAL_TABLES.md` (análisis completo)
2. `MIGRATION_COORDINADOR_COORDINACIONES.md` (plan técnico)
3. `CHANGELOG.md` (registro oficial)

**Tiempo estimado:** 45 minutos

---

## 📊 ESTADÍSTICAS

### Documentación Generada
- **Total de archivos:** 7 documentos
- **Total de líneas:** 1,884 líneas
- **Promedio por doc:** 269 líneas
- **Tiempo de escritura:** ~2.5 horas (incluye análisis + hotfix)

### Cobertura Documental
- ✅ Historia completa del problema
- ✅ Análisis técnico detallado
- ✅ Cambios específicos por archivo
- ✅ Scripts de migración documentados
- ✅ Plan de rollback
- ✅ Lecciones aprendidas
- ✅ Registro en CHANGELOG

---

## 🔗 REFERENCIAS CRUZADAS

### Archivos de Código Modificados
1. `src/services/permissionsService.ts` (líneas 563, 698)
2. `src/services/coordinacionService.ts` (líneas 717, 844, 967)
3. `src/services/authService.ts` (línea 677)
4. `src/hooks/useInactivityTimeout.ts` (línea 63)
5. `src/components/admin/UserManagement.tsx` (líneas 380, 416, 1146, 1179)
6. `src/components/admin/UserManagementV2/components/UserCreateModal.tsx` (línea 246)
7. `src/components/admin/UserManagementV2/hooks/useUserManagement.ts` (líneas 858, 896)

### Scripts Ejecutables
- `scripts/migration/verify-and-sync-coordinaciones.ts` (verificación y sincronización)
- `scripts/migration/sync-coordinaciones-legacy-to-new.sql` (migración SQL)

### Tablas de Base de Datos
- `coordinador_coordinaciones` (DEPRECADA - conservada para rollback)
- `auth_user_coordinaciones` (ACTIVA - fuente única de verdad)

---

## ⚠️ IMPORTANTE

### Estado Actual (29 Dic 2025)
- ✅ Migración de código COMPLETADA
- ✅ Sincronización de datos COMPLETADA
- ✅ Documentación COMPLETADA
- ⏳ Pruebas de validación PENDIENTES
- ⏳ Deploy a producción PENDIENTE

### Tabla Legacy
La tabla `coordinador_coordinaciones` **NO se ha eliminado**:
- Conservada 30 días para rollback
- Código de limpieza mantiene compatibilidad
- Se renombrará después de validación exitosa

### Próximos Pasos
1. Ejecutar pruebas locales
2. Validar login de coordinadores
3. Verificar permisos de prospectos
4. Deploy a producción
5. Monitoreo 48 horas
6. Validación 30 días
7. Deprecación final de tabla legacy

---

## 🎯 CRITERIOS DE ÉXITO

La migración se considerará exitosa cuando:
- ✅ Todos los coordinadores pueden hacer login
- ✅ Permisos de coordinaciones funcionan correctamente
- ✅ Barbara Paola ve prospectos de ambas coordinaciones (VEN + I360)
- ✅ Dropdowns de coordinadores se llenan sin errores
- ✅ Asignación de backups funciona
- ✅ Sin errores en logs de producción por 30 días
- ✅ Performance igual o mejor que antes

---

## 📞 CONTACTO

**Equipo Técnico:**
- Desarrollador Principal: Samuel Rosales
- AI Assistant: Claude Sonnet 4.5 (Cursor)

**Para Consultas:**
- Referirse a este índice para encontrar documentación específica
- Leer POST-MORTEM para contexto completo
- Revisar CHANGELOG para actualizaciones

---

**Última actualización:** 29 Diciembre 2025  
**Versión:** 1.0  
**Estado:** Documentación Completa

