# 📊 MÓDULO DYNAMICS CRM MANAGER

## 🏗️ ARQUITECTURA GENERAL

**Módulo:** Gestión de comparación y sincronización con Microsoft Dynamics CRM
**Propósito:** Comparar prospectos locales con Dynamics, detectar discrepancias y reasignar ejecutivos
**Versión:** 1.0.0 (Diciembre 2025)
**Estado:** ✅ Producción

---

## 📋 FUNCIONALIDADES

### 1. **Búsqueda de Prospectos**
- Búsqueda por nombre, email o teléfono
- Filtros por coordinación
- Filtro por estado de Dynamics (con/sin ID)
- Resultados paginados (máximo 50)

### 2. **Comparación con Dynamics CRM**
- Búsqueda en Dynamics por:
  - ID de Dynamics (preferido)
  - Email
  - Teléfono (10 dígitos)
- Detección automática de discrepancias
- Campos comparados:
  - Nombre
  - Email
  - Estado Civil
  - Coordinación
  - Propietario/Ejecutivo

### 3. **Reasignación de Ejecutivos**
- Selector de coordinación con filtro
- Selector de ejecutivos por coordinación
- Barra de progreso durante la reasignación
- Sincronización automática con Dynamics CRM
- Timeout de 80 segundos

### 4. **Sincronización con CRM** (En construcción)
- Botón marcado como "En construcción"
- Funcionalidad futura para actualizar datos en CRM

---

## 🔌 INTEGRACIONES

### Webhook de Consulta de Leads
```
URL: https://primary-dev-d75a.up.railway.app/webhook/lead-info
Método: POST
Headers: 
  - Content-Type: application/json
  - Authorization: Bearer {token}
```

**Payload de búsqueda por ID:**
```json
{
  "id_dynamics": "e1fea875-dc46-f011-8779-6045bd0863ef"
}
```

**Payload de búsqueda por email:**
```json
{
  "email": "ejemplo@email.com"
}
```

**Payload de búsqueda por teléfono:**
```json
{
  "phone": "5512345678"
}
```

**Respuesta:**
```json
{
  "LeadID": "87464449-1449-ee11-be6d-00224806cd44",
  "Nombre": "NOMBRE COMPLETO",
  "Email": "<EMAIL>;<>;<>",
  "EstadoCivil": "Married",
  "Ocupacion": "Other",
  "Pais": "MEXICO",
  "EntidadFederativa": "",
  "Coordinacion": "MVP",
  "CoordinacionID": "d8faf90c-f74b-f011-877a-6045bd04139c",
  "Propietario": "Nombre del Propietario",
  "OwnerID": "d4c3e8c0-ae63-ed11-9561-002248081932",
  "FechaUltimaLlamada": "2025-05-22T00:00:00Z",
  "Calificacion": "Q Premium"
}
```

