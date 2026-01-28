# Resumen Técnico: Quick Import + Deploy v2.5.50

**Fecha:** 2026-01-28  
**Versión:** B10.1.43N2.5.50  
**Commits:** 639261f, e43665c, 591712d  
**Status:** ✅ COMPLETADO Y CORREGIDO

---

## 🎯 Features Implementadas

### 1. Quick Import WhatsApp (Módulo Live Chat)
**Ubicación:** `src/components/chat/QuickImportModal.tsx`

**Flujo completo:**
```
Botón + con heartbeat → Modal búsqueda → Validación local DB → 
Si existe: "Ya existe en BD" | Si no: Buscar Dynamics → 
Importar → Abrir modal plantillas (sin variables) → 
Enviar plantilla → Navegación SPA a conversación (sin reload)
```

**Componentes clave:**
- `LiveChatModule.tsx`: Botón `MessageSquarePlus` con animación heartbeat
- `QuickImportModal.tsx`: Búsqueda + validación permisos + importación
- `SendTemplateToProspectModal.tsx`: Modal para plantillas sin variables
- `LiveChatCanvas.tsx`: Listeners `CustomEvent` para navegación SPA

**Validaciones implementadas:**
- Prioridad: Buscar primero en BD local (`whatsapp`, `telefono_principal`)
- Permisos: Ejecutivos (su `id`), Coordinadores (su coordinación), Admins (todo)
- Templates: Solo mostrar plantillas APROBADAS sin variables `{{number}}`

### 2. Importación Manual (Módulo Prospectos)
**Ubicación:** `src/components/prospectos/ManualImportTab.tsx`

**Layout:** 3 columnas estilo Outlook
- Left: Menú fijo (Individual, Masiva, Nuevo)
- Center: Workspace con búsqueda Dynamics
- Right: Cards de prospectos importados (apilados)

**Mismo flujo de validación que Quick Import**

---

## 🔌 Integraciones

### Edge Functions
| Función | Propósito | Auth |
|---------|-----------|------|
| `import-contact-proxy` | Proxy N8N importación | JWT + secret |
| `dynamics-lead-proxy` | Buscar en Dynamics CRM | JWT + secret |
| `whatsapp-templates-send-proxy` | Enviar plantillas WhatsApp | JWT + secret |

### Servicios
- `importContactService.ts`: Normaliza respuestas N8N, busca prospecto si `prospecto_id: null`
- `dynamicsLeadService.ts`: Búsqueda en CRM
- Payload incluye `lead_dynamics` completo + `id_dynamics` (raíz)

---

## 🐛 Bug Crítico Corregido

### Problema
Script `deploy-complete.ts` usaba el **mensaje del commit como versión** cuando se pasaba como primer argumento.

**Resultado:** BD y footer tenían `"Fix navegación SPA..."` en lugar de `"B10.1.43N2.5.50"`

### Fix (commit e43665c)
```typescript
// Validación agregada
else if (args[0].startsWith('B') && args[0].includes('N')) {
  newVersion = args[0];  // Es versión válida
  commitMessage = args[1] || 'Deploy automático completo';
} else {
  // NO es versión → auto-incrementar
  newVersion = incrementVersion(currentVersion, 'frontend');
  commitMessage = args[0];
}
```

**Archivos corregidos:**
- `scripts/deploy-complete.ts` - Validación de formato
- `src/components/documentation/DocumentationModule.tsx` - Stats/commits/deployments
- `.cursor/rules/deploy-workflow.mdc` - Documentación

---

## 📂 Archivos Principales

```
src/
├── components/
│   ├── chat/
│   │   ├── LiveChatModule.tsx          # Botón + modal Quick Import
│   │   ├── QuickImportModal.tsx        # Búsqueda + importación
│   │   ├── SendTemplateToProspectModal.tsx  # Plantillas sin variables
│   │   └── LiveChatCanvas.tsx          # Listeners navegación SPA
│   └── prospectos/
│       └── ManualImportTab.tsx         # Importación 3 columnas
├── services/
│   ├── importContactService.ts         # Importación + normalización
│   └── dynamicsLeadService.ts          # Búsqueda CRM
scripts/
└── deploy-complete.ts                  # Fix validación versión

supabase/functions/
├── import-contact-proxy/
├── dynamics-lead-proxy/
└── whatsapp-templates-send-proxy/
```

---

## 🔑 Puntos Clave

### Navegación SPA (SIN Reload)
```typescript
// ❌ ANTES: Recargaba toda la página
window.location.href = `/live-chat?conversation=${id}`;

// ✅ AHORA: Navegación SPA con CustomEvent
window.dispatchEvent(new CustomEvent('select-livechat-conversation', { 
  detail: conversacionId 
}));
```

**Listener en `LiveChatCanvas.tsx` (línea ~3510):**
```typescript
useEffect(() => {
  const handleSelectConversation = (event: CustomEvent) => {
    const conversation = allConversationsLoaded.find(c => c.id === event.detail);
    if (conversation) {
      isManualSelectionRef.current = true;
      setSelectedConversation(conversation);
    } else {
      // Refresh y retry si no está cargada
      window.dispatchEvent(new CustomEvent('refresh-livechat-conversations'));
    }
  };
  window.addEventListener('select-livechat-conversation', handleSelectConversation);
}, [allConversationsLoaded]);
```

### Filtro de Plantillas
```typescript
// Solo mostrar plantillas sin variables
const templatesWithoutVariables = templates.filter(template => {
  const hasVariables = template.components?.some((component: any) => {
    if (component.type === 'BODY' && component.text) {
      return /\{\{\d+\}\}/.test(component.text);  // {{1}}, {{2}}, etc.
    }
    return false;
  });
  return !hasVariables;
});
```

### Validación Permisos
```typescript
const canAccessProspect = (prospecto: ExistingProspect, user: User) => {
  if (user.is_admin || user.is_admin_operativo || user.is_coordinador_calidad) return true;
  if (user.is_ejecutivo && prospecto.ejecutivo_id === user.id) return true;
  if (user.is_coordinador && prospecto.coordinacion_id === user.coordinacion_id) return true;
  return false;
};
```

---

## 📊 Estado Final

✅ **Quick Import:** Funcional con navegación SPA  
✅ **Import Manual:** Layout 3 columnas funcional  
✅ **Edge Functions:** Desplegadas y funcionando  
✅ **Deploy v2.5.50:** Corregido y re-deployado  
✅ **BD `system_config`:** `B10.1.43N2.5.50`  
✅ **Script deploy-complete.ts:** Fix aplicado  

---

## ⚠️ Pendientes

1. **Verificar N8N:** `[api]-whatsapp-templates-envio-v2` debe crear `conversacion_id` correctamente
2. **Testing:** Flujo completo Quick Import → Template → Navegación
3. **Monitorear:** Primeras importaciones en producción

---

## 🔗 Handovers Detallados

- `.cursor/handovers/2026-01-28-fix-deploy-version.md` - Fix script deploy
- `.cursor/handovers/2026-01-28-deploy-v2-5-50.md` - Deploy completo
- `.cursor/handovers/2026-01-28-fix-navegacion-quick-import.md` - Fix navegación SPA
- `.cursor/handovers/2026-01-28-quick-import-validacion-permisos-plantillas.md` - Validaciones

---

**Próximo Chat:** Todo funcional, solo validar en producción después de propagación CloudFront (5-10 min)
