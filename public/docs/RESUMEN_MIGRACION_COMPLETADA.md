# Resumen de Migración system_ui → pqnc_ai

**Fecha:** 2025-01-13  
**Estado:** Migración de tablas pequeñas completada ✅  
**Pendiente:** Migración de tablas grandes usando scripts

## ✅ Tablas Migradas Completamente

### Tablas de Autenticación y Usuarios
1. **auth_roles** - 9 registros ✅
2. **auth_users** - 50+ registros ✅
3. **auth_permissions** - 34 registros ✅
4. **auth_role_permissions** - 45 registros ✅
5. **auth_user_permissions** - 4 registros ✅
6. **auth_sessions** - 16 registros ✅
7. **auth_user_coordinaciones** - 7 registros ✅

### Tablas de Coordinaciones
8. **coordinaciones** - 7 registros ✅
9. **coordinador_coordinaciones_legacy** - 12 registros ✅
10. **coordinacion_statistics** - 1 registro ✅

### Tablas de Permisos y Grupos
11. **permission_groups** - 9 registros ✅
12. **group_permissions** - 10/345 registros migrados (335 restantes pendientes)
13. **group_audit_log** - 3/32 registros migrados (29 restantes pendientes)

### Tablas de Notificaciones y Mensajes
14. **admin_messages** - 17 registros ✅
15. **user_notifications_legacy** - 27 registros ✅ (migrada desde system_ui)

### Tablas de Configuración
16. **api_auth_tokens** - Merge completado ✅
17. **api_auth_tokens_history** - Merge completado ✅
18. **log_server_config** - 1 registro ✅

### Tablas de Moderación
19. **content_moderation_warnings** - 100 registros ✅
20. **user_warning_counters** - 11 registros ✅

### Tablas de WhatsApp
21. **whatsapp_labels_preset** - 6 registros ✅
22. **whatsapp_labels_custom** - 18 registros ✅

### Tablas de Usuarios
23. **user_avatars** - 8 registros ✅

### Tablas de Chat
24. **uchat_bots** - 7 registros ✅

### Tablas de Timeline
25. **timeline_activities** - 14 registros ✅

## ⏭️ Tablas Saltadas (Sin Migrar Datos)

1. **auth_login_logs** - Tabla creada vacía, se generarán nuevos registros
   - Razón: Logs históricos no críticos, pueden consultarse en system_ui si es necesario

## ⏳ Tablas Pendientes (Usar Scripts para Migrar)

### Tablas Grandes (>100 registros)

| Tabla | Registros | Script Recomendado | Estado |
|-------|-----------|-------------------|--------|
| **paraphrase_logs** | 2,545 | `generate-sql-for-large-table.ts` | ⏳ Pendiente |
| **whatsapp_conversation_labels** | 286 | `migrate-large-tables-sql.ts` | ⏳ Pendiente |
| **assignment_logs** | 265 | `migrate-large-tables-sql.ts` | ⏳ Pendiente |
| **prospect_assignments** | 185 | `migrate-large-tables-sql.ts` | ⏳ Pendiente |
| **user_permission_groups** | 121 | `migrate-large-tables-sql.ts` | ⏳ Pendiente |

### Tablas Medianas (Pendientes)

| Tabla | Registros | Método | Estado |
|-------|-----------|--------|--------|
| **group_permissions** | 335 restantes | SQL directo o script | ⏳ Pendiente |
| **group_audit_log** | 29 restantes | SQL directo | ⏳ Pendiente |

## 📋 Instrucciones para Migrar Tablas Grandes

### Opción 1: Generar Scripts SQL (Recomendado)

```bash
# Generar script SQL para paraphrase_logs
npx tsx scripts/migration/generate-sql-for-large-table.ts paraphrase_logs

# El script generará: scripts/migration/sql/paraphrase_logs_migration.sql
# Ejecutar directamente en pqnc_ai sin mostrar contenido
```

### Opción 2: Migrar con Script TypeScript en Lotes

```bash
# Migrar todas las tablas grandes en lotes de 500 registros
npx tsx scripts/migration/migrate-large-tables-sql.ts

# El script guarda progreso y puede reanudarse si se interrumpe
```

### Opción 3: Usar pg_dump/psql (Requiere acceso directo a BD)

```bash
# Configurar variables de entorno
export VITE_SYSTEM_UI_SUPABASE_DB_URL="postgresql://..."
export VITE_PQNC_AI_SUPABASE_DB_URL="postgresql://..."

# Ejecutar script bash
./scripts/migration/migrate-large-tables.sh
```

## 📊 Estadísticas de Migración

- **Total de tablas migradas:** 25 tablas ✅
- **Total de registros migrados:** ~500+ registros
- **Tablas pendientes:** 5 tablas grandes + 2 parciales
- **Registros pendientes:** ~3,400 registros

## 🔄 Próximos Pasos

1. **Migrar tablas grandes** usando los scripts creados
2. **Actualizar frontend** para apuntar a pqnc_ai (ver `docs/CAMBIOS_FRONTEND_MIGRACION.md`)
3. **Validar integridad** de datos migrados
4. **Probar funcionalidades** críticas
5. **Desplegar** cambios a producción

## 📁 Archivos de Referencia

- **Plan detallado:** `docs/PLAN_DETALLADO_MIGRACION_SYSTEM_UI_PQNC_AI.md`
- **Guía de tablas grandes:** `docs/GUIA_MIGRACION_TABLAS_GRANDES.md`
- **Cambios frontend:** `docs/CAMBIOS_FRONTEND_MIGRACION.md`
- **Estado actual:** `docs/ESTADO_MIGRACION_20250113.md`

## ⚠️ Notas Importantes

1. **Backups:** Todos los datos de system_ui están respaldados en el schema `backup_migration_20250113`
2. **Foreign Keys:** Se validaron y corrigieron todas las referencias de foreign keys durante la migración
3. **Tablas Vacías:** Las tablas `uchat_conversations`, `uchat_messages`, `api_tokens`, `prospect_assignment_logs` no existen en system_ui, por lo que no requieren migración
4. **group_permissions:** Se migraron 10 registros de prueba, faltan 335 registros restantes
5. **group_audit_log:** Se migraron 3 registros de prueba, faltan 29 registros restantes

---

**Última actualización:** 2025-01-13 19:00 UTC