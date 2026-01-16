# Seguridad de Vistas - Restricción a Usuarios Autenticados

**Fecha:** 16 de Enero 2026  
**Hora:** 21:00 UTC  
**Estado:** ✅ COMPLETADO

---

## Cambio Implementado

### ANTES (Inseguro)
```
anon (anon_key) → Puede leer TODAS las vistas
authenticated (JWT) → Puede leer TODAS las vistas
```

**Problema:** Cualquiera con `anon_key` podía enumerar:
- Usuarios del sistema
- Prospectos y sus datos
- Conversaciones de WhatsApp
- Llamadas y análisis
- Métricas de negocio

### DESPUÉS (Seguro) ✅
```
anon (anon_key) → SIN ACCESO a vistas
authenticated (JWT) → Puede leer vistas (después del login)
service_role → Acceso completo
```

**Beneficio:** Solo usuarios autenticados pueden acceder a datos de negocio

---

## Vistas Protegidas (23 total)

### Seguridad (3)
- `auth_users_safe` - Usuarios sin password_hash
- `api_auth_tokens_safe` - Tokens sin token_value
- `user_profiles_v2` - Perfiles sin password_hash

### Llamadas (3)
- `call_analysis_executive_summary`
- `call_analysis_summary`
- `live_monitor_view`
- `llamadas_activas_con_prospecto`

### WhatsApp (1)
- `conversaciones_whatsapp_enriched`

### Prospectos (3)
- `prospectos_con_ejecutivo_y_coordinacion`
- `v_prospectos_config`
- `v_prospectos_etapa`

### Analytics (6)
- `v_ab_test_comparison`
- `v_acciones_por_origen`
- `v_campaign_analytics`
- `v_conversiones`
- `v_funnel_actual`
- `v_template_analytics`

### Auditoría (3)
- `v_audit_pending_retry`
- `v_audit_retry_stats`
- `v_security_alerts`

### Ejecutivos (1)
- `vw_ejecutivos_metricas_base`

### Otros (1)
- `v_horario_hoy`

---

## SQL Ejecutado

```sql
-- PASO 1: Revocar acceso de anon
REVOKE ALL ON [vista] FROM anon;

-- PASO 2: Otorgar acceso solo a authenticated
GRANT SELECT ON [vista] TO authenticated;
```

**Aplicado a:** 23 vistas

---

## Impacto

### ✅ Positivo
- Mayor seguridad (defensa en profundidad)
- Prevención de enumeración de datos
- Sin datos expuestos antes del login
- Alineado con principio de mínimo privilegio

### ⚠️ Consideraciones
- Toda consulta a vistas REQUIERE login previo
- `anon_key` solo puede acceder a tablas con RLS público explícito

---

## Verificación

```sql
-- Verificar que anon NO tiene acceso
SELECT table_name, grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee = 'anon'
  AND table_name LIKE '%_safe'
     OR table_name LIKE 'v_%'
     OR table_name LIKE 'vw_%';

-- Resultado esperado: 0 filas en vistas críticas
```

---

**Estado:** ✅ IMPLEMENTADO  
**Próximo paso:** Verificar en producción que login sigue funcionando
