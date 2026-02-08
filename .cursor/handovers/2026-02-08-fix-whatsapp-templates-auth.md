# Handover: Fix Autenticación - Creación de Plantillas WhatsApp

**Fecha:** 8 de Febrero 2026
**Sesión:** Corrección de error "Authentication required" al crear plantillas WhatsApp
**Estado:** Fix aplicado, pendiente deploy a producción

---

## Problema Original

Al intentar crear una nueva plantilla desde **Campañas > Plantillas > Nueva Plantilla**, se obtenía:

```
Error creando template en uChat: Error: Authentication required
❌ Error guardando plantilla: Authentication required
```

---

## Diagnóstico

### Causa Raíz

El servicio `whatsappTemplatesService.ts` enviaba la **anon key** (`VITE_ANALYSIS_SUPABASE_ANON_KEY`) como Bearer token al llamar la Edge Function `whatsapp-templates-proxy`:

```ts
// ANTES (incorrecto):
const SUPABASE_ANON_KEY = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
// ...
'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
```

La Edge Function `whatsapp-templates-proxy` (líneas 42-60) valida el JWT llamando a `/auth/v1/user`:

```ts
const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'apikey': supabaseAnonKey,
  },
});
if (!authResponse.ok) {
  return Response({ error: 'Authentication required' }, { status: 401 });
}
```

La `anon_key` **no es un JWT de usuario válido**, por lo que `/auth/v1/user` siempre retornaba error → 401.

### Problema Secundario

El método `getAuthToken()` referenciaba una constante `WEBHOOK_AUTH_TOKEN` que **no existía** en el archivo, causando un error de compilación latente (TypeScript error 2304).

---

## Corrección Aplicada

### Archivo Modificado

- `src/services/whatsappTemplatesService.ts`

### Cambios

1. **Agregado import** de `supabaseSystemUI` para obtener la sesión del usuario autenticado

2. **Reemplazado** el método obsoleto `getAuthToken()` (con referencia rota a `WEBHOOK_AUTH_TOKEN`) por `getUserAccessToken()`:

```ts
private async getUserAccessToken(): Promise<string> {
  const { data: { session } } = await supabaseSystemUI!.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Authentication required');
  }
  return session.access_token;
}
```

3. **Actualizado 5 métodos** que hacen fetch a la Edge Function para usar el JWT real del usuario:
   - `createTemplateInUChat()` - Crear plantilla
   - `getTemplateFromUChat()` - Obtener plantilla por ID
   - `updateTemplateInUChat()` - Actualizar plantilla
   - `deleteTemplateInUChat()` - Eliminar plantilla (soft delete)
   - `syncTemplatesFromUChat()` - Sincronizar todas las plantillas

4. **Eliminada** la constante `SUPABASE_ANON_KEY` que ya no se usa

### Patrón Correcto (consistente con otros servicios)

Este es el mismo patrón usado en `dynamicsLeadService`, `scheduledCallsService`, `dynamicsReasignacionService`, etc.:

```ts
const { data: { session } } = await supabaseSystemUI!.auth.getSession();
const userToken = session?.access_token;
// 'Authorization': `Bearer ${userToken}`
```

---

## Flujo Completo (Post-Fix)

```
Usuario (autenticado) → whatsappTemplatesService.createTemplate()
  → getUserAccessToken() → obtiene JWT de sesión vía supabaseSystemUI
  → fetch(EDGE_FUNCTION_URL, { Authorization: Bearer <JWT> })
    → Edge Function valida JWT con /auth/v1/user → OK ✅
    → Edge Function llama webhook N8N con WHATSAPP_TEMPLATES_AUTH
    → N8N crea plantilla en uChat + BD
  → Respuesta exitosa al frontend
```

---

## Impacto

- **Operaciones afectadas:** CRUD completo de plantillas WhatsApp + sincronización
- **Módulos afectados:** Campañas > Plantillas, Admin > Plantillas WhatsApp
- **Riesgo:** Bajo - solo se cambió la fuente del token de autenticación, sin cambios en lógica de negocio

---

## Verificación Post-Deploy

1. Ir a **Campañas > Plantillas > Nueva Plantilla**
2. Crear una plantilla con nombre, categoría, idioma y contenido
3. Verificar que se crea exitosamente (sin error 401)
4. Verificar que sincronización funciona (botón "Sincronizar desde uChat")
5. Verificar que editar y eliminar plantillas también funcionan

---

## Notas Técnicas

- La Edge Function `whatsapp-templates-proxy` fue restaurada el 06-Feb-2026 con validación JWT manual (`verify_jwt: false` en config, validación vía `/auth/v1/user`)
- El servicio tenía código legacy del webhook directo (pre-Edge Function) que nunca fue actualizado para pasar el JWT del usuario
- Otros servicios que llaman Edge Functions ya usaban el patrón correcto con `supabaseSystemUI.auth.getSession()`
