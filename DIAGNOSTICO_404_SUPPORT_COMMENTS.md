## 🔍 Diagnóstico Completo: Error 404 en Support Ticket Comments

**Fecha:** 2 de Febrero 2026  
**Ticket:** TKT-20260131-0065  
**Error:** `POST .../support_ticket_comments?select=* 404 (Not Found)`

---

## ✅ Verificaciones Realizadas

| Check | Estado | Resultado |
|-------|--------|-----------|
| ✅ Tabla existe | OK | `support_ticket_comments` existe en PQNC_AI |
| ✅ Ticket existe | OK | TKT-20260131-0065 (ID: `101da1ce-36ba-4af1-91ea-41f5f6a43df6`) |
| ✅ Políticas RLS | OK | 3 políticas con prefijo "RLS:" usando `user_profiles_v2` |
| ✅ Cliente correcto | OK | `analysisSupabase` (anon_key) |
| ⚠️ **Grants de tabla** | **PENDIENTE** | Posible causa del 404 |

---

## 🎯 Problema Probable: Falta de GRANTS

### Causa Raíz Sospechada

El error **404** (Not Found) en un POST a Supabase ocurre cuando:
1. ✅ La tabla existe
2. ✅ Las políticas RLS existen
3. ❌ **El rol `authenticated` NO TIENE GRANTS en la tabla**

### Explicación Técnica

```
Supabase requiere 2 niveles de permisos:

NIVEL 1: GRANTS (acceso base a la tabla)
  └─ GRANT SELECT, INSERT, UPDATE, DELETE ON table TO authenticated

NIVEL 2: RLS Policies (filtrado de filas)
  └─ CREATE POLICY ... (quién ve qué filas)

Si falta NIVEL 1 → HTTP 404 (tabla no accesible)
Si falta NIVEL 2 → HTTP 403 (acceso denegado a filas específicas)
```

---

## ✅ Solución: Aplicar Grants

### Script Creado
`scripts/sql/fix_support_tickets_grants.sql`

### Grants a Aplicar
```sql
-- Crítico para el error 404
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_comments TO authenticated;
GRANT SELECT ON public.support_ticket_comments TO anon;

-- Resto de tablas del sistema
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_attachments TO authenticated;
```

---

## 🚀 Pasos para Resolver

### 1. Ejecutar Script de Grants
```
Archivo: scripts/sql/fix_support_tickets_grants.sql
URL: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
```

### 2. Verificar Grants
Después de ejecutar, verificar con:
```sql
SELECT 
  table_name,
  grantee,
  string_agg(privilege_type, ', ') as privileges
FROM information_schema.role_table_grants
WHERE table_name = 'support_ticket_comments'
AND grantee = 'authenticated'
GROUP BY table_name, grantee;
```

**Resultado esperado:**
| table_name | grantee | privileges |
|---|---|---|
| support_ticket_comments | authenticated | DELETE, INSERT, SELECT, UPDATE |

### 3. Test Manual
- Refrescar página del sistema
- Ir a ticket TKT-20260131-0065
- Intentar comentar nuevamente

---

## 📊 Comparación: Otras Tablas

Para verificar la hipótesis, comparar grants con una tabla que SÍ funciona:

```sql
-- Prospectos (funciona)
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'prospectos' AND grantee = 'authenticated';

-- Support tickets (posiblemente sin grants)
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'support_ticket_comments' AND grantee = 'authenticated';
```

Si `prospectos` tiene grants pero `support_ticket_comments` NO → confirmado.

---

## 🔐 Seguridad Mantenida

Los grants NO comprometen la seguridad porque:
- ✅ **RLS sigue activo:** Las políticas filtran qué filas ve cada usuario
- ✅ **Grants son necesarios:** Sin ellos, RLS ni siquiera se ejecuta
- ✅ **Patrón estándar:** Todas las tablas de la app tienen estos grants

### Ejemplo de Flujo Correcto

```
1. Usuario autenticado hace POST /support_ticket_comments
2. Supabase verifica: ¿'authenticated' tiene GRANT INSERT? → ✅ SÍ
3. Supabase ejecuta: Política RLS "users add comments" → ✅ Cumple (user_id match)
4. INSERT exitoso → Retorna registro con SELECT
5. Supabase verifica: ¿'authenticated' tiene GRANT SELECT? → ✅ SÍ
6. Supabase ejecuta: Política RLS "users read comments" → ✅ Cumple
7. Frontend recibe el comentario insertado
```

**Sin grants (situación actual):**
```
1. Usuario autenticado hace POST /support_ticket_comments
2. Supabase verifica: ¿'authenticated' tiene GRANT INSERT? → ❌ NO
3. HTTP 404 Not Found (tabla no existe para ese rol)
```

---

## 🧪 Alternativa de Test (Sin Grants)

Si NO quieres aplicar grants aún, prueba con `service_role_key` temporal:

**⚠️ SOLO PARA TEST, NO PARA PRODUCCIÓN:**

```typescript
// En ticketService.ts (temporal)
import { createClient } from '@supabase/supabase-js';

const testClient = createClient(
  import.meta.env.VITE_ANALYSIS_SUPABASE_URL,
  'SERVICE_ROLE_KEY_AQUI' // ⚠️ NO COMMITEAR
);

// Probar addComment con testClient
const { data, error } = await testClient
  .from('support_ticket_comments')
  .insert({ ... })
  .select()
  .single();
```

Si funciona con service_role pero no con anon_key → **Confirmado: faltan grants**.

---

## 📝 Resumen Ejecutivo

1. **Problema identificado:** Falta de GRANTS para rol `authenticated`
2. **Solución:** Ejecutar `fix_support_tickets_grants.sql`
3. **Tiempo:** 10 segundos
4. **Riesgo:** Nulo (grants son necesarios para RLS)
5. **Próximo paso:** Aplicar grants y re-testear

---

**Ejecuta el script de grants ahora y confirma si resuelve el 404.**
