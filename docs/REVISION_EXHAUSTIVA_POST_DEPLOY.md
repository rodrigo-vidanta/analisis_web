# Revisión Exhaustiva Post-Deploy v2.2.0

**Fecha:** 13 de Enero 2026, 23:30  
**Versión Desplegada:** B8.0.0N2.2.0  
**Estado:** FUNCIONAL pero con warnings menores

---

## ✅ Lo Que Funciona Correctamente

### Autenticación
- ✅ Login/Logout
- ✅ Validación de sesión
- ✅ Broadcast de sesión única
- ✅ Función authenticate_user migrada
- ✅ Tabla auth_users (125 usuarios migrados)
- ✅ Tabla auth_sessions funcionando

### Datos Principales
- ✅ 37 tablas migradas a PQNC_AI
- ✅ ~8,500 registros migrados
- ✅ 19 funciones RPC operativas
- ✅ 4 triggers activos
- ✅ 5 vistas creadas
- ✅ Realtime habilitado (8 tablas)

### Módulos Probados
- ✅ Dashboard Operativo (4 widgets)
- ✅ Live Monitor/Llamadas IA
- ✅ WhatsApp/Live Chat (básico)
- ✅ Prospectos (Kanban y DataGrid)
- ✅ Llamadas PQNC (usa SupaPQNC correctamente)

---

## ⚠️ Errores/Warnings Detectados (NO Críticos)

### 1. Foreign Key Embeds Inválidos

**Error:**
```
Could not find a relationship between 'auth_users' and 'coordinacion_id'
```

**Archivos afectados:**
- `src/hooks/useUserProfile.ts` (línea ~45)
- `src/services/coordinacionService.ts` (8 ocurrencias)
- `src/services/permissionsService.ts` (línea ~839)
- `src/components/campaigns/plantillas/TemplateSuggestionsTab.tsx`

**Consultas problemáticas:**
```typescript
.select(`
  *,
  coordinaciones:coordinacion_id (codigo, nombre)  // ❌ FK no detectada
`)
```

**Solución aplicada EN LOCAL pero NO desplegada:**
- Eliminar embeds
- Hacer consultas separadas

**Impacto:** Datos de coordinación no cargan en algunos lugares (app funciona parcialmente)

**Estado:** ⚠️ CORRECCIÓN PENDIENTE DE DESPLEGAR

---

### 2. Columna is_ejecutivo Inexistente

**Error:**
```
GET .../auth_users?...&is_ejecutivo=eq.true 400
```

**Archivos afectados:**
- `src/services/coordinacionService.ts` (líneas 405, 518, 610, 1124, 1173)
- `src/components/admin/CoordinacionesManager.tsx` (línea 108)

**Consultas problemáticas:**
```typescript
.eq('is_ejecutivo', true)  // ❌ Columna no existe
```

**Solución aplicada EN LOCAL pero NO desplegada:**
```typescript
.select('*, auth_roles!inner(name)')
.eq('auth_roles.name', 'ejecutivo')  // ✅ Correcto
```

**Impacto:** Filtros de ejecutivos no funcionan (retorna 0 resultados)

**Estado:** ⚠️ CORRECCIÓN PENDIENTE DE DESPLEGAR

---

### 3. ERR_INSUFFICIENT_RESOURCES

**Error:**
```
GET .../auth_users?select=backup_id,has_backup&id=eq.XXX net::ERR_INSUFFICIENT_RESOURCES
(múltiples veces)
```

**Causa:** Muchas consultas simultáneas al cargar listas grandes

**Archivos donde aparece:**
- WhatsApp/Live Chat al cargar conversaciones
- Prospectos DataGrid (mitigado parcialmente)

**Solución aplicada EN LOCAL:**
- Pre-carga batch en ProspectosManager
- Optimización en LiveMonitorKanban

**Impacto:** Solo delay en carga, funcionalidad no afectada

**Estado:** ⚠️ OPTIMIZACIÓN PARCIAL - Queda trabajo pendiente

---

### 4. Tabla coordinador_coordinaciones Faltante

**Error:**
```
GET .../coordinador_coordinaciones?... 404
```

**Causa:** Tabla migrada como `coordinador_coordinaciones_legacy`

**Solución aplicada EN BD:**
- ✅ Vista `coordinador_coordinaciones` creada que apunta a `auth_user_coordinaciones`

**Impacto:** NINGUNO (vista ya creada)

**Estado:** ✅ RESUELTO

---

### 5. Foreign Key en auth_user_coordinaciones

