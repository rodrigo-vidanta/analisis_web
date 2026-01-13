# Guía para Migrar Tablas Grandes sin Saturar Contexto

**Fecha:** 2025-01-13  
**Problema:** Tablas con >100 registros saturan la ventana de contexto al migrar directamente

## 📊 Tablas Grandes Identificadas

| Tabla | Registros | Método Recomendado |
|-------|-----------|-------------------|
| `paraphrase_logs` | 2,545 | Script SQL generado |
| `whatsapp_conversation_labels` | 286 | Script TypeScript en lotes |
| `assignment_logs` | 265 | Script TypeScript en lotes |
| `prospect_assignments` | 185 | Script TypeScript en lotes |
| `user_permission_groups` | 121 | Script TypeScript en lotes |

## 🛠️ Opciones Disponibles

### Opción 1: Generar Scripts SQL (Recomendado)

**Ventajas:**
- No requiere conexión directa durante ejecución
- Puede ejecutarse en cualquier momento
- Fácil de revisar y validar antes de ejecutar

**Uso:**
```bash
# Generar scripts SQL para todas las tablas grandes
npx tsx scripts/migration/generate-sql-for-large-table.ts

# Los scripts se guardan en: scripts/migration/generated-sql/
# Ejecutar cada script directamente en pqnc_ai usando psql o cliente SQL
```

**Ejemplo:**
```bash
# Desde terminal con psql
psql "postgresql://user:pass@host:port/db" -f scripts/migration/generated-sql/migrate_paraphrase_logs.sql
```

### Opción 2: Script TypeScript en Lotes

**Ventajas:**
- Migración automática en lotes
- Guarda progreso automáticamente
- Puede reanudarse si falla

**Uso:**
```bash
# Configurar variables de entorno primero
export VITE_SYSTEM_UI_SUPABASE_URL="..."
export VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY="..."
export VITE_PQNC_AI_SUPABASE_URL="..."
export VITE_PQNC_AI_SUPABASE_SERVICE_KEY="..."

# Ejecutar migración
npx tsx scripts/migration/migrate-large-tables-sql.ts
```

**Progreso guardado en:** `scripts/migration/migration-progress.json`

### Opción 3: Script Bash con pg_dump/psql

**Ventajas:**
- Más rápido para tablas muy grandes
- Usa herramientas nativas de PostgreSQL

**Requisitos:**
- Acceso directo a ambas bases de datos
- `pg_dump` y `psql` instalados

**Uso:**
```bash
# Configurar variables de entorno
export VITE_SYSTEM_UI_SUPABASE_DB_URL="postgresql://..."
export VITE_PQNC_AI_SUPABASE_DB_URL="postgresql://..."

# Ejecutar script
./scripts/migration/migrate-large-tables.sh
```

## 📝 Pasos Recomendados

### Para `paraphrase_logs` (2,545 registros):

1. **Generar script SQL:**
   ```bash
   npx tsx scripts/migration/generate-sql-for-large-table.ts
   ```

2. **Revisar script generado:**
   ```bash
   head -50 scripts/migration/generated-sql/migrate_paraphrase_logs.sql
   ```

3. **Ejecutar script en pqnc_ai:**
   - Usar cliente SQL de Supabase Dashboard
   - O usar `psql` desde terminal
   - O usar MCP `pqnc_execute_sql` ejecutando el archivo completo

### Para tablas medianas (100-300 registros):

Usar **Opción 2** (Script TypeScript en lotes) que es más automático y guarda progreso.

## ⚠️ Consideraciones

1. **Foreign Keys:** Asegurarse de que las tablas referenciadas ya estén migradas
2. **Índices:** Los scripts SQL generados no incluyen índices, crearlos después si es necesario
3. **Validación:** Después de migrar, validar conteo de registros:
   ```sql
   SELECT COUNT(*) FROM paraphrase_logs; -- En pqnc_ai
   SELECT COUNT(*) FROM paraphrase_logs; -- En system_ui (debe coincidir)
   ```

## 🔄 Orden de Migración Recomendado

1. ✅ Tablas pequeñas (<100 registros) - Migradas directamente
2. ⏳ Tablas medianas (100-300 registros) - Usar Script TypeScript en lotes
3. ⏳ Tablas grandes (>1000 registros) - Usar Script SQL generado

## 📁 Archivos Creados

- `scripts/migration/generate-sql-for-large-table.ts` - Genera scripts SQL
- `scripts/migration/migrate-large-tables-sql.ts` - Migra en lotes con TypeScript
- `scripts/migration/migrate-large-tables.sh` - Script bash con pg_dump/psql
- `scripts/migration/generated-sql/` - Directorio para scripts SQL generados
- `scripts/migration/migration-progress.json` - Progreso de migración (auto-generado)
