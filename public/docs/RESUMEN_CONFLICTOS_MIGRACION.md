# Resumen de Conflictos - Migración system_ui → pqnc_ai

## 🔴 CONFLICTOS CRÍTICOS

### Tablas con Nombres Duplicados (5 tablas)

| Tabla | Estado | Acción |
|-------|--------|--------|
| `admin_messages` | ✅ Idénticas | MERGE directo |
| `api_auth_tokens` | ⚠️ Diferentes columnas | MERGE con expansión |
| `api_auth_tokens_history` | ⚠️ Diferentes columnas | MERGE con expansión |
| `content_moderation_warnings` | ✅ Idénticas | MERGE directo |
| `user_notifications` | 🔴 Muy diferentes | Requiere decisión |

---

## 📊 ESTADÍSTICAS

### Tablas
- **system_ui:** 40 tablas + 7 vistas
- **pqnc_ai:** 30 tablas + 6 vistas
- **Conflictos:** 5 tablas
- **A migrar:** 35 tablas sin conflictos

### Triggers
- **system_ui:** 18 triggers
- **pqnc_ai:** 35 triggers
- **Conflictos potenciales:** 2 triggers (`update_admin_messages_updated_at`, `update_user_notifications_updated_at`)

### Funciones SQL
- **system_ui:** 87 funciones
- **pqnc_ai:** 200+ funciones
- **A migrar:** ~50-60 funciones críticas (verificar duplicados)

### Edge Functions
- **Total:** 5 funciones compartidas
- **Acción:** ✅ NO requieren migración (ya están en repo)

---

## ⚠️ DECISIONES REQUERIDAS

### 1. `user_notifications` - ESTRUCTURA

**system_ui (18 columnas):**
```sql
- notification_type, module, message_id, conversation_id, call_id
- prospect_id, customer_name, customer_phone, message_preview
- call_status, is_muted, updated_at
```

**pqnc_ai (11 columnas):**
```sql
- type, title, message, metadata, clicked, expires_at
```

**Opciones:**
- **Opción A:** Expandir pqnc_ai con todas las columnas de system_ui (recomendado)
- **Opción B:** Migrar solo datos compatibles (pérdida de información)

### 2. `api_auth_tokens` - COLUMNAS FALTANTES

**Columnas en system_ui que faltan en pqnc_ai:**
- `expires_at` (timestamp)
- `ip_address` (text)
- `user_agent` (text)

**Acción:** Agregar estas columnas a pqnc_ai antes de migrar

### 3. `api_auth_tokens_history` - COLUMNAS FALTANTES

**Columnas en system_ui que faltan en pqnc_ai:**
- `is_active` (boolean)
- `ip_address` (text)
- `user_agent` (text)

**Acción:** Agregar estas columnas a pqnc_ai antes de migrar

---

## ✅ TABLAS SIN CONFLICTOS (35 tablas)

### Autenticación (9 tablas)
- `auth_users`, `auth_roles`, `auth_permissions`, `auth_role_permissions`
- `auth_user_permissions`, `auth_sessions`, `auth_login_logs`
- `auth_user_coordinaciones`, `auth_user_profiles` (VIEW)

### Coordinaciones (3 tablas)
- `coordinaciones`, `coordinacion_statistics`, `coordinador_coordinaciones_legacy`

### Permisos (4 tablas)
- `permission_groups`, `group_permissions`, `user_permission_groups`, `group_audit_log`

### Asignaciones (3 tablas)
- `prospect_assignments`, `prospect_assignment_logs`, `assignment_logs`

### Otros (16 tablas)
- `api_tokens`, `log_server_config`, `aws_diagram_configs`
- `bot_pause_status`, `uchat_bots`, `uchat_conversations`, `uchat_messages`
- `user_avatars`, `user_warning_counters`, `user_warning_counts` (VIEW)
- `user_paraphrase_stats` (VIEW), `paraphrase_logs`, `timeline_activities`
- `whatsapp_conversation_labels`, `whatsapp_labels_custom`, `whatsapp_labels_preset`
- `v_user_login_summary` (VIEW)

---

## 🚀 PRÓXIMOS PASOS

1. **Revisar y aprobar** decisiones sobre tablas conflictivas
2. **Crear scripts SQL** para comparar estructuras exactas
3. **Crear scripts de migración** por fases
4. **Probar en desarrollo** antes de producción
5. **Documentar proceso** completo de migración

---

**Ver análisis completo:** `docs/ANALISIS_MIGRACION_SYSTEM_UI_A_PQNC_AI.md`
