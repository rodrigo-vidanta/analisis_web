# Testing Manual: Refactor authAdminProxyService

**Fecha:** 22 de Enero 2026  
**Versión:** 1.0.0  
**Estado:** ✅ PENDIENTE DE TESTING

---

## 📋 Resumen

Este documento contiene el **checklist completo de testing manual** para validar el refactor de `authAdminProxyService`. Todas las funcionalidades críticas deben verificarse antes del deploy.

---

## ⚙️ Setup Pre-Testing

### 1. Verificar Compilación

```bash
# Compilar TypeScript
npm run build

# Resultado esperado: ✅ Sin errores de tipo
# Estado actual: ✅ COMPLETADO (22 Ene 2026)
```

### 2. Verificar Linter

```bash
# Ejecutar linter
npm run lint

# Resultado esperado: ✅ Sin nuevos errores
# Estado actual: ✅ COMPLETADO (22 Ene 2026)
```

### 3. Verificar Edge Function

```bash
# Verificar que Edge Function esté activa
curl -X POST "https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/auth-admin-proxy" \
  -H "Authorization: Bearer {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{"operation": "getUserById", "params": {"userId": "test"}}'

# Resultado esperado: Respuesta JSON sin error 404
```

---

## 🧪 Tests Manuales

### 1. Autenticación y Login

| Test | Descripción | Resultado |
|------|-------------|-----------|
| **1.1** | Login con credenciales válidas | ⬜ Pendiente |
| **1.2** | Verificar que `last_login` se actualiza | ⬜ Pendiente |
| **1.3** | Verificar que `auth_login_logs` registra entrada | ⬜ Pendiente |
| **1.4** | Logout exitoso | ⬜ Pendiente |

**Pasos para 1.1:**
1. Abrir app en navegador
2. Ingresar email y contraseña válidos
3. Hacer clic en "Iniciar sesión"
4. Verificar que redirige a dashboard
5. Verificar que no hay errores en consola

**Criterio de éxito:** Usuario ingresa sin errores.

---

### 2. Gestión de Usuarios (UserManagement)

#### 2.1. Toggle is_operativo (Coordinador)

| Test | Usuario | Esperado | Resultado |
|------|---------|----------|-----------|
| **2.1.1** | Coordinador sin `id_dynamics` | Permite habilitar operativo | ⬜ Pendiente |
| **2.1.2** | Coordinador con `id_dynamics` | Permite habilitar operativo | ⬜ Pendiente |
| **2.1.3** | Deshabilitar operativo | Cambia a "No Operativo" | ⬜ Pendiente |
| **2.1.4** | Recargar página | Estado persiste correctamente | ⬜ Pendiente |

**Pasos para 2.1.1:**
1. Ir a **Admin → User Management**
2. Filtrar por rol "coordinador"
3. Seleccionar coordinador sin `id_dynamics`
4. Toggle "Operativo" a ON
5. Verificar que:
   - Toggle cambia a verde
   - No hay error en consola
   - Toast de éxito aparece
6. Recargar página
7. Verificar que toggle sigue en ON

**Criterio de éxito:** Toggle funciona sin errores y persiste.

---

#### 2.2. Toggle is_operativo (Ejecutivo)

| Test | Usuario | Esperado | Resultado |
|------|---------|----------|-----------|
| **2.2.1** | Ejecutivo **CON** `id_dynamics` | Permite habilitar operativo | ⬜ Pendiente |
| **2.2.2** | Ejecutivo **SIN** `id_dynamics` | **BLOQUEA** con error | ⬜ Pendiente |
| **2.2.3** | Ejecutivo con `id_dynamics` → deshabilitar | Cambia a "No Operativo" | ⬜ Pendiente |

**Pasos para 2.2.2 (caso crítico):**
1. Ir a **Admin → User Management**
2. Filtrar por rol "ejecutivo"
3. Seleccionar ejecutivo **SIN** `id_dynamics`
4. Intentar toggle "Operativo" a ON
5. Verificar que:
   - ❌ Toggle NO cambia
   - ⚠️ Error toast: "No se puede habilitar operativo un ejecutivo sin ID_Dynamics"
   - Console muestra error descriptivo
6. Verificar que toggle sigue en OFF

**Criterio de éxito:** Bloqueo funciona correctamente con mensaje claro.

---

### 3. Sistema de Backup (backupService)

#### 3.1. Asignar Backup

