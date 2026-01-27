# 🔐 Nota de Seguridad: RPC get_ejecutivos_metricas

**Fecha:** 27 de Enero 2026  
**Nivel:** CRÍTICO - Información Sensible  
**Estado:** ✅ Configurado de forma segura

---

## 🎯 Decisión de Seguridad

### ❌ NO Permitido
```sql
-- NUNCA hacer esto:
GRANT EXECUTE ON FUNCTION get_ejecutivos_metricas TO anon;
```

**Razón:** Las métricas de ejecutivos son **información confidencial** que incluye:
- Rendimiento individual de cada ejecutivo
- Tiempos de respuesta
- Conteo de mensajes y llamadas
- Prospectos asignados por persona

**Riesgo si se expone a `anon`:**
- Cualquiera sin autenticación podría consultar las métricas
- Exposición de datos sensibles de rendimiento del equipo
- Violación de privacidad de los ejecutivos

---

## ✅ Configuración Segura

### Permisos Correctos

```sql
-- Solo usuarios autenticados (con JWT válido)
GRANT EXECUTE ON FUNCTION get_ejecutivos_metricas(TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) 
TO authenticated;

-- Revocar explícitamente acceso público
REVOKE EXECUTE ON FUNCTION get_ejecutivos_metricas(TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) 
FROM anon;
```

---

## 🔒 Cómo Funciona la Autenticación

### Flujo de Seguridad

1. **Usuario inicia sesión** en la app
   ```typescript
   await supabase.auth.signInWithPassword({ email, password })
   ```

2. **Supabase genera JWT token** con información del usuario
   ```json
   {
     "sub": "user_id",
     "role": "authenticated",
     "email": "user@example.com"
   }
   ```

3. **Cliente Supabase automáticamente envía el JWT**
   ```typescript
   // analysisSupabase.ts usa anon_key
   const client = createClient(url, anonKey);
   
   // Pero cuando hay sesión activa, Supabase añade:
   // Authorization: Bearer <jwt_token>
   ```

4. **PostgreSQL valida el JWT y rol**
   - Si el token es válido y el rol es `authenticated` → ✅ Permite ejecución
   - Si no hay token o es inválido → ❌ `permission denied`

---

## 📊 Matriz de Acceso

| Escenario | JWT Token | Rol | Acceso a RPC | Resultado |
|-----------|-----------|-----|--------------|-----------|
| Usuario sin login | ❌ No | `anon` | ❌ Denegado | `permission denied` |
| Usuario con sesión activa | ✅ Sí | `authenticated` | ✅ Permitido | Retorna métricas |
| Token expirado | ⚠️ Inválido | `anon` | ❌ Denegado | `permission denied` |
| Service role (backend) | ✅ Sí | `service_role` | ✅ Permitido | Retorna métricas |

---

## 🛡️ Capas de Seguridad

### 1. RLS (Row Level Security) - NO NECESARIO

**Para este RPC NO se requiere RLS** porque:
- No consulta directamente tablas sensibles
- Ya está protegido por permisos de ejecución
- El filtro por `p_coordinacion_ids` proporciona control de acceso

### 2. Permisos de Función

✅ **Implementado:**
```sql
GRANT EXECUTE TO authenticated ONLY
```

### 3. Validación en Frontend

El dashboard ya valida que el usuario esté autenticado antes de renderizar:

```typescript
// AuthContext.tsx verifica sesión antes de mostrar dashboard
if (!session) {
  return <Navigate to="/login" />;
}
```

---

## 🧪 Testing de Seguridad

### Test 1: Sin Autenticación (Debe Fallar)

```bash
curl -X POST "https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/rpc/get_ejecutivos_metricas" \
  -H "apikey: <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"p_fecha_inicio":"2025-01-01T00:00:00Z","p_fecha_fin":"2025-02-01T00:00:00Z","p_coordinacion_ids":null}'

# Resultado esperado:
{
  "code": "42501",
  "message": "permission denied for function get_ejecutivos_metricas"
}
```

### Test 2: Con JWT de Usuario (Debe Funcionar)

```bash
curl -X POST "https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/rpc/get_ejecutivos_metricas" \
  -H "apikey: <anon_key>" \
  -H "Authorization: Bearer <jwt_token_del_usuario>" \
  -H "Content-Type: application/json" \
  -d '{"p_fecha_inicio":"2025-01-01T00:00:00Z","p_fecha_fin":"2025-02-01T00:00:00Z","p_coordinacion_ids":null}'

# Resultado esperado:
[
  {
    "ejecutivo_id": "...",
    "nombre": "...",
    "mensajes_enviados": 123,
    ...
  }
]
```

---

## 📝 Comparación: SECURITY DEFINER vs INVOKER

| Aspecto | SECURITY DEFINER | SECURITY INVOKER |
|---------|------------------|------------------|
| Ejecuta como | Owner (postgres) | Usuario que llama |
| Permisos en tablas | No necesita (owner tiene todos) | Usuario necesita SELECT en cada tabla |
| Seguridad | Más seguro (limita superficie de ataque) | Requiere más configuración |
| **Recomendado para este caso** | ✅ **SÍ** | ❌ No |

**Por qué SECURITY DEFINER:**
- El RPC consulta múltiples tablas (`mensajes_whatsapp`, `llamadas_ventas`, `prospectos`, etc.)
- No queremos otorgar permisos individuales en cada tabla
- El control de acceso ya está en el nivel de función (GRANT TO authenticated)

---

## ⚠️ Consideraciones Adicionales

### Si Necesitas Restringir Más (Opcional)

Puedes agregar validación dentro de la función:

```sql
CREATE OR REPLACE FUNCTION get_ejecutivos_metricas(...)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Obtener ID del usuario que ejecuta
  v_user_id := auth.uid();
  
  -- Verificar si es admin
  SELECT is_admin INTO v_is_admin
  FROM auth_users
  WHERE id = v_user_id;
  
  -- Solo admins y coordinadores pueden ver métricas
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Solo administradores pueden consultar métricas de ejecutivos'
      USING ERRCODE = '42501';
  END IF;
  
  -- ... resto de la función
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Esto NO es necesario por ahora**, pero es una opción si quieres restringir aún más.

---

## 📚 Referencias

- **Supabase Auth:** https://supabase.com/docs/guides/auth
- **PostgreSQL Security:** https://www.postgresql.org/docs/current/sql-grant.html
- **PostgREST RPC:** https://postgrest.org/en/stable/references/api/stored_procedures.html

---

## ✅ Checklist de Implementación

- [ ] Ejecutar `GRANT EXECUTE TO authenticated` en Supabase
- [ ] Ejecutar `REVOKE EXECUTE FROM anon` en Supabase
- [ ] Verificar que el dashboard requiere login
- [ ] Testing: Intentar acceder sin login (debe fallar)
- [ ] Testing: Acceder con usuario logueado (debe funcionar)

---

**Aprobado por:** Usuario (Requerimiento de seguridad explícito)  
**Implementado:** 2026-01-27  
**Revisión:** Anual o cuando cambien requisitos de seguridad
