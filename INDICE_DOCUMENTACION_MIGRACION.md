# Índice Maestro: Documentación de Migración

**Migración:** System_UI → PQNC_AI  
**Fecha:** 13 de Enero 2025  
**Estado:** COMPLETADA

---

## 📚 Documentación Principal

### 1. [DOCUMENTACIÓN MAESTRA](docs/MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md)
Documento definitivo con TODO el proceso de migración de principio a fin.

**Contenido:**
- Resumen ejecutivo
- Contexto y motivación
- Arquitectura antes vs después
- Proceso completo paso a paso
- Tablas migradas (37)
- Funciones y triggers (23)
- Cambios en frontend (21 archivos)
- Problemas y soluciones (16 errores)
- Optimizaciones implementadas
- Testing y validación
- Rollback plan

---

## 📋 Documentos de Planificación

### 2. [Análisis Inicial](docs/ANALISIS_MIGRACION_SYSTEM_UI_A_PQNC_AI.md)
Análisis de conflictos, triggers y Edge Functions antes de la migración.

### 3. [Resumen de Conflictos](docs/RESUMEN_CONFLICTOS_MIGRACION.md)
Identificación de 5 tablas con mismo nombre y estrategias de resolución.

### 4. [Plan Detallado](docs/PLAN_DETALLADO_MIGRACION_SYSTEM_UI_PQNC_AI.md)
Plan paso a paso para la migración completa.

### 5. [Análisis Triggers y Funciones](docs/ANALISIS_TRIGGERS_FUNCIONES_MIGRACION.md)
Análisis de triggers, funciones RPC y Edge Functions.

### 6. [Plan Triggers y Funciones](docs/PLAN_MIGRACION_TRIGGERS_FUNCIONES.md)
Plan de migración de triggers y funciones RPC.

---

## 🔧 Documentos de Ejecución

### 7. [Estado de Migración](docs/ESTADO_MIGRACION_20250113.md)
Estado durante la ejecución de la migración.

### 8. [Guía Tablas Grandes](docs/GUIA_MIGRACION_TABLAS_GRANDES.md)
Estrategias para migrar tablas con +2,000 registros.

### 9. [Guía Conexión BDs](docs/GUIA_CONEXION_BASES_DATOS.md)
Uso de postgres_fdw para conectar ambas BDs.

---

## ✅ Documentos de Verificación

### 10. [Reporte de Verificación Completa](docs/REPORTE_VERIFICACION_COMPLETA_MIGRACION.md)
Verificación exhaustiva post-migración: conteos, FKs, duplicados, NULLs.

### 11. [Resumen Triggers y Funciones](docs/RESUMEN_MIGRACION_TRIGGERS_FUNCIONES.md)
Confirmación de migración de 4 triggers y 18 funciones RPC.

### 12. [Problemas Resueltos Frontend](docs/PROBLEMAS_RESUELTOS_MIGRACION_FRONTEND.md)
Problemas encontrados durante testing del frontend y sus soluciones.

---

## ⚡ Documentos de Optimización

### 13. [Plan Optimizaciones JOINs](docs/PLAN_OPTIMIZACIONES_JOINS.md)
Oportunidades de optimización con JOINs directos ahora que todo está unificado.

### 14. [Optimizaciones Post-Migración](docs/OPTIMIZACIONES_POST_MIGRACION.md)
Optimizaciones generales posibles con BD unificada.

### 15. [Reporte de Optimizaciones](docs/REPORTE_OPTIMIZACIONES_BD_UNIFICADA.md)
Análisis exhaustivo de 98 archivos con oportunidades de optimización.

### 16. [Fix ERR_INSUFFICIENT_RESOURCES](docs/FIX_ERR_INSUFFICIENT_RESOURCES.md)
Solución al problema de saturación de requests HTTP.

---

## 🏗️ Documentos de Arquitectura

### 17. [Nueva Arquitectura BD Unificada](docs/NUEVA_ARQUITECTURA_BD_UNIFICADA.md)
Descripción de la arquitectura actual con BD unificada.

### 18. [Cambios Frontend Migración](docs/CAMBIOS_FRONTEND_MIGRACION.md)
Listado de cambios necesarios en el frontend.

---

## 📝 Scripts de Migración

### Base de Datos (20 scripts SQL)

