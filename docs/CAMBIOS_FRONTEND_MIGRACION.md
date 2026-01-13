# Cambios Requeridos en Frontend - Migración system_ui → pqnc_ai

**Fecha:** 2025-01-13  
**Objetivo:** Documentar todos los cambios necesarios en el código frontend

---

## 📋 RESUMEN

- **Archivos a modificar:** 13 archivos principales
- **Servicios afectados:** 6 servicios
- **Componentes afectados:** 8 componentes principales
- **Configuraciones:** 1 archivo de configuración

---

## 🔧 CAMBIOS POR ARCHIVO

### 1. `src/config/supabaseSystemUI.ts` ⚠️ CRÍTICO

**Estado:** Archivo de configuración principal

**Cambios requeridos:**

```typescript
// ANTES
export const SUPABASE_URL = import.meta.env.VITE_SYSTEM_UI_SUPABASE_URL || '';
// URL: https://zbylezfyagwrxoecioup.supabase.co

// DESPUÉS
export const SUPABASE_URL = import.meta.env.VITE_PQNC_AI_SUPABASE_URL || '';
// URL: https://glsmifhkoaifvaegsozd.supabase.co

// También actualizar:
export const SUPABASE_ANON_KEY = import.meta.env.VITE_PQNC_AI_SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_KEY = import.meta.env.VITE_PQNC_AI_SUPABASE_SERVICE_KEY || '';
```

**Alternativa (durante transición):**
```typescript
// Mantener compatibilidad temporal
const SYSTEM_UI_URL = import.meta.env.VITE_SYSTEM_UI_SUPABASE_URL || '';
const PQNC_AI_URL = import.meta.env.VITE_PQNC_AI_SUPABASE_URL || '';

export const SUPABASE_URL = PQNC_AI_URL || SYSTEM_UI_URL; // Fallback temporal
```

**Impacto:** 🔴 ALTO - Todos los servicios que usan este cliente se verán afectados

---

### 2. `src/services/userNotificationService.ts` ⚠️ CRÍTICO

**Estado:** Servicio de notificaciones por usuario

**Cambios requeridos:**

```typescript
// ANTES
import { supabaseSystemUI } from '../config/supabaseSystemUI';

// DESPUÉS
import { analysisSupabase } from '../config/analysisSupabase';

// Cambiar todas las referencias:
// supabaseSystemUI → analysisSupabase
```

**Líneas específicas a cambiar:**
- Línea 12: Import
- Línea 65: `.from('user_notifications')`
- Línea 118: `.from('user_notifications')`
- Línea 146: `.from('user_notifications')`
- Línea 180: `.rpc('mark_message_notifications_as_read')`
- Línea 187: `.from('user_notifications')`
- Línea 218: `.rpc('mark_call_notifications_as_read')`
- Línea 225: `.from('user_notifications')`
- Línea 256: `.from('user_notifications')`
- Línea 282: `.from('user_notifications')`
- Línea 322: `supabaseSystemUI.channel(...)`

**Nota:** La tabla `user_notifications` en pqnc_ai tiene estructura diferente. Necesitamos verificar compatibilidad de campos.

**Impacto:** 🔴 ALTO - Sistema de notificaciones completo

---

### 3. `src/services/notificationsService.ts` ⚠️ CRÍTICO

**Estado:** Servicio de notificaciones estilo redes sociales

**Cambios requeridos:**

```typescript
// ANTES
import { supabaseSystemUI, supabaseSystemUIAdmin } from '../config/supabaseSystemUI';

// DESPUÉS
import { analysisSupabase } from '../config/analysisSupabase';
// Nota: Este servicio YA usa analysisSupabase para user_notifications
// Solo necesita cambiar consultas a auth_users
```

**Líneas específicas a cambiar:**
- Línea 23: Import (cambiar a analysisSupabase)
- Línea 257: `supabaseSystemUI.from('auth_users')` → `analysisSupabase.from('auth_users')`
- Línea 276: `supabaseSystemUI.from('auth_user_coordinaciones')` → `analysisSupabase.from('auth_user_coordinaciones')`
- Línea 289: `supabaseSystemUI.from('auth_users')` → `analysisSupabase.from('auth_users')`
- Línea 394: `supabaseSystemUI.from('auth_users')` → `analysisSupabase.from('auth_users')`
- Línea 452: `supabaseSystemUI.from('auth_users')` → `analysisSupabase.from('auth_users')`
- Línea 467: `supabaseSystemUI.from('auth_user_coordinaciones')` → `analysisSupabase.from('auth_user_coordinaciones')`
- Línea 475: `supabaseSystemUI.from('auth_users')` → `analysisSupabase.from('auth_users')`