### Webhook de Reasignación
```
URL: https://primary-dev-d75a.up.railway.app/webhook/reasignar-prospecto
Método: POST
Timeout: 80 segundos
```

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
src/
├── services/
│   ├── dynamicsLeadService.ts     # Servicio de consulta de leads
│   └── dynamicsReasignacionService.ts # Servicio de reasignación (existente)
├── components/
│   └── admin/
│       ├── DynamicsCRMManager.tsx  # Componente principal
│       ├── README_DYNAMICS_CRM.md  # Esta documentación
│       └── CHANGELOG_DYNAMICS_CRM.md # Historial de cambios
```

---

## 🎨 DISEÑO UI

### Paleta de Colores
- **Primario:** Gradiente purple-500 → blue-500
- **Sincronizado:** Emerald-500
- **Desincronizado:** Amber-500
- **Error:** Red-500
- **Sin CRM:** Gray-500

### Componentes Clave
- **Header:** Logo con gradiente, título y filtros
- **Panel izquierdo:** Lista de prospectos locales
- **Panel derecho:** Comparación con Dynamics
- **Modal de reasignación:** Con selectores y barra de progreso

### Estados de Sincronización
| Estado | Icono | Color | Descripción |
|--------|-------|-------|-------------|
| synced | ✅ | Emerald | Datos coinciden |
| out_of_sync | ⚠️ | Amber | Hay discrepancias |
| not_found | ☁️ | Gray | No existe en CRM |
| error | ❌ | Red | Error de consulta |

### Severidad de Discrepancias
| Severidad | Color | Campos |
|-----------|-------|--------|
| error | Red | Coordinación, Propietario |
| warning | Amber | Nombre, Email |
| info | Blue | Estado Civil |

---

## 🔐 PERMISOS

### Acceso al Módulo
El módulo Dynamics CRM está disponible para los siguientes roles:

| Rol | Acceso | Notas |
|-----|--------|-------|
| **admin** | ✅ Completo | Acceso total a todas las funcionalidades |
| **administrador_operativo** | ✅ Completo | Acceso total a todas las funcionalidades |
| **coordinador (Calidad)** | ✅ Completo | Solo coordinadores asignados a la coordinación "CALIDAD" |
| **coordinador (otros)** | ❌ Sin acceso | No pueden ver el módulo |
| **ejecutivo** | ❌ Sin acceso | No pueden ver el módulo |
| **supervisor** | ❌ Sin acceso | No pueden ver el módulo |

### Verificación de Permisos
```typescript
// El acceso se verifica de la siguiente manera:
const hasAccess = isAdmin || isAdminOperativo || await permissionsService.isCoordinadorCalidad(userId);
```

### Permisos de Reasignación
Heredados del servicio `dynamicsReasignacionService`:
- admin
- administrador_operativo
- coordinador
- coordinador_calidad

---

## ⚙️ CONFIGURACIÓN

### Variables de Entorno
```env
# Webhook de consulta de leads
VITE_N8N_GET_LEAD_DYNAMICS_URL=https://primary-dev-d75a.up.railway.app/webhook/lead-info

# Token de autenticación para Dynamics
VITE_N8N_DYNAMICS_TOKEN=sAEhQEoCV51Vf0xIiLyrBGJK8OJjRHA1BxHwa2K2ObT2jMC9qtXVVbYX8cRoKYiLmKQfl41l9IWQ79c4GXoqIpgVePyOvDtwWrZJ6Qv1iU8tWd6vxqqhaaG6qG1DrIzjHyJ69pbv2C1lRjMIqSqYGo0wGhPXSMK2EauyWWIBA
```

### Timeouts
- **Consulta de lead:** 30 segundos
- **Reasignación:** 80 segundos

---

## 📈 MÉTRICAS Y LOGS

### Logs de Consola
```
🔍 [DynamicsLead] Buscando lead por {tipo}
✅ [DynamicsLead] Respuesta recibida
❌ [DynamicsLead] Error en webhook
⏱️ [DynamicsLead] Timeout al consultar Dynamics
```

---

## 🚀 USO

1. Acceder al módulo de Administración
2. Seleccionar la pestaña "Dynamics CRM"
3. Buscar un prospecto por nombre/email/teléfono
4. Seleccionar prospecto de la lista
5. Ver comparación automática con Dynamics
6. Si hay discrepancias, usar "Reasignar Ejecutivo" para corregir

---

## 📋 ROADMAP

### v1.1.0 (Próximo)
- [ ] Sincronización bidireccional de datos
- [ ] Actualización de campos en CRM
- [ ] Historial de sincronizaciones

### v1.2.0
- [ ] Bulk actions (reasignación masiva)
- [ ] Exportación de discrepancias a CSV
- [ ] Alertas automáticas por discrepancias críticas

---

## 🔧 TROUBLESHOOTING

### El webhook no responde
1. Verificar que el token sea válido
2. Verificar conectividad con railway.app
3. Revisar logs en N8N

### Timeout en reasignación
- Es normal que tome hasta 80 segundos
- Dynamics puede estar procesando
- Verificar manualmente en Dynamics si se completó

### No se encuentra el lead
- Verificar que el prospecto tenga id_dynamics, email o teléfono
- El teléfono debe tener 10 dígitos
- El email debe coincidir exactamente

---

## 📚 REFERENCIAS

- [Servicio de Reasignación](../../services/dynamicsReasignacionService.ts)
- [Servicio de Coordinaciones](../../services/coordinacionService.ts)
- [AdminDashboardTabs](./AdminDashboardTabs.tsx)

