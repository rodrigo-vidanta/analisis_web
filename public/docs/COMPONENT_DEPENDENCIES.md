# 🔗 Mapa de Dependencias de Componentes - PQNC QA AI Platform

**Fecha:** 2025-01-24  
**Versión:** 1.0.13  
**Propósito:** Documentar todas las dependencias de componentes para evitar eliminaciones accidentales

---

## ⚠️ **REFERENCIAS ROTAS DETECTADAS Y CORREGIDAS**

### **Problema Identificado (v1.0.13)**

Durante la limpieza de archivos temporales, se eliminaron componentes que aún estaban siendo importados:

| Archivo Eliminado | Archivo que lo Importaba | Solución Aplicada |
|-------------------|-------------------------|-------------------|
| `LightSpeedTransition.tsx` | `LoginScreen.tsx` | Import eliminado - se usa `LightSpeedTunnel` en `AuthContext` |
| `SimpleLightSpeed.tsx` | `LoginScreen.tsx` | Import eliminado - funcionalidad no utilizada |
| `AdvancedAgentEditor.tsx` | `AdminDashboard.tsx` | Reemplazado por `TemplateManager.tsx` |

### **Correcciones Aplicadas**

```typescript
// ANTES (LoginScreen.tsx):
import LightSpeedTransition from './LightSpeedTransition';
import SimpleLightSpeed from './SimpleLightSpeed';

// DESPUÉS (LoginScreen.tsx):
// Componentes de transición eliminados - se usa LightSpeedTunnel en AuthContext

// ANTES (AdminDashboard.tsx):
import AdvancedAgentEditor from './AdvancedAgentEditor';
return <AdvancedAgentEditor />;

// DESPUÉS (AdminDashboard.tsx):
import TemplateManager from './TemplateManager';
return <TemplateManager />;
```

---

## 📋 **MAPA COMPLETO DE DEPENDENCIAS**

### **🏠 COMPONENTES PRINCIPALES**

#### **MainApp.tsx**
```typescript
├── Header.tsx ✅
├── Footer.tsx ✅
├── Sidebar.tsx ✅ (NUEVO)
├── ProjectSelector.tsx ✅
├── LoginScreen.tsx ✅
├── IndividualAgentWizard.tsx ✅
├── AdminDashboard.tsx ✅
├── AnalysisDashboard.tsx ✅
└── AdminDashboardTabs.tsx ✅
```

#### **Header.tsx**
```typescript
├── useAuth() ✅
├── useSystemConfig() ✅
└── useUserProfile() ✅
```

#### **Sidebar.tsx** *(NUEVO)*
```typescript
├── useAuth() ✅
├── useUserProfile() ✅
├── useAppStore() ✅
└── useAnalysisPermissions() ✅ (NUEVO)
```

### **📊 MÓDULO DE ANÁLISIS**

#### **AnalysisDashboard.tsx**
```typescript
└── PQNCDashboard.tsx ✅
```

#### **PQNCDashboard.tsx**
```typescript
├── DetailedCallView.tsx ✅
├── BookmarkSelector.tsx ✅
├── BookmarkFilter.tsx ✅
├── AudioPlayer.tsx ✅
├── FeedbackModal.tsx ✅
└── UniversalDataView.tsx ✅
```

#### **DetailedCallView.tsx**
```typescript
├── UniversalDataView.tsx ✅
├── ComplianceChart.tsx ✅
├── AudioPlayer.tsx ✅
└── FeedbackTooltip.tsx ✅
```

### **⚙️ MÓDULO ADMINISTRATIVO**

#### **AdminDashboard.tsx**
```typescript
└── TemplateManager.tsx ✅
```

#### **AdminDashboardTabs.tsx**
```typescript
├── UserManagement.tsx ✅
├── SystemPreferences.tsx ✅
├── DatabaseConfiguration.tsx ✅
└── MyAgents.tsx ✅
```

#### **UserManagement.tsx**
```typescript
├── useAuth() ✅
└── AvatarUpload.tsx ✅
```

### **🔧 CONSTRUCTOR DE AGENTES**

#### **IndividualAgentWizard.tsx**
```typescript
├── PromptEditor.tsx ✅
├── ToolsEditor.tsx ✅
├── JsonViewer.tsx ✅
└── ReloadButton.tsx ✅
```

#### **TemplateManager.tsx**
```typescript
├── AgentTemplateCard.tsx ✅
├── ImportAgentModal.tsx ✅
├── EditAgentModal.tsx ✅
└── AgentCV.tsx ✅
```

---

## 🛡️ **SISTEMA DE PREVENCIÓN**

### **Antes de Eliminar Archivos**

1. **Búsqueda de Referencias**:
```bash
# Buscar todas las importaciones del archivo
grep -r "import.*NombreArchivo" src/

# Buscar referencias en JSX
grep -r "<NombreComponente" src/

# Buscar referencias dinámicas
grep -r "NombreArchivo" src/
```

2. **Verificación de Dependencias**:
```bash
# Usar herramientas de análisis
npx depcheck
npm run build # Verificar que compile sin errores
```

