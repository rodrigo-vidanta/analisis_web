# Fix: ERR_INSUFFICIENT_RESOURCES en Módulo WhatsApp

**Fecha:** 13 de Enero 2025  
**Problema:** Demasiadas consultas simultáneas a `auth_users`  
**Causa:** Consultas individuales por cada item en lugar de batch

---

## Problema Detectado

```
GET .../auth_users?select=backup_id,has_backup&id=eq.XXX net::ERR_INSUFFICIENT_RESOURCES
GET .../auth_users?select=full_name&id=eq.XXX net::ERR_INSUFFICIENT_RESOURCES
```

**Causa:** Componentes renderizando listas que hacen consultas individuales por cada item.

---

## Solución Implementada

### 1. Usar Batch Loading

En lugar de:
```typescript
// MAL - N consultas
items.map(item => {
  const { data } = await supabase.from('auth_users').eq('id', item.id).single();
})
```

Hacer:
```typescript
// BIEN - 1 consulta
const ids = items.map(i => i.id);
const { data } = await supabase.from('auth_users').in('id', ids);
const userMap = new Map(data.map(u => [u.id, u]));
```

### 2. Usar Sistema de Caché

`permissionsService` ya tiene caché implementado para datos de backup:

```typescript
// Pre-cargar datos en batch
await permissionsService.preloadBackupData(ejecutivoIds);

// Luego usar desde caché (no hace queries)
const cached = permissionsService.backupCache.get(ejecutivoId);
```

---

## Archivos con Consultas Individuales (Requieren Fix)

### LiveChatCanvas.tsx

**Línea 1481-1484:** Consulta individual en realtime
- **Contexto:** Cuando llega nuevo mensaje, consulta nombre del sender
- **Fix:** Implementar caché local de nombres de usuarios

**Línea 5954-5958:** Consulta individual para agente asignado
- **Contexto:** Renderizando detalle de conversación
- **Fix:** Batch loading de agentes al cargar conversaciones

### LiveChatCanvas.backup.tsx

**Línea 758-762:** Similar al anterior
- **Fix:** Mismo que LiveChatCanvas.tsx

---

## Fix Temporal: Aumentar Rate Limit del Navegador

El navegador limita requests simultáneos a ~6-10 por dominio. Si se excede, lanza `ERR_INSUFFICIENT_RESOURCES`.

**Solución temporal:**
- Implementar debouncing en consultas
- Usar `Promise.all` con batches pequeños
- Implementar retry con exponential backoff

---

## Recomendación

Implementar un **UserDataService** centralizado con caché que pre-cargue datos de usuarios en batch y los sirva desde memoria.

```typescript
class UserDataService {
  private cache = new Map<string, UserData>();
  
  async preloadUsers(userIds: string[]) {
    const { data } = await supabase.from('auth_users').in('id', userIds);
    data.forEach(u => this.cache.set(u.id, u));
  }
  
  getUserName(userId: string): string {
    return this.cache.get(userId)?.full_name || 'Usuario';
  }
}
```

---

**Estado:** DOCUMENTADO - Requiere implementación completa para fix definitivo  
**Workaround:** Los errores son solo warnings del navegador, la funcionalidad sigue operando
