# ⚡ EJECUTAR ESTE SCRIPT AHORA

**Archivo:** `scripts/sql/FIX_TRIGGER_AUTH_USERS_V2_FORCE.sql`

## 🔴 Problema Detectado

El script anterior NO funcionó porque **hay DOS funciones con el mismo nombre**:

1. `is_support_admin(uuid)` - **TODAVÍA USA `auth_users`** ❌ (esta es la que usa el trigger)
2. `is_support_admin()` - Usa `user_profiles_v2` correctamente ✅ (pero no se usa)

Por eso el trigger sigue fallando.

## ✅ Solución

Este nuevo script hace `DROP CASCADE` para **eliminar ambas funciones** y recrear solo la correcta.

## 📋 Pasos

1. Ir a Supabase Dashboard → SQL Editor
2. Copiar TODO el contenido de `FIX_TRIGGER_AUTH_USERS_V2_FORCE.sql`
3. Ejecutar (RUN)
4. Verificar resultado:
   ```
   ✅ is_support_admin(UUID) funciona correctamente
   ✅ get_support_admin_ids() retorna X admins
   ```

5. Al final verás una tabla que debe mostrar:
   ```
   proname          | arguments | usa_auth_users_roto
   -----------------|-----------|--------------------- 
   is_support_admin | uuid      | FALSE
   ```

   Si `usa_auth_users_roto = TRUE`, el fix NO funcionó.

## 🧪 Test Final

Después de ejecutar, prueba el INSERT en ticket:

```bash
# Frontend: Ticket TKT-20260131-0065
# Escribir y enviar comentario
# Esperado: ✅ Sin error 404
```

---

**Ejecuta el script y pégame el resultado de la última SELECT.** 🚀