3. **Checklist de Eliminación**:
- [ ] ¿El archivo está importado en algún lugar?
- [ ] ¿Se usa en rutas dinámicas?
- [ ] ¿Es referenciado en configuraciones?
- [ ] ¿Tiene exports que otros archivos usan?

### **Componentes Seguros para Eliminar**

✅ **Archivos .backup**: Siempre eliminables  
✅ **Scripts temporales**: Con nombres descriptivos como `temp-`, `test-`, `debug-`  
✅ **SQL de desarrollo**: No referenciados en código  
✅ **Documentación duplicada**: Después de consolidar información

### **Componentes NUNCA Eliminar Sin Verificar**

❌ **Componentes en src/components/**: Siempre verificar dependencias  
❌ **Hooks en src/hooks/**: Pueden ser usados dinámicamente  
❌ **Servicios en src/services/**: Importados en múltiples lugares  
❌ **Configuraciones**: Config, stores, contexts

---

## 📚 **DEPENDENCIAS EXTERNAS**

### **Hooks Personalizados**

| Hook | Usado en | Propósito |
|------|----------|-----------|
| `useAuth()` | MainApp, Sidebar, Header, UserManagement | Autenticación |
| `useAnalysisPermissions()` | Sidebar | Permisos granulares |
| `useSystemConfig()` | Header, LoginScreen | Configuración |
| `useUserProfile()` | Header, Sidebar | Datos de usuario |
| `useAppStore()` | MainApp, Sidebar, ProjectSelector | Estado global |

### **Servicios**

| Servicio | Usado en | Propósito |
|----------|----------|-----------|
| `authService` | AuthContext | Autenticación |
| `feedbackService` | PQNCDashboard, DetailedCallView | Retroalimentación |
| `bookmarkService` | PQNCDashboard, BookmarkSelector | Marcadores |
| `audioService` | AudioPlayer | Reproducción de audio |
| `supabaseService` | TemplateManager, ImportAgentModal | Base de datos |

### **Configuraciones Críticas**

| Archivo | Dependientes | Nunca Eliminar |
|---------|--------------|----------------|
| `supabase.ts` | Toda la app | ❌ CRÍTICO |
| `pqncSupabase.ts` | Módulo análisis | ❌ CRÍTICO |
| `appStore.ts` | Estado global | ❌ CRÍTICO |
| `AuthContext.tsx` | Toda la app | ❌ CRÍTICO |

---

## 🔍 **HERRAMIENTAS DE VERIFICACIÓN**

### **Script de Verificación de Dependencias**

```bash
#!/bin/bash
# scripts/check-dependencies.sh

echo "🔍 Verificando dependencias..."

# Buscar imports rotos
echo "📋 Buscando imports rotos..."
find src/ -name "*.tsx" -o -name "*.ts" | xargs grep -l "import.*from '\./[^']*'" | while read file; do
  grep "import.*from '\./[^']*'" "$file" | while read line; do
    imported=$(echo "$line" | sed -n "s/.*from '\.\([^']*\)'.*/\1/p")
    if [ ! -f "$(dirname "$file")$imported.tsx" ] && [ ! -f "$(dirname "$file")$imported.ts" ]; then
      echo "❌ IMPORT ROTO: $file → $imported"
    fi
  done
done

echo "✅ Verificación completada"
```

### **Comando de Verificación Rápida**

```bash
# Antes de eliminar cualquier archivo, ejecutar:
npm run build
```

Si el build falla, hay dependencias rotas que deben corregirse.

---

## 📝 **REGISTRO DE CAMBIOS**

### **v1.0.13 - Referencias Rotas Corregidas**

| Timestamp | Archivo | Acción | Razón |
|-----------|---------|--------|-------|
| 2025-01-24 23:45 | `LightSpeedTransition.tsx` | Eliminado | No utilizado, se usa `LightSpeedTunnel` |
| 2025-01-24 23:45 | `SimpleLightSpeed.tsx` | Eliminado | No utilizado |
| 2025-01-24 23:45 | `AdvancedAgentEditor.tsx` | Eliminado | Reemplazado por `TemplateManager` |
| 2025-01-24 23:46 | `LoginScreen.tsx` | Corregido | Eliminados imports rotos |
| 2025-01-24 23:46 | `AdminDashboard.tsx` | Corregido | Actualizado a `TemplateManager` |

---

## 🎯 **RECOMENDACIONES**

### **Para Futuras Limpiezas**

1. **Crear branch** para limpieza: `git checkout -b cleanup/remove-unused`
2. **Verificar dependencias** antes de eliminar
3. **Probar aplicación** después de cada eliminación
4. **Documentar cambios** en este archivo
5. **Merge solo si todo funciona**

### **Mantenimiento Preventivo**

- **Revisión mensual**: Buscar archivos no utilizados
- **Análisis de dependencias**: Usar herramientas automatizadas
- **Documentación actualizada**: Mantener este mapa actualizado
- **Tests de integración**: Verificar que todo funciona después de cambios

La aplicación ahora está **completamente funcional**, **perfectamente documentada** y **lista para producción** sin archivos innecesarios. 🚀
