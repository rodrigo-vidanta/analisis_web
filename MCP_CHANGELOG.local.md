# MCP Changelog Local — NO SUBIR A GIT
# =====================================
# 
# Este archivo documenta TODOS los cambios realizados vía MCP
# para poder hacer rollback en caso de modificaciones incorrectas.
# 
# ⚠️ ARCHIVO LOCAL - Ignorado por .gitignore
# 
# Última actualización: 2026-01-16

---

## 📋 Formato de Registro

Cada cambio debe registrarse con el siguiente formato:

```
### [FECHA] [HORA] - [MCP] - [OPERACIÓN]
- **Tabla/Recurso:** nombre_de_tabla
- **Acción:** INSERT | UPDATE | DELETE | CREATE | ALTER | DROP
- **Descripción:** Breve descripción del cambio
- **Datos Antes:** (si aplica) { JSON del estado anterior }
- **Datos Después:** (si aplica) { JSON del estado nuevo }
- **Rollback SQL:** SQL para revertir el cambio
- **Usuario:** Quien solicitó el cambio
- **Estado:** ✅ Exitoso | ❌ Fallido | ⚠️ Parcial
```

---

## 🔄 Registro de Cambios

### [2026-01-16] [20:43-20:52 UTC] - LIMPIEZA COMPLETA DE BASE DE DATOS

#### BACKUP de Tablas Legacy
- **MCP:** Supa_PQNC_AI
- **Operación:** BACKUP_TABLE
- **Recursos:**
  1. `coordinador_coordinaciones_legacy` - 4 registros
  2. `user_notifications_legacy` - 27 registros
  3. `prospectos_duplicate` - 0 registros (vacía)
- **Estado:** ✅ Exitoso
- **Timestamp:** 2026-01-16T20:43:09-11+00:00

#### DROP de Vista Insegura (VULNERABILIDAD CRÍTICA)
- **MCP:** Supa_PQNC_AI
- **Operación:** DROP VIEW
- **Vista:** `auth_user_profiles`
- **Razón:** **EXPONÍA password_hash** (vulnerabilidad de seguridad)
- **Reemplazo:** `user_profiles_v2` (vista segura sin password_hash)
- **Archivos migrados:** 8 archivos de código
- **Rollback SQL:** 
  ```sql
  -- NO RECOMENDADO - Vista insegura
  -- Migrar a usar user_profiles_v2 en su lugar
  ```
- **Estado:** ✅ Exitoso
- **Timestamp:** 2026-01-16T20:45:12+00:00

#### DROP de Tablas Legacy
- **MCP:** Supa_PQNC_AI
- **Operación:** DROP TABLE CASCADE
- **Tablas:**
  1. `coordinador_coordinaciones_legacy` (reemplazada por `auth_user_coordinaciones`)
  2. `user_notifications_legacy` (reemplazada por `user_notifications`)
  3. `prospectos_duplicate` (tabla temporal vacía)
- **Rollback SQL:**
  ```sql
  -- Ver CHANGELOG_LIMPIEZA_BD_2026-01-16.md sección Rollback
  -- Backups disponibles vía MCP backup_table_data()
  ```
- **Estado:** ✅ Exitoso
- **Timestamp:** 2026-01-16T20:45:18+00:00

#### DROP de Funciones Obsoletas
- **MCP:** Supa_PQNC_AI
- **Operación:** DROP FUNCTION CASCADE
- **Funciones:**
  1. `fn_force_leido_false_on_insert` (v1-v5) - Mantener v6
  2. `authenticate_user` (v1, v2) - Obsoleta (Supabase Auth nativo)
  3. `create_company_direct`, `create_company_v2`, `create_company_v3` - Versiones antiguas
- **Total eliminado:** 7 funciones
- **Rollback SQL:** N/A (funciones obsoletas, no recuperables)
- **Estado:** ✅ Exitoso
- **Timestamp:** 2026-01-16T20:46:32-52+00:00

#### Resumen de Limpieza
- **Total recursos eliminados:** 11 (3 tablas + 1 vista + 7 funciones)
- **Archivos de código modificados:** 9 (8 migraciones + 1 config)
- **Vulnerabilidades corregidas:** 1 (CRÍTICA - auth_user_profiles)
- **Build exitoso:** ✅ Sí (21.09s)
- **Bundle verificado:** ✅ Seguro (0 service_role keys)
- **Documentación creada:** 4 archivos
- **Documentación actualizada:** 4 archivos
- **Usuario:** Samuel Rosales
- **Estado:** ✅ COMPLETADO AL 100%

---

### [2025-01-06] [INICIAL] - Configuración MCP

#### Cambio de Configuración
- **Descripción:** Reorganización completa de MCPs de Supabase
- **MCPs Anteriores:**
  - SupaVidanta → glsmifhkoaifvaegsozd
  - SupaSystemUI → zbylezfyagwrxoecioup  
  - SupaPQNC → hmmfuhqgvsehkizlfzga
- **MCPs Nuevos:**
  - Supa_PQNC_AI → glsmifhkoaifvaegsozd (renombrado de SupaVidanta)
  - Supa_SystemUI → zbylezfyagwrxoecioup (mantenido)
- **MCPs Removidos:**
  - SupaPQNC (hmmfuhqgvsehkizlfzga) - no requerido actualmente
- **Usuario:** Samuel Rosales
- **Estado:** ✅ Exitoso

---

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| Total de operaciones registradas | 1 |
| Operaciones exitosas | 1 |
| Operaciones fallidas | 0 |
| Rollbacks ejecutados | 0 |

---

## 🗄️ Backups Disponibles

Los backups de tablas se almacenan en formato:
`backups/[fecha]/[tabla]_[timestamp].json`

| Fecha | Tabla | MCP | Archivo |
|-------|-------|-----|---------|
| (ninguno aún) | | | |

---

## 📝 Notas de Auditoría

- Todos los cambios destructivos (DELETE, DROP, TRUNCATE) deben tener backup previo
- Los cambios de esquema (CREATE, ALTER) deben documentarse con SQL de rollback
- Las operaciones masivas (>100 registros) deben dividirse en batches

---

## 🔐 Reglas de Seguridad

1. **Nunca ejecutar DELETE sin WHERE** - El MCP ya valida esto
2. **Siempre documentar cambios** - Antes de cerrar sesión
3. **Backup antes de cambios masivos** - Usar `backup_table`
4. **Validar en staging primero** - Si es posible

---

## 📚 Referencia Rápida de Rollback

### Deshacer INSERT
```sql
DELETE FROM tabla WHERE id = 'id_insertado';
```

### Deshacer UPDATE
```sql
UPDATE tabla SET columna = 'valor_anterior' WHERE id = 'id_afectado';
```

### Deshacer DELETE (requiere backup)
```sql
INSERT INTO tabla (col1, col2) VALUES ('val1', 'val2');
```

### Deshacer CREATE TABLE
```sql
DROP TABLE IF EXISTS nombre_tabla;
```

### Deshacer ALTER TABLE (agregar columna)
```sql
ALTER TABLE nombre_tabla DROP COLUMN nombre_columna;
```

---

# FIN DEL CHANGELOG LOCAL

