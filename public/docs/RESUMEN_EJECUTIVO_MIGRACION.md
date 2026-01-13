# Resumen Ejecutivo - Migración system_ui → pqnc_ai

**Fecha:** 2025-01-13  
**Estado:** Plan detallado completado, listo para ejecución

---

## 🎯 OBJETIVO

Unificar todas las tablas de `system_ui` en `pqnc_ai` para simplificar dependencias entre vistas de usuarios y prospectos.

---

## 📊 DECISIONES ESTRATÉGICAS

### 1. `user_notifications`
- ✅ **Conservar** estructura de `pqnc_ai` (11 columnas)
- ✅ **Migrar** datos de `system_ui` a `user_notifications_legacy`
- ✅ **Mantener** ambas tablas durante transición

### 2. `api_auth_tokens` y `api_auth_tokens_history`
- ✅ **Agregar** columnas faltantes a `pqnc_ai`
- ✅ **Merge** de datos (sobrescribir duplicados con `system_ui`)

### 3. Resto de tablas
- ✅ **Migración directa** sin conflictos

---

## 📋 ESTADÍSTICAS

### Base de Datos
- **Tablas a migrar:** 40 tablas + 7 vistas
- **Conflictos:** 5 tablas
- **Sin conflictos:** 35 tablas

### Frontend
- **Archivos a modificar:** 13 archivos principales
- **Servicios afectados:** 6 servicios
- **Componentes afectados:** 8 componentes

---

## 🚀 PLAN DE EJECUCIÓN

### Fase 1: Preparación (1-2 días)
1. ✅ Backup completo de ambas bases
2. ✅ Agregar columnas faltantes en pqnc_ai
3. ✅ Crear tabla `user_notifications_legacy`

### Fase 2: Migración de Datos (1 día)
1. ✅ Migrar `user_notifications` → `user_notifications_legacy`
2. ✅ Merge `api_auth_tokens` (sobrescribir con system_ui)
3. ✅ Merge `api_auth_tokens_history` (sobrescribir con system_ui)
4. ✅ Migrar resto de tablas

### Fase 3: Migración Frontend (2-3 días)
1. ✅ Actualizar configuración (`supabaseSystemUI.ts`)
2. ✅ Actualizar servicios (6 servicios)
3. ✅ Actualizar componentes (8 componentes)
4. ✅ Actualizar hooks

### Fase 4: Validación (1-2 días)
1. ✅ Pruebas funcionales completas
2. ✅ Validación de datos migrados
3. ✅ Pruebas de rendimiento

### Fase 5: Despliegue (1 día)
1. ✅ Desplegar cambios
2. ✅ Monitoreo post-migración
3. ✅ Mantener system_ui como backup

---

## 📁 DOCUMENTOS CREADOS

1. ✅ `docs/ANALISIS_MIGRACION_SYSTEM_UI_A_PQNC_AI.md` - Análisis completo
2. ✅ `docs/RESUMEN_CONFLICTOS_MIGRACION.md` - Resumen de conflictos
3. ✅ `docs/PLAN_DETALLADO_MIGRACION_SYSTEM_UI_PQNC_AI.md` - Plan completo
4. ✅ `docs/CAMBIOS_FRONTEND_MIGRACION.md` - Cambios en frontend
5. ✅ `scripts/comparar_tablas_conflictivas.sql` - Scripts de comparación
6. ✅ `scripts/migration/01_backup_system_ui.sql` - Backup
7. ✅ `scripts/migration/02_add_missing_columns.sql` - Agregar columnas
8. ✅ `scripts/migration/03_create_user_notifications_legacy.sql` - Crear tabla legacy
9. ✅ `scripts/migration/migrate-data.ts` - Script de migración de datos

---

## ⚠️ RIESGOS Y MITIGACIÓN

### Riesgos Altos
1. **Pérdida de datos** → Mitigado con backups completos
2. **Downtime** → Mitigado con migración incremental
3. **Dependencias rotas** → Mitigado con validación exhaustiva

### Plan de Rollback
- ✅ Backups completos disponibles
- ✅ system_ui se mantiene activo durante transición
- ✅ Cambio de variables de entorno permite rollback rápido

---

## ✅ CHECKLIST PRE-EJECUCIÓN

### Base de Datos
- [ ] Backup completo de system_ui ejecutado
- [ ] Backup completo de pqnc_ai ejecutado
- [ ] Scripts SQL revisados y aprobados
- [ ] Columnas faltantes agregadas
- [ ] Tabla `user_notifications_legacy` creada

### Frontend
- [ ] Plan de cambios revisado
- [ ] Archivos identificados
- [ ] Estrategia de migración definida

### Validación
- [ ] Plan de pruebas preparado
- [ ] Criterios de éxito definidos
- [ ] Plan de rollback documentado

---

## 🎯 PRÓXIMOS PASOS

1. **Revisar y aprobar** este plan completo
2. **Ejecutar backups** en ambas bases de datos
3. **Ejecutar scripts SQL** de preparación (Fase 1)
4. **Ejecutar migración de datos** (Fase 2)
5. **Actualizar frontend** (Fase 3)
6. **Validar y desplegar** (Fase 4 y 5)

---

**Última actualización:** 2025-01-13  
**Estado:** ✅ Plan completo, listo para ejecución
