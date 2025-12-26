# 🎯 Plan de Migración - Headers de Módulos
## Diseño Slim Minimalista Homologado

---

## 📋 PATRÓN ESTANDARIZADO

### Estructura del Header Slim:

```tsx
<div className="border-b border-neutral-100 dark:border-neutral-700 px-6 py-2.5 bg-white dark:bg-neutral-800 sticky top-0 z-20">
  <div className="flex items-center space-x-4">
    {/* Icono vectorizado del módulo - SIN TÍTULO */}
    <div className="w-8 h-8 bg-[COLOR]-500 rounded-lg flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-white" />
    </div>
    
    {/* Tabs o navegación */}
    <Tabs 
      tabs={tabs}
      activeTab={activeTab}
      onChange={setActiveTab}
      variant="default"
    />
  </div>
</div>
```

### Características:
- ✅ Padding vertical: `py-2.5` (10px) - MÁS SLIM
- ✅ Sin título del módulo
- ✅ Solo icono vectorizado 32x32px (w-8 h-8)
- ✅ Icono interno 20px (w-5 h-5)
- ✅ Espaciado: `space-x-4` (16px)
- ✅ Colores neutrales homologados
- ✅ Border inferior sutil

---

## 🎨 MAPEO DE MÓDULOS Y COLORES

| Módulo | Icono | Color | Archivo |
|--------|-------|-------|---------|
| **WhatsApp** | MessageCircle | `success-500` (verde) | LiveChatModule.tsx ✅ |
| **Live Monitor** | PhoneCall | `info-500` (azul) | LiveMonitorKanban.tsx |
| **Análisis IA** | BarChart3 | `accent-500` (púrpura) | AnalysisIAComplete.tsx |
| **Prospectos** | Users | `primary-500` (índigo) | ProspectosManager.tsx |
| **Programadas** | Calendar | `warning-500` (ámbar) | ScheduledCallsManager.tsx |
| **Dashboard** | Grid | `neutral-700` (gris) | OperativeDashboard.tsx (sin header) |
| **Admin** | Settings | `accent-600` (púrpura oscuro) | AdminDashboardTabs.tsx |
| **AWS** | Cloud | `warning-600` (naranja) | AWSManager.tsx |
| **Campaigns** | Megaphone | `primary-600` (índigo oscuro) | CampaignsDashboardTabs.tsx |

---

## 📝 CHECKLIST POR MÓDULO

### ✅ WhatsApp (LiveChatModule)
- [x] Header slim (py-2.5)
- [x] Sin título
- [x] Icono success-500
- [x] Componente Tabs
- [x] Colores neutral-*
- [x] Card e Input en settings

### 🔄 Live Monitor (LiveMonitorKanban)
- [ ] Header slim
- [ ] Sin título
- [ ] Icono info-500 (azul)
- [ ] Navegación simplificada
- [ ] Colores neutral-*

### 🔄 Análisis IA (AnalysisIAComplete)
- [ ] Header slim
- [ ] Sin título
- [ ] Icono accent-500 (púrpura)
- [ ] Tabs de navegación
- [ ] Colores neutral-*

### 🔄 Prospectos (ProspectosManager)
- [ ] Header slim
- [ ] Sin título
- [ ] Icono primary-500 (índigo)
- [ ] Tabs vista (Kanban/Lista)
- [ ] Colores neutral-*

### 🔄 Programadas (ScheduledCallsManager)
- [ ] Header slim
- [ ] Sin título
- [ ] Icono warning-500 (ámbar)
- [ ] Tabs de vista (Día/Semana)
- [ ] Colores neutral-*

### 🔄 Admin (AdminDashboardTabs)
- [ ] Header slim
- [ ] Sin título
- [ ] Icono accent-600
- [ ] Tabs de administración
- [ ] Colores neutral-*

### 🔄 AWS (AWSManager)
- [ ] Header slim
- [ ] Sin título
- [ ] Icono warning-600
- [ ] Tabs de servicios
- [ ] Colores neutral-*

---

## 🎨 COLORES POR TIPO DE MÓDULO

### Operativos (Trabajo diario):
- WhatsApp: `success-500` (verde) → Comunicación activa
- Live Monitor: `info-500` (azul) → Monitoreo en tiempo real
- Prospectos: `primary-500` (índigo) → Gestión principal

### Análisis y Reportes:
- Análisis IA: `accent-500` (púrpura) → Inteligencia artificial
- Programadas: `warning-500` (ámbar) → Tiempo/calendario

### Administración:
- Admin: `accent-600` (púrpura oscuro) → Configuración avanzada
- AWS: `warning-600` (naranja) → Infraestructura crítica

### Campañas:
- Campaigns: `primary-600` (índigo oscuro) → Marketing

---

## 🚀 ORDEN DE MIGRACIÓN SUGERIDO

### Prioridad Alta (esta semana):
1. ✅ WhatsApp (completado)
2. Live Monitor (más usado)
3. Prospectos (crítico)

### Prioridad Media (próxima semana):
4. Análisis IA
5. Programadas
6. Admin

### Prioridad Baja (cuando se pueda):
7. AWS
8. Campaigns

---

## 📏 MEDIDAS EXACTAS

### Padding Vertical:
```css
/* Antes */
py-4   → 16px (arriba/abajo)

/* Después */
py-2.5 → 10px (arriba/abajo)
```

**Reducción:** 37.5% menos padding

### Iconos:
```tsx
/* Container */
w-8 h-8  → 32x32px (rounded-lg)

/* Icono interno */
w-5 h-5  → 20px (ICON_SIZES.md)
```

### Espaciado:
```tsx
space-x-4  → 16px horizontal entre icono y tabs
```

---

## ✅ BENEFICIOS DEL PATRÓN

1. **Más espacio para contenido** - Header 37.5% más compacto
2. **Minimalismo visual** - Sin títulos redundantes
3. **Identificación por color** - Cada módulo tiene su color
4. **Consistencia total** - Mismo patrón en todos
5. **Mejor UX** - Menos ruido visual
6. **Profesional** - Diseño moderno y limpio

---

**Próximo:** Migrar Live Monitor, Prospectos y Análisis IA