1. `scripts/migration/01_backup_system_ui.sql` - Backup completo
2. `scripts/migration/02_add_missing_columns.sql` - Columnas faltantes
3. `scripts/migration/03_create_user_notifications_legacy.sql` - Tabla legacy
4. `scripts/migration/04_migrate_user_notifications_data.sql` - Datos legacy
5. `scripts/migration/05_merge_api_auth_tokens.sql` - Merge tokens
6. `scripts/migration/06_migrate_admin_messages.sql` - Mensajes admin
7. `scripts/migration/07_migrate_content_moderation_warnings.sql` - Warnings
8. `scripts/migration/08_migrate_remaining_tables.sql` - Tablas restantes
9. `scripts/migration/09_migrate_auth_login_logs.sql` - Logs de login
10. `scripts/migration/10_migrate_group_permissions.sql` - Permisos de grupos
11. `scripts/migration/12_setup_database_connection.sql` - Conexión postgres_fdw
12. `scripts/migration/15_migrate_with_foreign_tables.sql` - Tablas grandes
13. `scripts/migration/17_verificacion_completa_final.sql` - Verificación
14. `scripts/migration/18_migrate_triggers_safe.sql` - Triggers
15. `scripts/migration/19_migrate_functions_rpc_safe.sql` - Funciones RPC
16. `scripts/migration/20_create_system_config_tables.sql` - Configuración
17. `scripts/optimizaciones/crear_vistas_optimizadas.sql` - Vistas

---

## 📖 Guías e Instrucciones

### 19. [Instrucciones ENV Migration](INSTRUCCIONES_ENV_MIGRATION.md)
Paso a paso para actualizar .env.local

### 20. [Migración Completada README](MIGRACION_COMPLETADA_README.md)
Guía rápida del estado final

### 21. [Estado Final](ESTADO_FINAL_MIGRACION.md)
Estado técnico al finalizar

### 22. [Resumen Estado Frontend](RESUMEN_ESTADO_MIGRACION_FRONTEND.md)
Estado del frontend post-migración

---

## 🔍 Documentos de Troubleshooting

### 23. [Errores Pendientes](ERRORES_PENDIENTES_MIGRACION.md)
Errores encontrados durante migración

### 24. [Lista Errores Restantes](LISTA_ERRORES_RESTANTES.md)
Errores pendientes de corrección

### 25. [Resumen Errores Finales](RESUMEN_ERRORES_FINALES.md)
Estado final de errores corregidos

---

## 🎯 Referencias Rápidas

### Para Desarrolladores

**¿Dónde consultar usuarios?**
```typescript
import { supabaseSystemUI } from '../config/supabaseSystemUI';
// o
import { analysisSupabase } from '../config/analysisSupabase';

// Ambos apuntan a PQNC_AI (glsmifhkoaifvaegsozd)
```

**¿Dónde consultar prospectos?**
```typescript
import { analysisSupabase } from '../config/analysisSupabase';
const { data } = await analysisSupabase.from('prospectos').select('*');
```

**¿Llamar Edge Function?**
```typescript
const url = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/send-img-proxy`;
// Apunta a system_ui (zbylezfyagwrxoecioup) donde están desplegadas
```

---

### Para Testing

**Verificar BD correcta:**
```sql
SELECT current_database(), current_user;
-- Debe retornar: postgres, postgres
-- Proyecto: glsmifhkoaifvaegsozd
```

**Contar tablas migradas:**
```sql
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'auth_%' OR table_name LIKE 'user_%';
```

---

### Para Rollback

**Ver:** Sección "Rollback Plan" en [Documentación Maestra](docs/MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md)

**Tiempo estimado:** 5 minutos  
**Complejidad:** Baja (solo revertir .env.local)

---

## 📊 Métricas de la Migración

- **Duración total:** 6.5 horas
- **Tablas migradas:** 37
- **Registros migrados:** ~8,500
- **Usuarios migrados:** 125
- **Funciones RPC:** 19
- **Triggers:** 4
- **Vistas creadas:** 5
- **Archivos modificados:** 21
- **Errores corregidos:** 16
- **Scripts generados:** 20

---

## 🔄 Versionamiento

- **Versión pre-migración:** v2.1.x
- **Versión post-migración:** v2.2.0
- **Fecha de cambio:** 13 de Enero 2025

---

**Mantenido por:** AI Division - Samuel Rosales  
**Última actualización:** 13 de Enero 2025