**Impacto:** 🔴 ALTO - Sistema de notificaciones de prospectos

---

### 4. `src/services/notificationService.ts`

**Estado:** Servicio de notificaciones (versión alternativa)

**Cambios requeridos:**

```typescript
// ANTES
import { supabaseSystemUI } from '../config/supabaseSystemUI';

// DESPUÉS
import { analysisSupabase } from '../config/analysisSupabase';

// Cambiar todas las referencias:
// supabaseSystemUI → analysisSupabase
```

**Líneas específicas:**
- Línea 11: Import
- Líneas 63, 99, 138, 174, 215, 260: Todas las referencias a `supabaseSystemUI`

**Impacto:** 🟡 MEDIO

---

### 5. `src/services/credentialsService.ts`

**Estado:** Servicio de credenciales API

**Cambios requeridos:**

```typescript
// ANTES
// Consulta api_auth_tokens desde system_ui

// DESPUÉS
// Consulta api_auth_tokens desde pqnc_ai (analysisSupabase)
```

**Verificar:**
- Qué cliente Supabase usa actualmente
- Cambiar a `analysisSupabase` si usa `supabaseSystemUI`

**Impacto:** 🟡 MEDIO

---

### 6. `src/services/apiTokensService.ts`

**Estado:** Servicio de tokens API

**Cambios requeridos:**

```typescript
// Verificar qué cliente usa y cambiarlo a analysisSupabase
```

**Impacto:** 🟡 MEDIO

---

### 7. `src/components/chat/LiveChatCanvas.tsx` ⚠️ CRÍTICO

**Estado:** Componente principal de Live Chat

**Cambios requeridos:**

```typescript
// ANTES
import { supabaseSystemUI } from '../../config/supabaseSystemUI';

// DESPUÉS
import { analysisSupabase } from '../../config/analysisSupabase';

// Cambiar todas las referencias:
// supabaseSystemUI → analysisSupabase
```

**Tablas afectadas:**
- `uchat_conversations`
- `uchat_messages`
- `uchat_bots`
- `auth_users` (para obtener datos de usuarios)

**Líneas específicas (aproximadas):**
- Línea 56: Import
- Línea 1480: Referencia a supabaseSystemUI
- Línea 2861: `supabaseSystemUI.from('uchat_conversations')`
- Línea 2976: `supabaseSystemUI.from('uchat_conversations')`
- Línea 2984: `supabaseSystemUI.update(...)`
- Línea 3785-3786: `supabaseSystemUIAdmin.from('auth_users')`
- Línea 4136-4137: `supabaseSystemUIAdmin.from('auth_users')`
- Línea 4389: `supabaseSystemUI.from('auth_users')`
- Línea 4660: `supabaseSystemUI.from('uchat_conversations')`
- Línea 4679: `supabaseSystemUI.from('uchat_bots')`
- Línea 4711: `supabaseSystemUI.from('uchat_conversations')`
- Línea 4832: `supabaseSystemUI.insert(...)`
- Línea 4852: `supabaseSystemUI.update(...)`
- Línea 4892: `supabaseSystemUI.from('auth_users')`
- Línea 4921: `supabaseSystemUI.insert(...)`
- Línea 4928: `supabaseSystemUI.update(...)`
- Línea 4965: `supabaseSystemUI.from('uchat_messages')`
- Línea 4985: `supabaseSystemUI.from('auth_users')`
- Línea 5021: `supabaseSystemUI.insert(...)`
- Línea 5053: `supabaseSystemUI.update(...)`
- Línea 5928: `supabaseSystemUI.from('uchat_conversations')`
- Línea 5941: `supabaseSystemUI.from('uchat_conversations')`
- Línea 5954: `supabaseSystemUI.from('auth_users')`

**Impacto:** 🔴 ALTO - Funcionalidad completa de Live Chat

---

### 8. `src/components/analysis/LiveMonitor.tsx`

**Estado:** Componente de Live Monitor

**Cambios requeridos:**

