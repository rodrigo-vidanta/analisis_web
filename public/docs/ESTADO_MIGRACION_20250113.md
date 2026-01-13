# Estado de Migración system_ui → pqnc_ai

**Fecha:** 2025-01-13  
**Última actualización:** 2025-01-13 18:35 UTC

## ✅ Tablas Migradas Completamente

1. **auth_roles** - 9 registros ✅
2. **auth_users** - 50+ registros ✅
3. **auth_permissions** - 34 registros ✅
4. **auth_role_permissions** - 45 registros ✅
5. **auth_user_permissions** - 4 registros ✅
6. **auth_sessions** - 16 registros ✅
7. **coordinaciones** - 7 registros ✅
8. **auth_user_coordinaciones** - 7 registros ✅
9. **admin_messages** - 17 registros ✅
10. **content_moderation_warnings** - 100 registros ✅
11. **permission_groups** - 9 registros ✅

## 🔄 Tablas en Progreso

1. **group_permissions** - 10/345 registros migrados (335 restantes)
   - INSERT SQL generado desde system_ui
   - Ejecutar script completo para migrar los 335 registros restantes

## ⏭️ Tablas Saltadas (Sin Migrar Datos)

1. **auth_login_logs** - Tabla creada vacía, se generarán nuevos registros
   - Razón: Logs históricos no críticos, auditoría disponible en system_ui

## ⏳ Tablas Pendientes

1. **user_permission_groups**
2. **group_audit_log**
3. **user_warning_counters**
4. **user_avatars**
5. **coordinador_coordinaciones_legacy**
6. **coordinacion_statistics**
7. **prospect_assignment_logs**
8. **prospect_assignments**
9. **assignment_logs**
10. **timeline_activities**
11. **uchat_bots**
12. **uchat_conversations**
13. **uchat_messages**
14. **whatsapp_conversation_labels**
15. **whatsapp_labels_custom**
16. **whatsapp_labels_preset**
17. **log_server_config**
18. **paraphrase_logs**
19. **api_tokens**

## 📝 Notas

- El INSERT SQL completo para `group_permissions` fue generado desde system_ui pero es demasiado largo para ejecutar directamente
- Se recomienda usar el script TypeScript `migrate-group-permissions-batch.ts` o ejecutar el INSERT SQL en lotes más pequeños
- Todas las tablas migradas tienen validación de foreign keys y manejo de conflictos con `ON CONFLICT`

## 🚀 Próximos Pasos

1. Completar migración de `group_permissions` (335 registros restantes)
2. Migrar tablas pendientes en orden de dependencias
3. Actualizar frontend para usar pqnc_ai en lugar de system_ui
4. Validar integridad de datos migrados
5. Probar funcionalidades críticas