| Test | Descripción | Resultado |
|------|-------------|-----------|
| **3.1.1** | Asignar backup a ejecutivo sin backup | Actualiza correctamente | ⬜ Pendiente |
| **3.1.2** | Verificar que `has_backup = true` | Campo actualizado | ⬜ Pendiente |
| **3.1.3** | Verificar que `backup_id` es UUID válido | Campo correcto | ⬜ Pendiente |
| **3.1.4** | Verificar que `telefono_original` se guarda | Teléfono guardado | ⬜ Pendiente |
| **3.1.5** | Verificar que `phone` cambia a teléfono backup | Teléfono cambiado | ⬜ Pendiente |

**Pasos para 3.1.1:**
1. Ir a **Admin → Gestión de Backups** (o módulo equivalente)
2. Seleccionar ejecutivo sin backup asignado
3. Asignar un backup disponible
4. Verificar que:
   - Toast de éxito aparece
   - Ejecutivo muestra "Con Backup"
   - `telefono_original` guarda teléfono real
   - `phone` muestra teléfono del backup
5. Recargar página y verificar persistencia

**Criterio de éxito:** Backup asignado correctamente y datos persisten.

---

#### 3.2. Remover Backup

| Test | Descripción | Resultado |
|------|-------------|-----------|
| **3.2.1** | Remover backup de ejecutivo | Restaura teléfono original | ⬜ Pendiente |
| **3.2.2** | Verificar que `has_backup = false` | Campo actualizado | ⬜ Pendiente |
| **3.2.3** | Verificar que `backup_id = null` | Campo limpiado | ⬜ Pendiente |
| **3.2.4** | Verificar que `phone` vuelve al original | Teléfono restaurado | ⬜ Pendiente |
| **3.2.5** | Verificar que `telefono_original = null` | Campo limpiado | ⬜ Pendiente |

**Pasos para 3.2.1:**
1. Tomar ejecutivo con backup asignado (del test 3.1)
2. Hacer clic en "Remover Backup"
3. Confirmar acción
4. Verificar que:
   - Toast de éxito aparece
   - Ejecutivo muestra "Sin Backup"
   - `phone` vuelve al original
   - Campos de backup en NULL
5. Recargar página y verificar persistencia

**Criterio de éxito:** Backup removido correctamente y teléfono restaurado.

---

### 4. Coordinaciones (coordinacionService)

#### 4.1. Asignar Ejecutivo a Coordinación

| Test | Descripción | Resultado |
|------|-------------|-----------|
| **4.1.1** | Asignar ejecutivo a coordinación | Actualiza correctamente | ⬜ Pendiente |
| **4.1.2** | Verificar que `coordinacion_id` es UUID válido | Campo correcto | ⬜ Pendiente |
| **4.1.3** | Verificar que ejecutivo aparece en lista | Lista actualizada | ⬜ Pendiente |
| **4.1.4** | Recargar y verificar persistencia | Datos persisten | ⬜ Pendiente |

**Pasos para 4.1.1:**
1. Ir a **Admin → Coordinaciones**
2. Seleccionar una coordinación
3. Hacer clic en "Asignar Ejecutivo"
4. Seleccionar ejecutivo no asignado
5. Confirmar
6. Verificar que:
   - Toast de éxito aparece
   - Ejecutivo aparece en lista de coordinación
   - `coordinacion_id` del ejecutivo cambió
7. Recargar página y verificar

**Criterio de éxito:** Asignación correcta con persistencia.

---

#### 4.2. Crear Ejecutivo

| Test | Descripción | Resultado |
|------|-------------|-----------|
| **4.2.1** | Crear ejecutivo nuevo con todos los campos | Usuario creado | ⬜ Pendiente |
| **4.2.2** | Verificar que email es válido | Email correcto | ⬜ Pendiente |
| **4.2.3** | Verificar que contraseña se hasheó | No está en texto plano | ⬜ Pendiente |
| **4.2.4** | Verificar que `role_id` es ejecutivo | Rol correcto | ⬜ Pendiente |
| **4.2.5** | Verificar que `coordinacion_id` asignada | Coordinación asignada | ⬜ Pendiente |
| **4.2.6** | Login con nuevo ejecutivo | Login exitoso | ⬜ Pendiente |

**Pasos para 4.2.1:**
1. Ir a **Admin → Coordinaciones**
2. Seleccionar una coordinación
3. Hacer clic en "Crear Ejecutivo"
4. Llenar formulario:
   - Email: `test.ejecutivo.{timestamp}@pqnc.com`
   - Contraseña: `Password123!`
   - Nombre completo: "Test Ejecutivo"
   - Teléfono: "+525512345678"
5. Guardar
6. Verificar que:
   - Toast de éxito aparece
   - Ejecutivo aparece en lista
7. Logout y login con nuevo ejecutivo
8. Verificar que login funciona

