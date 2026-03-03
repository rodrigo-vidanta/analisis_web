# Skill: Modo Mantenimiento

Gestiona el modo mantenimiento de la plataforma PQNC QA AI.

## Trigger

Cuando el usuario diga: "mantenimiento", "maintenance", "poner en mantenimiento", "quitar mantenimiento", "activar mantenimiento", "desactivar mantenimiento", o use `/maintenance`.

## Archivos clave

| Archivo | Función |
|---------|---------|
| `src/App.tsx` | Flag `MAINTENANCE_MODE` + condicional que renderiza MaintenancePage |
| `src/components/MaintenancePage.tsx` | Página fullscreen con mensaje y tips de ventas |
| `src/components/HealthCheckGuard.tsx` | Auto-detección outage Supabase (wrapper opcional) |

## Modos de operación

### 1. Mantenimiento manual (sin HealthCheckGuard)

La plataforma se cierra completamente. Solo se reactiva cuando el usuario lo indique.

**Activar:**
```tsx
// src/App.tsx
import MaintenancePage from './components/MaintenancePage';
const MAINTENANCE_MODE = true;

function App() {
  if (MAINTENANCE_MODE) {
    return <MaintenancePage />;
  }
  // ...resto de la app
}
```

**Desactivar:**
- Cambiar `MAINTENANCE_MODE = true` → `MAINTENANCE_MODE = false`
- O comentar el import y el bloque if
- Hacer deploy

### 2. Mantenimiento con HealthCheckGuard (auto-detección)

La plataforma detecta automáticamente si Supabase está caído. Cuando se recupera, carga la app sola.

**Activar:**
```tsx
// src/App.tsx
import MaintenancePage from './components/MaintenancePage';
import HealthCheckGuard from './components/HealthCheckGuard';

function App() {
  return (
    <HealthCheckGuard>
      <AuthProvider>
        <MainApp />
        {/* ...resto */}
      </AuthProvider>
    </HealthCheckGuard>
  );
}
```

**Desactivar:**
- Quitar el wrapper `<HealthCheckGuard>` de App.tsx
- Hacer deploy

### HealthCheckGuard detalles
- Hace 2 checks silenciosos al inicio (2s gap) para evitar falsos positivos
- Si ambos fallan: muestra MaintenancePage + widget con polling cada 60s
- Endpoint: `system_config_public?select=config_key&limit=1`
- Requiere `response.ok` + JSON array con datos reales
- Widget en esquina inferior derecha con botón "Verificar ahora"

## Personalización del mensaje

Al activar, preguntar al usuario si quiere mensaje personalizado. Los textos editables están en `MaintenancePage.tsx`:

- **Título** (h1): línea con `text-4xl font-bold` — ej: "Mejorando tu experiencia"
- **Subtítulo** (p): línea con `text-indigo-300` — ej: "Volveremos en breve con novedades"
- **Status badge**: línea con `text-amber-300 uppercase` — ej: "Actualización en progreso"
- **Mensaje principal** (p): línea con `text-gray-300` — explicación para el usuario
- **Intro tips** (p): línea con `text-indigo-300 font-medium` — introduce los tips
- **Footer**: línea con `text-gray-600` — instrucción final

Los 25 tips de ventas rotan cada 10 segundos con animación blur/fade.

## Flujo del skill

1. **Preguntar al usuario:**
   - ¿Activar o desactivar mantenimiento?
   - Si activar: ¿Con o sin HealthCheckGuard?
   - Si activar: ¿Mensaje personalizado o usar el existente?

2. **Aplicar cambios en `src/App.tsx`:**
   - Descomentar/comentar imports según corresponda
   - Activar/desactivar `MAINTENANCE_MODE`
   - Agregar/quitar wrapper `HealthCheckGuard`

3. **Si mensaje personalizado:** editar textos en `MaintenancePage.tsx`

4. **Verificar build:** `npm run build`

5. **NO hacer deploy automático** — preguntar al usuario si quiere deploy

## Historial de uso

| Fecha | Motivo | Modo | Duración |
|-------|--------|------|----------|
| 2026-02-12 | Outage Supabase US-East-2 | HealthCheckGuard (auto) | ~3 horas |
| 2026-03-03 | Migración mensajería (bloqueo Meta → Twilio) | Manual (sin HCG) | En curso |
