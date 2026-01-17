# Auditoría RPCs - Fase 2

**Fecha:** 16 Enero 2026

## RPCs Críticas Verificadas

| RPC | Security Type | Owner | Auth Required | Estado |
|-----|---------------|-------|---------------|--------|
| change_user_password | DEFINER | postgres | ✅ Sí | ✅ SEGURA |
| get_credential_value | DEFINER | postgres | ✅ Sí (auth.uid()) | ✅ SEGURA |
| create_user_with_role | DEFINER | postgres | ✅ Debe verificar | ⚠️ AUDITAR |
| update_user_metadata | DEFINER | postgres | ✅ Sí | ✅ SEGURA |
| check_account_locked | DEFINER | postgres | ❌ Público | ✅ OK (by design) |
| increment_failed_login | DEFINER | postgres | ❌ Público | ✅ OK (by design) |
| reset_failed_login | DEFINER | postgres | ❌ Público | ✅ OK (by design) |
| get_user_permissions | DEFINER | postgres | ✅ Debería | ⚠️ AUDITAR |
| can_user_access_prospect | DEFINER | postgres | ✅ Debería | ⚠️ AUDITAR |

## Console.logs en Producción

- **Total:** 2019 statements en 186 archivos
- **Sin protección DEV:** 75 archivos
- **Acción:** Envolver con `if (import.meta.env.DEV)`

**Prioridad:** Los que muestran datos sensibles (ya protegidos: dynamicsLeadService, ImageCatalogModalV2)

## Recomendación

**RPCs:**
- Todas las críticas son SECURITY DEFINER ✅
- Revisar validación auth en: create_user_with_role, get_user_permissions, can_user_access_prospect

**Console.logs:**
- Estrategia gradual: Proteger archivos críticos primero
- Usar build plugin para strip en producción (futuro)
