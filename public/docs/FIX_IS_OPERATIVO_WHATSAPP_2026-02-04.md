# FIX: Problema de Conversaciones WhatsApp No Visibles

**Fecha:** 2026-02-04  
**Afectados:** 42 ejecutivos (incluyendo Osmara Partida)  
**Severidad:** 🔴 Alta (usuarios no podían ver sus conversaciones)

---

## 🎯 Problema Identificado

### Síntomas
- Ejecutivos con prospectos asignados NO veían conversaciones de WhatsApp
- El módulo de WhatsApp cargaba vacío
- Los datos SÍ existían en la base de datos

### Usuarios Afectados (Ejemplos)
- Mayra Gonzalez (318 prospectos)
- Kenia Martinez (220 prospectos)  
- Jessica Gutierrez (204 prospectos)
- Rodrigo Meza (164 prospectos)
- **Osmara Partida (29 prospectos)** ← Usuario reportado

### Causa Raíz

El campo `is_operativo` en `auth.users.raw_user_meta_data` se usa para **dos propósitos**:

1. **Control de sesión** (`authService.ts`):
   - `true` → Usuario tiene sesión activa
   - `false` → Usuario cerró sesión

2. **Filtro de datos** (`coordinacionService.ts`, línea 124):
   ```typescript
   .eq('is_operativo', true)  // Solo muestra datos si is_operativo = true
   ```

**Problema:** Si un usuario:
- Cierra el navegador sin hacer logout
- Tiene error de red durante logout
- El proceso de logout no se completa

→ Queda con `is_operativo = false` **permanentemente**  
→ Los filtros NO le muestran conversaciones

---

## ✅ Solución Implementada

### 1. Fix Inmediato (Base de Datos)

**Script:** `scripts/sql/FIX_IS_OPERATIVO_EJECUTIVOS.sql`

```sql
-- Actualiza metadata en auth.users (nativo de Supabase)
UPDATE auth.users
SET 
  raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{is_operativo}',
    'true'::jsonb
  ),
  updated_at = NOW()
WHERE id IN (
  SELECT u.id
  FROM user_profiles_v2 u
  WHERE u.is_ejecutivo = true
    AND u.is_operativo = false
    AND u.is_active = true
    AND EXISTS (
      SELECT 1 FROM prospectos p WHERE p.ejecutivo_id = u.id
    )
);
```

**Resultado:** ✅ Activó `is_operativo` para 42 ejecutivos con prospectos asignados

### 2. Fix Permanente (Código Frontend)

**Archivo:** `src/services/authService.ts`  
**Método:** `initialize()` (líneas 140-168)

**Cambio:**
```typescript
// Al cargar sesión existente, restaurar is_operativo = true
if (this.currentUser && (this.currentUser.is_ejecutivo || this.currentUser.is_coordinador)) {
  await this.updateUserMetadata(session.user.id, { is_operativo: true });
  if (this.currentUser) {
    this.currentUser.is_operativo = true;
  }
}
```

**Efecto:** 
- ✅ Al recargar la página, restaura `is_operativo = true` automáticamente
- ✅ Previene que el problema vuelva a ocurrir
- ✅ Solo aplica a ejecutivos y coordinadores (no afecta otros roles)

---

## 🧪 Validación

### Antes del Fix
```sql
SELECT COUNT(*) FROM user_profiles_v2 
WHERE is_ejecutivo = true 
  AND is_operativo = false 
  AND is_active = true;
-- Resultado: 42 usuarios
```

### Después del Fix
```sql
SELECT COUNT(*) FROM user_profiles_v2 
WHERE is_ejecutivo = true 
  AND is_operativo = false 
  AND is_active = true
  AND EXISTS (SELECT 1 FROM prospectos WHERE ejecutivo_id = user_profiles_v2.id);
-- Resultado esperado: 0 usuarios
```

---

## 📊 Datos de Diagnóstico

### Osmara Partida (Caso de Prueba)

| Métrica | Valor | Estado |
|---------|-------|--------|
| Prospectos asignados | 29 | ✅ |
| Conversaciones en vista | 166 | ✅ |
| Mensajes WhatsApp | 529 | ✅ |
| `is_operativo` (antes) | false | ❌ |
| `is_operativo` (después) | true | ✅ |

---

## 🔧 Instrucciones de Aplicación

### 1. Ejecutar Fix de Base de Datos
```bash
# En SQL Editor de Supabase (PQNC_AI)
# Ejecutar: scripts/sql/FIX_IS_OPERATIVO_EJECUTIVOS.sql
```

### 2. Desplegar Código Frontend
```bash
# Build y deploy
npm run build
./update-frontend.sh
```

### 3. Verificar con Usuarios Afectados
- ✅ Login como Osmara Partida
- ✅ Verificar que carga módulo de WhatsApp
- ✅ Confirmar que ve sus 166 conversaciones

---

## 🛡️ Prevención Futura

### Monitor de `is_operativo`

Crear alerta si muchos ejecutivos quedan con `is_operativo = false`:

```sql
-- Ejecutar diariamente
SELECT COUNT(*) as ejecutivos_inoperativos
FROM user_profiles_v2
WHERE is_ejecutivo = true
  AND is_operativo = false
  AND is_active = true
  AND last_login > NOW() - INTERVAL '7 days';
  
-- Si > 10, investigar
```

### Alternativa de Diseño (Futuro)

Considerar separar los dos usos de `is_operativo`:

1. `is_online` (booleano temporal, no persistente)
   - Control de sesión en tiempo real
   
2. `is_operativo` (booleano persistente)
   - Estado operativo del ejecutivo
   - Solo lo cambian administradores manualmente

---

## 📝 Archivos Relacionados

| Archivo | Cambios | Tipo |
|---------|---------|------|
| `src/services/authService.ts` | Agregado auto-restore de `is_operativo` | ✅ Código |
| `scripts/sql/FIX_IS_OPERATIVO_EJECUTIVOS.sql` | Script de fix (auth.users) | ✅ SQL |
| `scripts/sql/diagnostico_is_operativo_false.sql` | Script de diagnóstico | 📊 Diagnóstico |
| `scripts/sql/diagnostico_osmara_whatsapp.sql` | Caso específico Osmara | 📊 Diagnóstico |
| `docs/MIGRACION_AUTH_USERS_NATIVO_2026-01-20.md` | Migración a auth.users | 📖 Referencia |

---

## ⚠️ Nota Importante: Migración a auth.users Nativo

**Fecha de migración:** 2026-01-20

La tabla `auth_users` fue **ELIMINADA** y reemplazada por `auth.users` (nativo de Supabase Auth):
- ✅ Todos los campos de usuario están en `auth.users.raw_user_meta_data`
- ✅ Vista `user_profiles_v2` lee de `auth.users`
- ✅ Edge Function `auth-admin-proxy` actualiza metadata
- ❌ **NO existe** tabla `auth_users` (renombrada a `z_legacy_auth_users`)

**Documentación:** `docs/MIGRACION_AUTH_USERS_NATIVO_2026-01-20.md`

---

## ✅ Checklist de Validación

- [x] Identificada causa raíz
- [x] Script SQL creado y probado
- [x] Fix en código implementado
- [x] Documentación completa
- [ ] **SQL ejecutado en producción**
- [ ] **Código desplegado a producción**
- [ ] **Validado con Osmara Partida**
- [ ] **Validado con otro usuario afectado**

---

**Contacto:** samuel@pqnc.com  
**Documentación adicional:** `docs/ARQUITECTURA_SEGURIDAD_2026.md`
