# Setup del Sistema de Control de Versiones

**Fecha:** 22 de Enero 2026  
**Estado:** ✅ Configuración en BD completada

---

## ✅ Completado

1. ✅ Configuración creada en `system_config`:
   - `config_key`: `app_version`
   - `config_value`: `{"version": "2.5.39", "force_update": true}`
   - Versión actual del build: `2.5.39`

2. ✅ Código implementado:
   - Hook `useVersionCheck` con realtime subscription
   - Componente `ForceUpdateModal` 
   - Integración en `MainApp.tsx`
   - Script de actualización `scripts/update-app-version.ts`

---

## ⚠️ Pendiente: Habilitar Realtime

Para que el sistema detecte cambios inmediatos, necesitas habilitar realtime en Supabase:

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. Ve a: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/database/replication
2. Busca la tabla `system_config`
3. Activa el toggle de **"Enable Realtime"**
4. Guarda los cambios

### Opción 2: Desde SQL Editor

1. Ve a: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
2. Ejecuta este SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;
```

3. Verifica que está habilitado:

```sql
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'system_config';
```

Si retorna una fila, realtime está habilitado ✅

---

## 🧪 Prueba del Sistema

### 1. Verificar configuración actual

```sql
SELECT config_key, config_value, updated_at 
FROM system_config 
WHERE config_key = 'app_version';
```

Debería mostrar:
```
config_key: app_version
config_value: {"version": "2.5.39", "force_update": true}
```

### 2. Probar cambio de versión

```sql
-- Cambiar versión requerida a 2.5.40 (diferente a la actual)
UPDATE system_config 
SET config_value = '{"version": "2.5.40", "force_update": true}'::jsonb
WHERE config_key = 'app_version';
```

**Resultado esperado:**
- Si realtime está habilitado: Modal aparece inmediatamente en usuarios conectados
- Si realtime NO está habilitado: Modal aparece después de 30 segundos (polling fallback)

### 3. Restaurar versión actual

```sql
-- Restaurar a versión actual del build
UPDATE system_config 
SET config_value = '{"version": "2.5.39", "force_update": true}'::jsonb
WHERE config_key = 'app_version';
```

---

## 📋 Uso en Producción

### Después de cada deploy AWS

```bash
# 1. Obtener versión del package.json
VERSION=$(node -p "require('./package.json').version")

# 2. Actualizar versión requerida en BD
tsx scripts/update-app-version.ts $VERSION
```

O manualmente:
```bash
tsx scripts/update-app-version.ts 2.5.40
```

**⚠️ IMPORTANTE:** Ejecutar SOLO después de que el deploy AWS esté completo y la nueva versión esté disponible.

---

## 🔍 Verificación

### Ver versión actual del build (frontend)

```javascript
// En consola del navegador
console.log(import.meta.env.VITE_APP_VERSION);
// Debería mostrar: "2.5.39"
```

### Ver versión requerida (backend)

```sql
SELECT config_value->>'version' as required_version
FROM system_config 
WHERE config_key = 'app_version';
```

### Logs del hook

El hook imprime logs útiles en la consola del navegador:
- `[VersionCheck] Suscrito a cambios de versión (realtime)` ✅
- `[VersionCheck] Cambio detectado en versión requerida` ✅
- `[VersionCheck] Error en canal realtime, usando polling como fallback` ⚠️

---

## 📚 Archivos Relacionados

- [Documentación Completa](docs/VERSION_CONTROL_SYSTEM.md)
- [Script SQL](scripts/sql/enable_realtime_system_config.sql)
- [Script de Actualización](scripts/update-app-version.ts)
- [Hook useVersionCheck](src/hooks/useVersionCheck.ts)
- [Componente ForceUpdateModal](src/components/shared/ForceUpdateModal.tsx)

---

**Última actualización:** 22 de Enero 2026