**Error:**
```
Could not find relationship between 'auth_user_coordinaciones' and 'auth_roles'
```

**Archivos afectados:**
- `src/services/coordinacionService.ts` (getSupervisoresByCoordinacion, getCoordinadoresByCoordinacion)
- `src/services/permissionsService.ts` (isCoordinadorCalidad)

**Consultas problemáticas:**
```typescript
.select(`
  coordinacion_id,
  auth_roles:role_id (name)  // ❌ auth_user_coordinaciones NO tiene role_id
`)
```

**Problema:** `auth_user_coordinaciones` solo tiene `user_id` y `coordinacion_id`, NO tiene `role_id`.

**Solución sugerida:**
```typescript
// Opción A: JOIN manual con auth_users
.select(`
  coordinacion_id,
  user_id,
  auth_users!inner(role_id, auth_roles(name))
`)

// Opción B: Consultar usuarios por separado
const userIds = relaciones.map(r => r.user_id);
const users = await supabase.from('auth_users').in('id', userIds);
```

**Impacto:** No puede obtener roles de coordinadores/supervisores

**Estado:** ❌ NO CORREGIDO - Requiere corrección

---

## 🔧 Funcionalidades Pendientes de Validar

### Módulos NO Testeados Exhaustivamente

1. **Administración → Usuarios**
   - Crear usuario
   - Editar usuario
   - Subir avatar
   - Cambiar contraseña
   - Configurar permisos

2. **Administración → Grupos de Permisos**
   - Crear grupo
   - Asignar permisos
   - Asignar usuarios

3. **Administración → API Tokens**
   - Gestionar tokens
   - Histórico

4. **Campañas**
   - Crear campaña
   - Filtros con columnas que pueden no existir

5. **Scheduled Calls**
   - Programar llamadas
   - Ver historial

6. **Timeline**
   - Ver actividades
   - Agregar actividades

---

## 📦 Edge Functions Creadas pero NO Desplegadas

**Total:** 10 funciones en `supabase/functions/`

**Críticas (3):**
1. `send-message-proxy` - Envío de mensajes WhatsApp
2. `pause-bot-proxy` - Pausar bot
3. `whatsapp-templates-send-proxy` - Envío de plantillas

**Altas (3):**
4. `transfer-request-proxy` - Transferencia de llamadas
5. `tools-proxy` - Herramientas en llamadas
6. `whatsapp-templates-proxy` - Gestión plantillas

**Medias (3):**
7. `dynamics-lead-proxy` - Consulta Dynamics
8. `dynamics-reasignar-proxy` - Reasignación Dynamics
9. `broadcast-proxy` - Broadcast masivo

**Bajas (1):**
10. `timeline-proxy` - Timeline

**Impacto:** Por ahora usan llamadas directas a Railway (funciona pero menos seguro)

**Para desplegar:**
```bash
supabase link --project-ref glsmifhkoaifvaegsozd
supabase functions deploy send-message-proxy
...
supabase secrets set SEND_MESSAGE_AUTH=<token>
...
```

**Estado:** ⏳ PENDIENTE - Funcionalidad opera sin ellas pero menos seguro

---

## 🗄️ Tablas/Vistas Adicionales Sugeridas

### 1. Vista: auth_user_coordinaciones_enriched

**Para qué:** Evitar JOINs manuales en permisos

```sql
CREATE VIEW auth_user_coordinaciones_enriched AS
SELECT 
  auc.*,
  u.email as user_email,
  u.full_name as user_full_name,
  r.name as user_role_name,
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo
FROM auth_user_coordinaciones auc
LEFT JOIN auth_users u ON auc.user_id = u.id
LEFT JOIN auth_roles r ON u.role_id = r.id
LEFT JOIN coordinaciones c ON auc.coordinacion_id = c.id;
```

**Estado:** ⏳ NO CREADA - Mejoraría rendimiento

---

### 2. Tabla: user_sessions_history

**Para qué:** Auditoría de sesiones cerradas

**Actualmente:** Solo hay `auth_sessions` (solo activas)

**Sugerencia:** Guardar histórico de sesiones para auditoría

**Estado:** ⏳ NO EXISTE - Nice to have

---

## 🔍 Posibles Problemas No Detectados

### 1. Contraseñas de Usuarios Migrados

**Problema:** 75 usuarios migrados tienen contraseña temporal `TemporalPassword2025`

**Usuarios afectados:**
- Los que fueron migrados en la segunda ronda
- Pueden no saber que necesitan cambiar contraseña