```typescript
// ANTES
import { supabaseSystemUI } from '../../config/supabaseSystemUI';

// DESPUÉS
import { analysisSupabase } from '../../config/analysisSupabase';

// Cambiar consultas a auth_users
```

**Líneas específicas:**
- Línea 25: Import
- Línea 1100: `supabaseSystemUI.from('auth_users')` → `analysisSupabase.from('auth_users')`
- Línea 1114: `supabaseSystemUI.from('auth_users')` → `analysisSupabase.from('auth_users')`

**Impacto:** 🟡 MEDIO

---

### 9. `src/components/analysis/LiveMonitorKanban.tsx`

**Estado:** Componente Kanban de Live Monitor

**Cambios requeridos:**

```typescript
// ANTES
import { supabaseSystemUI } from '../../config/supabaseSystemUI';

// DESPUÉS
import { analysisSupabase } from '../../config/analysisSupabase';

// Cambiar consultas a auth_users
```

**Líneas específicas:**
- Línea 28: Import
- Línea 1062-1063: `supabaseSystemUIAdmin.from('auth_users')` → `analysisSupabaseAdmin.from('auth_users')`
- Línea 1215-1216: `supabaseSystemUIAdmin.from('auth_users')` → `analysisSupabaseAdmin.from('auth_users')`

**Impacto:** 🟡 MEDIO

---

### 10. `src/components/admin/UserManagementV2/components/UserEditPanel.tsx`

**Estado:** Panel de edición de usuarios

**Cambios requeridos:**

```typescript
// ANTES
import { supabaseSystemUIAdmin } from '../../../../config/supabaseSystemUI';

// DESPUÉS
import { analysisSupabaseAdmin } from '../../../../config/analysisSupabase';

// Cambiar todas las referencias
```

**Líneas específicas:**
- Línea 36: Import
- Línea 102: `supabaseSystemUIAdmin.from(...)`
- Línea 571: `supabaseSystemUIAdmin.update(...)`

**Impacto:** 🔴 ALTO - Gestión de usuarios

---

### 11. `src/components/admin/UserManagementV2/hooks/useUserManagement.ts` ⚠️ CRÍTICO

**Estado:** Hook de gestión de usuarios

**Cambios requeridos:**

```typescript
// ANTES
import { supabaseSystemUIAdmin } from '../../../../config/supabaseSystemUI';

// DESPUÉS
import { analysisSupabaseAdmin } from '../../../../config/analysisSupabase';

// Cambiar TODAS las referencias
```

**Tablas afectadas:**
- `auth_users`
- `auth_roles`
- `auth_user_coordinaciones`
- `coordinaciones`
- `auth_login_logs`
- `prospect_assignments`
- `user_warning_counters`
- `content_moderation_warnings`

**Líneas específicas (múltiples):**
- Línea 9: Import
- Línea 164: `supabaseSystemUIAdmin.from('auth_users')`
- Línea 182: `supabaseSystemUIAdmin.from('coordinaciones')`
- Línea 211: `supabaseSystemUIAdmin.from('content_moderation_warnings')`
- Línea 229: `supabaseSystemUIAdmin.from('user_warning_counters')`
- Línea 266: `supabaseSystemUIAdmin.from('auth_user_coordinaciones')`
- Línea 282: `supabaseSystemUIAdmin.from('coordinaciones')`
- Línea 302: `supabaseSystemUIAdmin.from('auth_login_logs')`
- Línea 404: `supabaseSystemUIAdmin.from('prospect_assignments')`
- Línea 426: `supabaseSystemUIAdmin.from('auth_roles')`

**Impacto:** 🔴 ALTO - Funcionalidad completa de gestión de usuarios

---

### 12. `src/components/Footer.tsx`

**Estado:** Componente Footer

**Cambios requeridos:**

```typescript
// ANTES
import { supabaseSystemUI } from '../config/supabaseSystemUI';

// DESPUÉS
import { analysisSupabase } from '../config/analysisSupabase';

// Cambiar consultas a auth_users y user_avatars
```

**Líneas específicas:**
- Línea 3: Import
- Línea 53: `supabaseSystemUI.from('auth_users')` → `analysisSupabase.from('auth_users')`
- Línea 70: `supabaseSystemUI.from('user_avatars')` → `analysisSupabase.from('user_avatars')`

**Impacto:** 🟢 BAJO

---

### 13. `src/hooks/useProspectosNotifications.ts`

**Estado:** Hook de notificaciones de prospectos

