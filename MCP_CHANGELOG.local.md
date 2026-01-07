# MCP Changelog Local — NO SUBIR A GIT
# =====================================
# 
# Este archivo documenta TODOS los cambios realizados vía MCP
# para poder hacer rollback en caso de modificaciones incorrectas.
# 
# ⚠️ ARCHIVO LOCAL - Ignorado por .gitignore
# 
# Última actualización: 2025-01-06

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