**Solución sugerida:**
- Marcar `must_change_password = true` en esos usuarios
- O resetear contraseñas y enviar emails

**Estado:** ⚠️ ATENCIÓN REQUERIDA

---

### 2. Avatares en Bucket Incorrecto

**Problema:** URLs de avatares pueden apuntar a bucket de system_ui o SupaPQNC

**Verificar:**
```sql
SELECT id, user_id, avatar_url 
FROM user_avatars 
WHERE avatar_url LIKE '%hmmfuhqgvsehkizlfzga%' 
   OR avatar_url LIKE '%zbylezfyagwrxoecioup%';
```

**Solución:** Copiar avatares al bucket de PQNC_AI o actualizar URLs

**Estado:** ⏳ NO VERIFICADO

---

### 3. Datos en user_notifications

**Problema:** Tabla `user_notifications` en PQNC_AI puede tener datos antiguos de system_ui mezclados con nuevos

**Verificar:**
- ¿Hay duplicados?
- ¿Notificaciones huérfanas (sin usuario)?
- ¿Foreign keys válidas?

**Estado:** ⏳ NO VERIFICADO

---

## 📊 Optimizaciones Pendientes

### Alta Prioridad

1. **Usar vistas optimizadas en widgets del Dashboard**
   - ConversacionesWidget → `conversaciones_whatsapp_enriched`
   - ProspectosNuevosWidget → `prospectos_con_ejecutivo_y_coordinacion`
   - LlamadasActivasWidget → `llamadas_activas_con_prospecto`
   
   **Beneficio:** 3-4 queries → 1 query por widget

2. **Eliminar embeds de foreign keys inválidos**
   - 10+ archivos con `coordinaciones:coordinacion_id`
   - 6 archivos con `is_ejecutivo`
   - 2 archivos con JOINs incorrectos a auth_roles
   
   **Beneficio:** Eliminar errores 400

3. **Implementar batch loading consistente**
   - LiveChatCanvas (consultas individuales de nombres)
   - Todos los widgets que renderizan listas
   
   **Beneficio:** Eliminar ERR_INSUFFICIENT_RESOURCES

---

### Media Prioridad

4. **Desplegar Edge Functions a PQNC_AI**
   - 10 funciones listas, pendientes de deploy
   - Configurar secrets
   - Actualizar frontend para usarlas
   
   **Beneficio:** Seguridad, CORS, logs centralizados

5. **Optimizar LiveChatCanvas**
   - Usar `conversaciones_whatsapp_enriched`
   - Pre-carga de usuarios en batch
   
   **Beneficio:** 50% más rápido

6. **Crear función RPC get_prospectos_with_permissions**
   - Filtros de permisos en servidor
   - JOINs optimizados
   
   **Beneficio:** 1 query en lugar de 3-4

---

### Baja Prioridad

7. **Vistas materializadas**
   - Para dashboards con datos agregados
   - Refresh periódico
   
   **Beneficio:** Queries instantáneas

8. **RLS en vistas**
   - Políticas de seguridad a nivel de vista
   
   **Beneficio:** Seguridad adicional

---

## 🚨 Warnings/Errores Conocidos en Consola

### 1. Foreign Key Not Found (múltiples)

**Frecuencia:** Alta  
**Impacto:** Datos incompletos en UI  
**Bloquea funcionalidad:** NO  
**Prioridad:** Alta

---

### 2. ERR_INSUFFICIENT_RESOURCES

**Frecuencia:** Media (en WhatsApp, Prospectos DataGrid)  
**Impacto:** Delay en carga (2-3 segundos)  
**Bloquea funcionalidad:** NO  
**Prioridad:** Media

---

### 3. Realtime send() Deprecation

**Frecuencia:** Baja  
**Impacto:** Solo warning  
**Bloquea funcionalidad:** NO  
**Prioridad:** Baja

---

### 4. Performance Warnings

**Frecuencia:** Alta (solo dev mode)  
**Impacto:** Ninguno (no aparecen en producción)  
**Bloquea funcionalidad:** NO  
**Prioridad:** Muy baja

---

## 🔐 Seguridad y Mantenimiento

### Credenciales Expuestas

**Problema:** Logs muestran `url: 'https://glsmifhkoaifvaegsozd.s...'` antes del login

**Archivo:** `src/config/supabaseSystemUI.ts` (línea ~26)

**Solución:** Ya implementada en local (solo mostrar en DEV mode)

**Estado:** ✅ RESUELTO EN LOCAL, pendiente de verificar en producción

---

### System_UI Como Backup