**Cambios requeridos:**

```typescript
// Verificar si usa supabaseSystemUI y cambiarlo a analysisSupabase
```

**Impacto:** 🟡 MEDIO

---

## 🔄 ESTRATEGIA DE MIGRACIÓN DEL FRONTEND

### Opción A: Migración Directa (Recomendada)

1. Actualizar `supabaseSystemUI.ts` para apuntar a pqnc_ai
2. Cambiar todas las referencias de `supabaseSystemUI` a `analysisSupabase`
3. Validar que todas las tablas existen en pqnc_ai
4. Probar funcionalidad completa

**Ventajas:**
- Cambio único y limpio
- Menos complejidad

**Desventajas:**
- Requiere que todas las tablas estén migradas primero

### Opción B: Migración Gradual con Wrapper

1. Crear wrapper que redirija según configuración
2. Migrar servicios uno por uno
3. Validar cada servicio antes de continuar
4. Remover wrapper al finalizar

**Ventajas:**
- Migración más segura
- Permite rollback por servicio

**Desventajas:**
- Más complejidad temporal
- Código adicional a mantener

---

## 📝 CHECKLIST DE CAMBIOS

### Configuración
- [ ] Actualizar `src/config/supabaseSystemUI.ts`
- [ ] Actualizar variables de entorno `.env`

### Servicios
- [ ] `src/services/userNotificationService.ts`
- [ ] `src/services/notificationsService.ts`
- [ ] `src/services/notificationService.ts`
- [ ] `src/services/credentialsService.ts`
- [ ] `src/services/apiTokensService.ts`

### Componentes
- [ ] `src/components/chat/LiveChatCanvas.tsx`
- [ ] `src/components/analysis/LiveMonitor.tsx`
- [ ] `src/components/analysis/LiveMonitorKanban.tsx`
- [ ] `src/components/admin/UserManagementV2/components/UserEditPanel.tsx`
- [ ] `src/components/admin/UserManagementV2/hooks/useUserManagement.ts`
- [ ] `src/components/Footer.tsx`

### Hooks
- [ ] `src/hooks/useProspectosNotifications.ts`

---

## ⚠️ CONSIDERACIONES ESPECIALES

### 1. Estructura Diferente de `user_notifications`

**Problema:** `user_notifications` en pqnc_ai tiene estructura diferente (11 columnas vs 18 columnas)

**Solución:**
- Usar `user_notifications_legacy` para datos antiguos
- Crear adaptador o función que mapee campos si es necesario
- O migrar datos antiguos a nueva estructura

### 2. Funciones RPC

**Verificar que existan en pqnc_ai:**
- `mark_message_notifications_as_read`
- `mark_call_notifications_as_read`
- `create_message_notifications_batch`
- `create_call_notifications_batch`

Si no existen, migrarlas desde system_ui o usar UPDATE directo.

### 3. Realtime Subscriptions

**Verificar:**
- Que realtime esté habilitado en pqnc_ai
- Que las políticas RLS permitan suscripciones
- Que los canales funcionen correctamente

### 4. Variables de Entorno

**Actualizar `.env`:**
```env
# ANTES
VITE_SYSTEM_UI_SUPABASE_URL=https://zbylezfyagwrxoecioup.supabase.co
VITE_SYSTEM_UI_SUPABASE_ANON_KEY=...
VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY=...

# DESPUÉS (o mantener ambas durante transición)
VITE_PQNC_AI_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_PQNC_AI_SUPABASE_ANON_KEY=...
VITE_PQNC_AI_SUPABASE_SERVICE_KEY=...
```

---

## 🧪 PRUEBAS POST-MIGRACIÓN

### Funcionalidades Críticas a Probar

1. ✅ Login de usuarios
2. ✅ Creación de notificaciones
3. ✅ Marcado de notificaciones como leídas
4. ✅ Live Chat completo
5. ✅ Live Monitor
6. ✅ User Management (CRUD completo)
7. ✅ Consulta de credenciales
8. ✅ API tokens

### Pruebas de Rendimiento

- [ ] Consultas a `auth_users` tienen buen tiempo de respuesta
- [ ] Consultas a `user_notifications` tienen buen tiempo de respuesta
- [ ] Realtime subscriptions funcionan sin lag

---

**Última actualización:** 2025-01-13  
**Próximo paso:** Revisar y aprobar cambios antes de implementar