**Criterio de éxito:** Ejecutivo creado correctamente y puede autenticarse.

---

#### 4.3. Actualizar Ejecutivo

| Test | Campo Actualizado | Resultado |
|------|-------------------|-----------|
| **4.3.1** | `first_name` | Actualiza correctamente | ⬜ Pendiente |
| **4.3.2** | `last_name` | Actualiza correctamente | ⬜ Pendiente |
| **4.3.3** | `phone` | Actualiza correctamente | ⬜ Pendiente |
| **4.3.4** | `is_active` | Actualiza correctamente | ⬜ Pendiente |
| **4.3.5** | Múltiples campos a la vez | Todos actualizan | ⬜ Pendiente |

**Pasos para 4.3.5 (test completo):**
1. Ir a **Admin → User Management**
2. Seleccionar ejecutivo existente
3. Hacer clic en "Editar"
4. Cambiar:
   - Nombre: "Nuevo Nombre"
   - Apellido: "Nuevo Apellido"
   - Teléfono: "+525587654321"
5. Guardar
6. Verificar que:
   - Toast de éxito aparece
   - Todos los campos actualizaron
7. Recargar página y verificar persistencia

**Criterio de éxito:** Todos los campos actualizan correctamente.

---

### 5. Mensajes Admin (adminMessagesService)

#### 5.1. Desbloquear Usuario

| Test | Descripción | Resultado |
|------|-------------|-----------|
| **5.1.1** | Desbloquear usuario bloqueado | Desbloquea correctamente | ⬜ Pendiente |
| **5.1.2** | Verificar que `failed_login_attempts = 0` | Campo reseteado | ⬜ Pendiente |
| **5.1.3** | Verificar que `locked_until = null` | Campo limpiado | ⬜ Pendiente |
| **5.1.4** | Login con usuario desbloqueado | Login exitoso | ⬜ Pendiente |

**Setup previo:**
1. Bloquear un usuario con 3+ intentos fallidos de login
2. Verificar que usuario está bloqueado (`locked_until` != null)

**Pasos para 5.1.1:**
1. Ir a **Admin → Mensajes Admin** (o módulo equivalente)
2. Buscar usuario bloqueado
3. Hacer clic en "Desbloquear Usuario"
4. Confirmar
5. Verificar que:
   - Toast de éxito aparece
   - Usuario ya no muestra estado "Bloqueado"
   - Campos `failed_login_attempts` y `locked_until` en 0/null
6. Logout e intentar login con ese usuario
7. Verificar que login funciona

**Criterio de éxito:** Usuario desbloqueado correctamente y puede autenticarse.

---

### 6. Integración End-to-End

#### 6.1. Flujo Completo: Crear y Gestionar Ejecutivo

| Paso | Descripción | Resultado |
|------|-------------|-----------|
| **6.1.1** | Crear ejecutivo nuevo | ✅ Creado | ⬜ Pendiente |
| **6.1.2** | Login con ejecutivo nuevo | ✅ Login exitoso | ⬜ Pendiente |
| **6.1.3** | Verificar que NO es operativo (sin id_dynamics) | ✅ No operativo | ⬜ Pendiente |
| **6.1.4** | Admin asigna id_dynamics al ejecutivo | ✅ Asignado | ⬜ Pendiente |
| **6.1.5** | Admin habilita operativo | ✅ Habilitado | ⬜ Pendiente |
| **6.1.6** | Admin asigna backup | ✅ Backup asignado | ⬜ Pendiente |
| **6.1.7** | Verificar teléfono cambió a backup | ✅ Teléfono correcto | ⬜ Pendiente |
| **6.1.8** | Admin remueve backup | ✅ Backup removido | ⬜ Pendiente |
| **6.1.9** | Verificar teléfono vuelve al original | ✅ Teléfono restaurado | ⬜ Pendiente |

**Instrucciones:**
Ejecutar todos los pasos en secuencia y verificar que cada operación funciona sin errores.

**Criterio de éxito:** Flujo completo sin errores en ningún paso.

---

## 🐛 Debugging

### Errores Comunes

#### Error: "No se puede habilitar operativo un ejecutivo sin ID_Dynamics"

**Causa:** Ejecutivo no tiene `id_dynamics` asignado  
**Solución:** Asignar `id_dynamics` antes de habilitar operativo

**Verificación:**
```typescript
// En consola del navegador
await supabaseSystemUI
  .from('user_profiles_v2')
  .select('id, email, id_dynamics')
  .eq('email', 'ejecutivo@pqnc.com')
  .single();

// Si id_dynamics es null, asignar:
// Admin → User Management → Editar usuario → Campo "ID Dynamics"
```