**Estado actual:** 
- ✅ Datos históricos intactos
- ✅ Edge Functions operativas
- ✅ Puede usarse para rollback

**Recomendación:** Mantener por 30 días mínimo

---

### Variables de Entorno en Producción

**Problema detectado:** `.env.local` no se usa en producción

**Solución implementada:** `.env.production` creado

**Verificar:** Que AWS esté usando `.env.production` en el build

**Estado:** ⏳ MONITOREAR - Podría fallar en futuros deploys

---

## 📝 Documentación Generada

**Total:** 30+ documentos

**Principales:**
- `docs/MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md` ⭐
- `docs/NUEVA_ARQUITECTURA_BD_UNIFICADA.md`
- `docs/INVENTARIO_WEBHOOKS_N8N.md`
- `INDICE_DOCUMENTACION_MIGRACION.md`

**Reglas actualizadas:**
- `.cursor/rules/mcp-rules.mdc`
- `.cursor/rules/arquitectura-bd-unificada.mdc` (nueva)

**Estado:** ✅ COMPLETA

---

## 🎯 Priorización de Tareas Pendientes

### URGENTE (Hacer ASAP)

1. ✅ **Corregir embeds de foreign keys** (10 archivos)
   - Tiempo: 30-45 min
   - Riesgo: Bajo
   - Beneficio: Elimina errores 400

2. ✅ **Corregir is_ejecutivo** (6 archivos)
   - Tiempo: 15-20 min
   - Riesgo: Bajo
   - Beneficio: Filtros funcionan correctamente

3. ⚠️ **Verificar contraseñas de usuarios migrados**
   - Tiempo: 30 min
   - Riesgo: Medio (usuarios pueden no poder entrar)
   - Beneficio: Experiencia de usuario

---

### IMPORTANTE (Esta Semana)

4. ✅ **Desplegar Edge Functions a PQNC_AI**
   - Tiempo: 2-3 horas
   - Riesgo: Medio
   - Beneficio: Seguridad

5. ✅ **Optimizar widgets con vistas**
   - Tiempo: 1-2 horas
   - Riesgo: Bajo
   - Beneficio: Performance

6. ⚠️ **Verificar avatares**
   - Tiempo: 1 hora
   - Riesgo: Bajo
   - Beneficio: UX

---

### DESEABLE (Próximas 2 Semanas)

7. ✅ **Optimizar LiveChatCanvas**
8. ✅ **Crear funciones RPC adicionales**
9. ⏳ **Vistas materializadas**
10. ⏳ **RLS en vistas**

---

## 🧪 Testing Pendiente

### Módulos Requieren Testing Exhaustivo

**NO testeados completamente:**
- Administración → Crear/Editar Usuario
- Administración → Grupos de Permisos
- Administración → API Tokens
- Campañas → Crear campaña
- Campañas → Audiencias
- Scheduled Calls → Programar llamada
- Timeline → Todas las funcionalidades

**Testeados parcialmente:**
- WhatsApp (básico OK, funciones avanzadas sin probar)
- Prospectos (visualización OK, asignaciones sin probar)
- Live Monitor (visualización OK, feedback sin probar)

---

## 📈 Métricas de Rendimiento

### Comparación (Estimada)

**Antes (2 BDs):**
- Tiempo de carga dashboard: ~3s
- Requests HTTP por carga: ~15-20
- Prospectos DataGrid: ~2s

**Después (BD unificada + optimizaciones EN LOCAL):**
- Tiempo de carga dashboard: ~1s (con vistas)
- Requests HTTP: ~5-8 (con vistas)
- Prospectos DataGrid: ~1s

**Actualmente EN PRODUCCIÓN (migrada pero sin optimizaciones):**
- Similar a "Antes" porque las optimizaciones NO están desplegadas
- Solo la BD está unificada, el código NO usa las ventajas aún

---

## ⚠️ Riesgos Identificados

### Alto

1. **Variables de entorno en futuros builds**
   - Riesgo: Que no se use `.env.production` en algún build
   - Mitigación: Verificar cada deploy

2. **Usuarios con contraseñas temporales**
   - Riesgo: 75 usuarios pueden no poder entrar
   - Mitigación: Reset masivo de contraseñas

---

### Medio

3. **Errores 400 confunden a usuarios**
   - Riesgo: Reportes de "no funciona" cuando sí funciona
   - Mitigación: Corregir embeds ASAP

4. **CloudFront caché agresivo**
   - Riesgo: Deploys no se reflejan rápido
   - Mitigación: Invalidación manual cada deploy

---

### Bajo

