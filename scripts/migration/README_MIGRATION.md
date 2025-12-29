# 🔄 SCRIPTS DE MIGRACIÓN

**Propósito:** Scripts para sincronización de datos entre tablas durante migraciones

---

## 📂 ARCHIVOS

### 1. `verify-and-sync-coordinaciones.ts`
**Descripción:** Script TypeScript para verificar y sincronizar datos entre `coordinador_coordinaciones` (legacy) y `auth_user_coordinaciones` (nueva)

**Uso:**
```bash
export VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY="<service_key>"
npx tsx scripts/migration/verify-and-sync-coordinaciones.ts
```

**Funciones:**
- Cuenta registros en ambas tablas
- Identifica registros faltantes
- Sincroniza datos automáticamente
- Genera reporte detallado
- Valida integridad

**Salida ejemplo:**
```
📊 PASO 1: Contando registros...
   Legacy: 14 registros
   Nueva:  8 registros
   
🔄 PASO 3: Sincronizando...
   ✅ 7 registros insertados

✅ Verificación final: 15 registros totales
```

---

### 2. `sync-coordinaciones-legacy-to-new.sql`
**Descripción:** Script SQL completo para migración manual en Supabase

**Secciones:**
1. Verificación de estado actual
2. Backup automático de tabla legacy
3. Migración de datos faltantes
4. Verificación post-migración
5. Análisis de integridad

**Uso:**
```sql
-- Ejecutar en Supabase SQL Editor
-- Base de datos: System_UI (zbylezfyagwrxoecioup)
```

---

## 📋 CONTEXTO: Por qué esta migración

### Problema Original
En Diciembre 2025 se creó `auth_user_coordinaciones` para mejorar nomenclatura, pero el código NO se migró completamente, resultando en:

- 2 tablas idénticas activas
- Escritura dual en 7 archivos
- Desincronización de datos (7 registros faltantes)
- Permisos incorrectos para usuarios

### Solución (29 Dic 2025)
- Sincronización completa de datos
- Migración de 7 archivos críticos
- Eliminación de escritura dual
- `auth_user_coordinaciones` como única fuente de verdad

**Ver:** `docs/POSTMORTEM_DUAL_TABLES.md` para análisis completo

---

## 🎯 RESULTADO

### Antes
```
Tabla Legacy: 14 registros
Tabla Nueva:  8 registros
Diferencia:   6 registros faltantes
Código:       Escritura dual (riesgo)
```

### Después
```
Tabla Legacy: DEPRECADA (conservada para rollback)
Tabla Nueva:  15 registros (sincronizados)
Código:       Solo usa tabla nueva
Estado:       Fuente única de verdad ✅
```

---

## ⚠️ IMPORTANTE

### Tabla Legacy NO Eliminada
La tabla `coordinador_coordinaciones` se conserva 30 días por:
- Rollback inmediato si hay problemas
- Código de limpieza mantiene compatibilidad
- Validación completa pendiente

### Plan de Deprecación
```sql
-- Después de 30 días exitosos:
ALTER TABLE coordinador_coordinaciones 
RENAME TO coordinador_coordinaciones_deprecated_20250128;

-- Después de 60 días:
DROP TABLE coordinador_coordinaciones_deprecated_20250128;
```

---

## 📚 DOCUMENTACIÓN RELACIONADA

- `docs/POSTMORTEM_DUAL_TABLES.md` - Historia completa del problema
- `docs/MIGRATION_COORDINADOR_COORDINACIONES.md` - Análisis de migración
- `docs/MIGRATION_COMPLETED_20251229.md` - Cambios realizados
- `docs/MIGRATION_SUMMARY_20251229.md` - Resumen ejecutivo
- `CHANGELOG.md` - Entrada del 29-12-2025

---

**Autor:** AI Assistant (Claude Sonnet 4.5)  
**Fecha:** 29 Diciembre 2025  
**Estado:** ✅ Migración completada - Pendiente validación

