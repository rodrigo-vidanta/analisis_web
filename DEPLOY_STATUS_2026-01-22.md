# Deploy Completado - v2.5.42

**Fecha:** 2026-01-22  
**Versión:** B10.1.42N2.5.42

---

## ✅ Deploy AWS Exitoso

### Frontend Actualizado
- **S3:** http://pqnc-qa-ai-frontend.s3-website.us-west-2.amazonaws.com
- **CloudFront:** https://d3m6zgat40u0u1.cloudfront.net
- **Cache invalidado:** ✅
- **Tiempo estimado propagación CloudFront:** 5-10 minutos

### Build Stats
```
dist/index-CwTNo_Jv.js: 9,161.03 kB │ gzip: 2,536.92 kB
Total archivos: 15
```

---

## ⚠️ Acción Pendiente: Actualizar BD

**IMPORTANTE:** Debes ejecutar manualmente en Supabase SQL Editor:

```sql
-- Proyecto: PQNC_AI (glsmifhkoaifvaegsozd)
-- SQL Editor: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql

UPDATE system_config
SET 
  config_value = 'B10.1.42N2.5.42',
  updated_at = NOW()
WHERE config_key = 'app_version';

-- Verificar
SELECT 
  config_key,
  config_value as version,
  updated_at
FROM system_config
WHERE config_key = 'app_version';
```

**Por qué manual:**
- La tabla `system_config` está en PQNC_AI
- Los MCPs actuales no tienen la función `exec_sql` configurada
- Se puede usar SQL Editor directamente (más rápido)

---

## 📋 Checklist Post-Deploy

### En Supabase Dashboard
- [ ] Ejecutar SQL de actualización de versión (ver arriba)
- [ ] Verificar que retorna `B10.1.42N2.5.42`

### En la Aplicación
- [ ] Hard refresh (Ctrl+Shift+R o Cmd+Shift+R)
- [ ] Verificar footer muestra `B10.1.42N2.5.42`
- [ ] Login como admin
- [ ] Ir a Administración > Usuarios
- [ ] Editar un usuario supervisor
- [ ] Verificar 3 dropdowns enriquecidos funcionan:
  - [ ] Selector de Rol
  - [ ] Selector de Coordinación
  - [ ] Selector de Grupos de Permisos
- [ ] Guardar cambios
- [ ] Verificar modal se cierra automáticamente
- [ ] Verificar toast de éxito aparece
- [ ] Verificar lista se refresca
- [ ] Editar un coordinador
- [ ] Asignar múltiples coordinaciones
- [ ] Verificar array vacío funciona (sin crashes)

---

## 🐛 Si Hay Problemas

### CloudFront muestra versión antigua
- Esperar 5-10 minutos
- Invalidar cache manualmente: `aws cloudfront create-invalidation --distribution-id E3XXXXXX --paths "/*"`

### Dropdowns no funcionan
- Ver consola del navegador
- Verificar no hay errores de "Rules of Hooks"
- Hard refresh (Ctrl+Shift+R)

### Modal no se cierra
- Verificar toast de éxito aparece
- Revisar logs en consola
- Verificar `onRefresh()` y `onClose()` se llaman

---

## 📚 Documentación

- **Fix Completo:** `docs/FIX_DROPDOWNS_ENRIQUECIDOS_2026-01-22.md`
- **Resumen:** `RESUMEN_CAMBIOS_2026-01-22_DROPDOWNS.md`
- **Versión:** `src/config/appVersion.ts`

---

**Deploy Status:** ✅ Frontend en AWS  
**BD Status:** ⚠️ Pendiente actualización manual  
**Próximo paso:** Ejecutar SQL en Supabase Dashboard