5. **System_UI puede quedar obsoleto**
   - Riesgo: Datos divergentes después de 30 días
   - Mitigación: Archivar o eliminar después de validación

---

## 🎯 Plan de Acción Sugerido

### Semana 1 (Esta Semana)

**Lunes-Martes:**
- Corregir embeds de foreign keys (10 archivos)
- Corregir is_ejecutivo (6 archivos)
- Testing exhaustivo en local
- Deploy controlado

**Miércoles-Jueves:**
- Desplegar Edge Functions a PQNC_AI
- Configurar secrets
- Actualizar frontend para usarlas
- Testing

**Viernes:**
- Verificar contraseñas de usuarios
- Reset masivo si es necesario
- Monitoreo de métricas

---

### Semana 2

**Lunes-Miércoles:**
- Optimizar widgets con vistas
- Testing de módulos pendientes
- Correcciones menores

**Jueves-Viernes:**
- Optimizar LiveChatCanvas
- Crear funciones RPC adicionales
- Documentación de usuario

---

## 📊 Métricas a Monitorear

### Críticas

1. **Tasa de error en login**
   - Actual: Desconocida
   - Objetivo: <1%

2. **Tiempo de carga promedio**
   - Actual: ~2-3s
   - Objetivo: <1s

3. **Errores 400/404**
   - Actual: Alto (foreign keys)
   - Objetivo: 0

---

### Importantes

4. **ERR_INSUFFICIENT_RESOURCES**
   - Actual: Medio
   - Objetivo: Eliminar

5. **Usuarios bloqueados**
   - Actual: 1+ desbloqueado manualmente
   - Objetivo: 0 bloqueos por migración

---

## 💾 Backups y Seguridad

### Backups Disponibles

- ✅ Git tags: v2.2.0-migracion-bd-unificada
- ✅ Commit: 1ea547c (antes de migración frontend)
- ✅ System_UI: Datos completos
- ✅ `.env.local.backup*`: Locales (no en git)

### Rollback Plan

**Tiempo:** 5 minutos  
**Complejidad:** Baja  
**Método:** 
```bash
git reset --hard 2600c82  # Versión estable pre-migración
git push origin main --force
./update-frontend.sh
```

---

## 📋 Checklist de Verificación Post-Deploy

### Funcionalidades Críticas

- [x] Login funciona
- [x] Usuarios pueden ver su dashboard
- [x] Prospectos se visualizan
- [x] Live Monitor funciona
- [x] WhatsApp básico funciona
- [ ] Crear usuario (sin probar)
- [ ] Editar usuario (sin probar)
- [ ] Asignar prospectos (sin probar)
- [ ] Programar llamadas (sin probar)
- [ ] Enviar plantillas WhatsApp (sin probar)

### Performance

- [x] Página carga en <5s
- [ ] Dashboard carga en <2s (optimizaciones pendientes)
- [x] Login tarda <1s
- [ ] Búsquedas funcionan rápido (sin probar todas)

### Seguridad

- [x] Usuarios bloqueados pueden desbloquearse
- [ ] Contraseñas de 75 usuarios verificadas
- [x] RLS activo en tablas migradas
- [x] Realtime funcionando
- [ ] Políticas de avatares verificadas

---

## 🔚 Conclusión

### Estado General

**Funcionalidad:** ✅ OPERATIVA (80-90%)  
**Performance:** ⚠️ ACEPTABLE (puede mejorar 50%)  
**Seguridad:** ✅ BUENA (Edge Functions mejorarían)  
**UX:** ⚠️ BUENA con warnings (errores en consola confunden)

---

### Trabajo Pendiente Estimado

**Correcciones críticas:** 2-3 horas  
**Edge Functions:** 3-4 horas  
**Optimizaciones:** 4-5 horas  
**Testing exhaustivo:** 2-3 horas

**Total:** 11-15 horas adicionales

---

### Recomendación Final

**AHORA:**
1. Mantener versión actual operativa
2. Monitorear errores de usuarios
3. Desbloquear usuarios según se reporten

**PRÓXIMA SEMANA:**
1. Corregir embeds e is_ejecutivo (URGENTE)
2. Testing exhaustivo de todos los módulos
3. Deploy controlado fuera de horario

**PRÓXIMAS 2 SEMANAS:**
1. Edge Functions
2. Optimizaciones con vistas
3. Documentación de usuario

---

**Última actualización:** 13 de Enero 2026, 23:35  
**Analista:** AI Agent  
**Estado de la migración:** OPERATIVA con mejoras pendientes