---

#### Error: "Error al actualizar estado operativo"

**Causa:** Edge Function no responde o retornó error  
**Verificación:**
1. Abrir DevTools → Network
2. Buscar request a `auth-admin-proxy`
3. Verificar response:
   - Status 200: OK
   - Status 401/403: Problema de autenticación
   - Status 500: Error en Edge Function

**Solución:**
```bash
# Verificar logs de Edge Function
supabase functions logs auth-admin-proxy --project-ref glsmifhkoaifvaegsozd
```

---

#### Error: "Failed to fetch"

**Causa:** URL de Edge Function incorrecta o Edge Function no deployada  
**Verificación:**
```typescript
// En consola del navegador
console.log(import.meta.env.VITE_EDGE_FUNCTIONS_URL);
// Debe ser: https://glsmifhkoaifvaegsozd.supabase.co
```

**Solución:**
1. Verificar `.env.production`
2. Rebuild app: `npm run build`
3. Verificar Edge Function deployada:
```bash
supabase functions list --project-ref glsmifhkoaifvaegsozd
```

---

## 📊 Reportar Resultados

### Template de Reporte

```markdown
## Resultado de Testing Manual

**Fecha:** {fecha}
**Tester:** {nombre}
**Ambiente:** {development/staging/production}

### Resumen
- ✅ Tests exitosos: X/N
- ❌ Tests fallidos: Y/N
- ⚠️ Warnings: Z

### Detalles por Módulo

#### 1. Autenticación
- [✅/❌] 1.1 Login con credenciales válidas
- [✅/❌] 1.2 Actualización last_login
- [✅/❌] 1.3 Registro en logs
- [✅/❌] 1.4 Logout exitoso

#### 2. Gestión de Usuarios
- [✅/❌] 2.1.1 Toggle coordinador sin id_dynamics
- [✅/❌] 2.1.2 Toggle coordinador con id_dynamics
- [✅/❌] 2.2.1 Toggle ejecutivo CON id_dynamics
- [✅/❌] 2.2.2 Bloqueo ejecutivo SIN id_dynamics ⚠️ CRÍTICO

... (continuar con todos los tests)

### Issues Encontrados

1. **[CRÍTICO/IMPORTANTE/MENOR]** Descripción del issue
   - Pasos para reproducir: ...
   - Comportamiento esperado: ...
   - Comportamiento actual: ...
   - Screenshot/Log: ...

### Recomendaciones

- [ ] Deploy a staging: {SÍ/NO}
- [ ] Deploy a producción: {SÍ/NO/CON CONDICIONES}
- [ ] Testing adicional requerido: {descripción}
```

---

## ✅ Criterios de Aprobación

### Para Deploy a Staging

- ✅ Todos los tests de **Autenticación** (1.x) pasan
- ✅ Todos los tests de **Toggle is_operativo** (2.x) pasan
- ✅ Al menos 80% de tests de **Backup** (3.x) pasan
- ✅ Al menos 80% de tests de **Coordinaciones** (4.x) pasan
- ⚠️ Warnings documentados y aceptados

### Para Deploy a Producción

- ✅ **TODOS** los tests pasan (100%)
- ✅ Testing en staging completado sin issues
- ✅ Validación con usuarios beta exitosa
- ✅ Rollback plan documentado
- ✅ Monitoreo post-deploy configurado

---

## 🔄 Rollback Plan

### Si se detectan errores críticos en producción:

1. **Inmediato (< 5 min):**
   ```bash
   # Revertir a commit anterior
   git revert HEAD
   npm run build
   ./update-frontend.sh
   ```

2. **Validación (< 2 min):**
   - Verificar que app carga
   - Hacer login de prueba
   - Verificar que toggle funciona

3. **Comunicación:**
   - Notificar a equipo de issue detectado
   - Documentar error para análisis post-mortem

---

## 📚 Referencias

- [Handover del Refactor](.cursor/handovers/2026-01-22-refactor-auth-admin-proxy-service.md)
- [Validación de Lecturas/Escrituras](VALIDACION_LECTURAS_ESCRITURAS_AUTH_USERS.md)
- [Refactor Completo](REFACTOR_AUTH_ADMIN_PROXY_SERVICE.md)
- [Reglas de Seguridad](.cursor/rules/security-rules.mdc)
- [authAdminProxyService.ts](../src/services/authAdminProxyService.ts)

---

**Última actualización:** 22 de Enero 2026  
**Próxima revisión:** Post-testing manual  
**Responsable:** Usuario / QA Team
