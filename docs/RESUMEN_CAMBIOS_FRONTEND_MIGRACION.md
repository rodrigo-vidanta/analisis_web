# Resumen de Cambios: Migración Frontend a PQNC_AI

**Fecha:** 13 de Enero 2025  
**Estado:** ✅ CAMBIOS APLICADOS - LISTO PARA TESTING LOCAL  
**Ambiente:** SOLO LOCAL (NO desplegado a producción)

---

## 📊 Resumen Ejecutivo

Se completaron los cambios de configuración para reapuntar el frontend de `system_ui` a `pqnc_ai`. Todos los cambios son en archivos de configuración, **sin modificar lógica de componentes**.

---

## ✅ Verificaciones Completadas

### Base de Datos PQNC_AI

1. **Tablas migradas**: 32/32 verificadas
2. **Funciones RPC críticas**: 17/17 verificadas
3. **Triggers críticos**: 4/4 verificados
4. **Realtime habilitado**: 8 tablas críticas
   - `auth_users`
   - `auth_sessions`
   - `user_notifications`
   - `auth_user_coordinaciones`
   - `coordinaciones`
   - `permission_groups`
   - `group_permissions`
   - `user_permission_groups`
5. **RLS activo**: 6 tablas críticas verificadas

### Git

- ✅ Commit de respaldo creado: `1ea547c`
- ✅ 59 archivos de migración commiteados
- ✅ Branch: `main` (NO se hizo push a remoto)

---

## 🔧 Archivos Modificados (2 archivos)

### 1. src/config/supabaseSystemUI.ts

**Cambios:**
- ✅ Agregado comentario de migración explicando que ahora apunta a PQNC_AI
- ✅ Actualizada documentación de variables de entorno requeridas
- ✅ Agregadas instrucciones de rollback

**NO se cambiaron:**
- Código de creación de clientes (igual)
- Lógica de autenticación (igual)
- Exports (iguales)

### 2. src/services/credentialsService.ts

**Cambios:**
- ✅ Líneas 32-34: Variables de entorno cambiadas de `VITE_SYSTEM_UI_*` a `VITE_SUPABASE_*`
- ✅ Agregado comentario de migración

**NO se cambiaron:**
- Lógica del servicio (igual)
- Cache (igual)
- Métodos públicos (iguales)

---

## ⚠️ ACCIÓN MANUAL REQUERIDA

### Actualizar .env.local

**Archivo:** `.env.local` (en la raíz del proyecto)

**Instrucciones detalladas:** Ver archivo [`INSTRUCCIONES_ENV_MIGRATION.md`](../INSTRUCCIONES_ENV_MIGRATION.md)

**Resumen:**

1. Comentar variables antiguas de System_UI (agregar # al inicio)
2. Actualizar variables `VITE_SYSTEM_UI_*` para usar URLs y keys de PQNC_AI

```bash
# Variables que deben quedar en .env.local:

# PQNC_AI (principal)
VITE_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_SUPABASE_ANON_KEY=<tu_pqnc_anon_key>
VITE_SUPABASE_SERVICE_KEY=<tu_pqnc_service_key>

# System_UI rediriged a PQNC_AI
VITE_SYSTEM_UI_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_SYSTEM_UI_SUPABASE_ANON_KEY=<mismo_valor_que_VITE_SUPABASE_ANON_KEY>
VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY=<mismo_valor_que_VITE_SUPABASE_SERVICE_KEY>
```

---

## 🧪 Testing Requerido en Local

### ANTES de probar, actualizar .env.local

Después de actualizar `.env.local`, ejecutar:

```bash
npm run dev
```

### Checklist de Testing

#### 1. Autenticación (CRÍTICO)
- [ ] Login con credenciales válidas
- [ ] Login con credenciales inválidas (debe fallar)
- [ ] Logout normal
- [ ] Abrir en dos pestañas, login en una → debe cerrar sesión en la otra (broadcast)
- [ ] Recargar página → debe mantener sesión

#### 2. Permisos
- [ ] Ver datos según rol (admin, coordinador, ejecutivo)
- [ ] Filtros de coordinación funcionando
- [ ] Sistema de backup de ejecutivos funcionando

#### 3. Notificaciones
- [ ] Campana de notificaciones muestra contador
- [ ] Notificaciones de nuevos mensajes
- [ ] Notificaciones de nuevas llamadas
- [ ] Marcar como leídas (RPC)
- [ ] Realtime actualiza contador automáticamente

#### 4. Live Chat
- [ ] Cargar conversaciones
- [ ] Ver mensajes en tiempo real
- [ ] Enviar mensajes
- [ ] Etiquetas WhatsApp (agregar/remover)
- [ ] Paráfrasis con moderación
- [ ] Avatares de usuarios

#### 5. Live Monitor
- [ ] Cargar llamadas en vivo
- [ ] Realtime de nuevas llamadas
- [ ] Feedback de llamadas
- [ ] Filtros por coordinación/ejecutivo

#### 6. Administración
- [ ] Listar usuarios
- [ ] Crear usuarios
- [ ] Editar usuarios
- [ ] Subir avatares
- [ ] Configurar permisos de evaluadores
- [ ] Gestionar tokens API

#### 7. Rendimiento
- [ ] Sin lag en realtime
- [ ] Consultas rápidas (<500ms)
- [ ] Sin errores en consola

---

## 🚨 Errores Potenciales y Soluciones

### Error: "Could not find the table"

**Causa:** Tabla no existe en PQNC_AI  
**Solución:** Verificar migración completada

### Error: "RPC function not found"

**Causa:** Función RPC no migrada  
**Solución:** Ejecutar `scripts/migration/19_migrate_functions_rpc_safe.sql`

### Error: "Realtime subscription failed"

**Causa:** Tabla no está en publicación realtime  
**Solución:** Ya habilitado en este proceso

### Error: "Permission denied"

**Causa:** RLS bloqueando acceso  
**Solución:** Verificar políticas RLS migradas

---

## 📝 Rollback Rápido

Si algo falla durante testing:

### 1. Revertir .env.local

Descomentar variables de System_UI (quitar #):

```bash
VITE_SYSTEM_UI_SUPABASE_URL=https://zbylezfyagwrxoecioup.supabase.co
VITE_SYSTEM_UI_SUPABASE_ANON_KEY=<backup_anon_key>
VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY=<backup_service_key>
```

### 2. Revertir código

```bash
git checkout src/config/supabaseSystemUI.ts
git checkout src/services/credentialsService.ts
```

### 3. Reiniciar dev server

```bash
npm run dev
```

---

## 📋 Próximos Pasos

1. ✅ Actualizar `.env.local` según instrucciones
2. ✅ Ejecutar `npm run dev`
3. ✅ Realizar testing completo del checklist
4. ⏳ Si todo funciona, autorizar despliegue
5. ⏳ Desplegar a producción (SOLO con autorización explícita)

---

## 🔒 Seguridad

- ✅ NO se hizo push a repositorio remoto
- ✅ NO se desplegó a AWS
- ✅ Todos los cambios son locales
- ✅ System_UI permanece intacto como backup

---

**Última actualización:** 13 de Enero 2025, 15:30  
**Autor:** AI Agent  
**Estado:** ESPERANDO VALIDACIÓN DEL USUARIO
