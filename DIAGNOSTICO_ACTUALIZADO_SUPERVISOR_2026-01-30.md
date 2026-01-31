# Diagnóstico Actualizado: Supervisora no puede programar llamadas

## 📊 Datos del Prospecto Probado

**Prospecto ID:** `aaedd700-0758-453d-98c2-eca11447e207`  
**Nombre:** Sandra Nieto Mancilla  
**WhatsApp:** 5215630347503  
**Etapa:** Discovery (código: `discovery`)

### ✅ Confirmaciones
- ✅ Prospecto NO está en etapa "Importado Manual"
- ✅ Etapa "Discovery" NO tiene restricciones
- ✅ El prospecto SÍ tiene llamadas programadas previamente
- ✅ Última llamada programada por Mayra Gonzalez (ejecutada exitosamente)

## 🔍 Análisis del Problema Real

Dado que:
1. El prospecto NO está en etapa restringida
2. Otras personas SÍ pueden programar llamadas a este prospecto
3. La supervisora dice "llamada programada" pero NO aparece en BD

**Posibles causas:**

### Causa 1: Error en el Frontend (Toast Falso Positivo)
- El botón "Llamada" está habilitado (correcto)
- El usuario hace clic y aparece modal
- Modal muestra "Llamada programada exitosamente" (toast)
- **PERO** el request a la Edge Function falló silenciosamente

**Verificar:**
- Console logs del navegador (F12)
- Network tab para ver si el request a `trigger-manual-proxy` retorna 200 o error

### Causa 2: Edge Function Retorna Success Pero N8N Falla
- Edge Function recibe el request correctamente
- Edge Function llama al webhook de N8N
- N8N retorna error PERO Edge Function lo interpreta como success

**Verificar:**
- Logs de Edge Function en Supabase Dashboard
- Logs de N8N workflow "Logica de llamadas programadas [PROD]"

### Causa 3: Permisos de Usuario en N8N
- El workflow de N8N tiene validaciones de rol/permisos
- Rechaza llamadas programadas por supervisores
- NO inserta en BD

**Verificar:**
- Workflow N8N para ver si filtra por rol
- Variable `programada_por_id` en el payload

## 🧪 Pasos para Debugging

### 1. Verificar en Browser (Chrome DevTools)
```javascript
// Abrir console (F12) antes de programar llamada
// Filtrar por "trigger-manual"
// Ver request/response
```

### 2. Verificar Edge Function Logs
```bash
# En Supabase Dashboard
# Functions > trigger-manual-proxy > Logs
# Buscar requests de user_id: 2a0a5e21-b773-413d-ae8c-c44fd3451001
```

### 3. Verificar N8N Workflow
```
Workflow: "Logica de llamadas programadas [PROD]"
ID: HYRGSVN86YY64pBS
Buscar execuciones recientes con:
- prospecto_id: aaedd700-0758-453d-98c2-eca11447e207
- user_email: isselrico@vidavacations.com
```

## 📝 Información para Reporte a N8N

Si el problema está en N8N, reportar:

```json
{
  "prospecto_id": "aaedd700-0758-453d-98c2-eca11447e207",
  "user_id": "2a0a5e21-b773-413d-ae8c-c44fd3451001",
  "user_email": "isselrico@vidavacations.com",
  "user_role": "supervisor",
  "justificacion": "[lo que haya escrito]",
  "scheduled_timestamp": "[timestamp ISO]",
  "schedule_type": "now" o "scheduled"
}
```

## ✅ Fix Aplicado (Sigue Siendo Válido)

El fix de agregar `supervisor` a `EXEMPT_ROLES` sigue siendo correcto porque:
- Previene problemas futuros con prospectos en "Importado Manual"
- Es consistente con la jerarquía de roles (supervisores > coordinadores)

---

**Próximo paso:** Pedirle a Issel Rico que intente programar una llamada mientras tiene DevTools abierto y compartir el error del console.
