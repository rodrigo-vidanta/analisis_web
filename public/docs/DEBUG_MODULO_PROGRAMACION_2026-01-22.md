# 🐛 DEBUG: Módulo Programación No Muestra Llamadas

**Usuario Afectado:** Samuel Rosales (admin)  
**Fechas:** 19, 20, 21 Enero 2026  
**Síntoma:** Módulo vacío (0 llamadas)  
**Esperado:** 110 llamadas (55+40+15)

---

## ✅ Datos Verificados en BD

### Llamadas Existen
```sql
SELECT DATE(fecha_programada) as fecha, COUNT(*) as total
FROM llamadas_programadas
WHERE DATE(fecha_programada) IN ('2026-01-19', '2026-01-20', '2026-01-21')
GROUP BY DATE(fecha_programada)

-- Resultado:
-- 2026-01-19: 55 llamadas
-- 2026-01-20: 40 llamadas
-- 2026-01-21: 15 llamadas
-- TOTAL: 110 llamadas
```

### Usuario es Admin
```sql
SELECT id, email, role_name, coordinacion_id
FROM user_profiles_v2
WHERE email = 'samuelrosales@grupovidanta.com'

-- Resultado:
-- role_name: admin
-- coordinacion_id: null (OK para admin)
```

### Código Correcto (scheduledCallsService.ts línea 94)
```typescript
// Admin, Administrador Operativo y Coordinadores de Calidad pueden ver todo, no aplicar filtros
if (!isAdminOrOperativo && !isCoordinadorCalidad) {
  // ... filtros solo para NO-admin
}
```

---

## 🔍 Posibles Causas

### 1. **Frontend NO Recargado** ⚠️ MÁS PROBABLE
- Código de `permissionsService.ts` fue modificado
- Navegador tiene código viejo en caché
- Vite dev server necesita restart

**Solución:**
```bash
# Hard refresh en navegador
Cmd+Shift+R (Mac) o Ctrl+Shift+R (Windows)

# O reiniciar dev server
npm run dev
```

### 2. **Query sin Filtro de Fecha**
- `ScheduledCallsManager.tsx` llama con `estatus: 'all'`
- NO pasa `fechaDesde` ni `fechaHasta`
- Service trae TODAS las llamadas históricas
- Frontend filtra por fecha DESPUÉS

**Verificar:**
```typescript
// ScheduledCallsManager.tsx línea 79-82
const filters = {
  search: searchTerm || undefined,
  estatus: 'all' as const
  // ⚠️ NO hay fechaDesde/fechaHasta aquí
};
```

### 3. **Error al Enriquecer con Prospectos**
- Service trae las llamadas OK
- Falla al cargar prospectos relacionados
- Devuelve array vacío

**Verificar Console Logs:**
```javascript
// Buscar en DevTools Console:
"Error obteniendo llamadas programadas"
"Error cargando prospectos"
```

### 4. **Problema de Timezone**
- BD usa UTC
- Frontend filtra por timezone local
- Puede estar filtrando fechas incorrectas

**Verificar:**
```typescript
// DailyView o WeeklyView puede estar filtrando:
calls.filter(call => isSameDay(new Date(call.fecha_programada), selectedDate))
```

---

## 🧪 Plan de Diagnóstico

### Paso 1: Verificar Logs del Navegador
```bash
# Abrir DevTools Console (F12)
# Buscar:
"scheduledCallsService"
"Error obteniendo"
"llamadas programadas"
```

### Paso 2: Verificar Network Tab
```bash
# DevTools → Network → XHR
# Buscar request a:
/rest/v1/llamadas_programadas?select=...

# Ver:
- Status code (200 OK?)
- Response (tiene datos?)
- Cantidad de registros
```

### Paso 3: Hard Refresh + Clear Cache
```bash
# Chrome/Edge:
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows)

# Safari:
Cmd+Option+R
```

### Paso 4: Verificar Estado React
```bash
# En DevTools Console:
// Ver si el componente tiene las llamadas
document.querySelector('[data-component="ScheduledCallsManager"]')

// O usar React DevTools:
// Components → ScheduledCallsManager → hooks → calls
```

---

## 🎯 SIGUIENTE ACCIÓN

**PRIORIDAD 1:** Hard refresh del navegador

```bash
1. Abrir módulo de programación
2. F12 (DevTools)
3. Cmd+Shift+R (hard refresh)
4. Ver si aparecen las llamadas
5. Revisar Console por errores
```

Si sigue sin mostrar:

**PRIORIDAD 2:** Agregar logs temporales

```typescript
// En scheduledCallsService.ts línea 85-88
if (!callsData || callsData.length === 0) {
  console.log('⚠️ [scheduledCallsService] Query trajo 0 llamadas');
  console.log('Query params:', { filters, userId, isAdminOrOperativo });
  return [];
}

// Agregar DESPUÉS de línea 94:
console.log(`✅ [scheduledCallsService] Usuario ${userId} es admin: ${isAdminOrOperativo}`);
console.log(`✅ [scheduledCallsService] Total llamadas ANTES de filtros: ${callsData.length}`);
console.log(`✅ [scheduledCallsService] Total llamadas DESPUÉS de filtros: ${filteredCallsData.length}`);
```

---

## 📝 Checklist

- [ ] Hard refresh navegador (Cmd+Shift+R)
- [ ] Verificar Console logs
- [ ] Verificar Network tab (request a llamadas_programadas)
- [ ] Verificar que `permissionsService.ts` esté compilado
- [ ] Agregar logs temporales si es necesario
- [ ] Verificar filtro de fecha en DailyView

---

**Última actualización:** 22 de Enero 2026  
**Estado:** En diagnóstico
