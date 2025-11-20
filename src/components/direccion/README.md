# 📅 Módulo Timeline de Dirección

## Descripción

Módulo completamente desacoplado visualmente del proyecto principal, diseñado específicamente para usuarios con rol "direccion". Proporciona una interfaz de timeline vertical para gestionar actividades y pendientes con fechas de compromiso.

## Características

- ✅ **Diseño oscuro minimalista** tipo portafolio de arte
- ✅ **Timeline vertical** con animaciones modernas usando Framer Motion
- ✅ **Procesamiento con LLM** vía webhook N8N para estructurar actividades desde texto libre
- ✅ **Detección de duplicados** inteligente antes de guardar
- ✅ **Previsualización** de actividades procesadas con opción de eliminar duplicados
- ✅ **Modales elegantes** para agregar y ver detalles de actividades
- ✅ **Acceso directo** desde login para usuarios con rol "direccion"
- ✅ **Botón de acceso** en Header para administradores

## Estructura de Archivos

```
src/
├── components/
│   └── direccion/
│       ├── Timeline.tsx          # Componente principal del timeline
│       └── README.md              # Esta documentación
├── services/
│   └── timelineService.ts        # Servicio para operaciones CRUD y procesamiento LLM
└── scripts/
    └── sql/
        └── create_direccion_role_and_timeline.sql  # Script de creación de rol y tabla
```

## Base de Datos

### Tabla: `timeline_activities`

```sql
- id: UUID (PK)
- user_id: UUID (FK a auth_users)
- title: VARCHAR(500) - Título de la actividad
- description: TEXT - Descripción detallada
- due_date: DATE - Fecha compromiso de realización
- status: VARCHAR(50) - pending, in_progress, completed, cancelled
- priority: VARCHAR(20) - low, medium, high, urgent
- metadata: JSONB - Metadatos adicionales
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- completed_at: TIMESTAMP (nullable)
```

### Rol: `direccion`

- Nombre: `direccion`
- Display Name: `Dirección`
- Permiso: `direccion.view`

## Flujo de Usuario

### Usuario con rol "direccion"
1. Inicia sesión → Redirección automática al timeline
2. Ve timeline vacío o con actividades existentes
3. Click en botón `+` → Modal para agregar actividades
4. Escribe lista de actividades con fechas en texto libre
5. Click en "Procesar con IA" → Envía a webhook N8N
6. Previsualiza actividades estructuradas
7. Elimina duplicados si los hay
8. Guarda actividades → Se actualiza el timeline

### Administrador
1. Accede desde botón "Dirección" en Header
2. Puede ver y gestionar actividades
3. Puede salir del modo dirección con botón "Salir"
4. Usuarios dirección hacen logout al salir

## Webhook N8N

**Endpoint:** `https://primary-dev-d75a.up.railway.app/webhook/timeline`

**Método:** POST

**Payload esperado:**
```json
{
  "text": "Revisar presupuesto Q1 el 15 de febrero\nReunión con equipo el 20 de febrero"
}
```

**Respuesta esperada:**
```json
{
  "activities": [
    {
      "title": "Revisar presupuesto Q1",
      "description": "Revisión del presupuesto del primer trimestre",
      "due_date": "2025-02-15",
      "priority": "high"
    },
    {
      "title": "Reunión con equipo",
      "description": "Reunión de seguimiento con el equipo",
      "due_date": "2025-02-20",
      "priority": "medium"
    }
  ]
}
```

## Instalación

1. Ejecutar script SQL para crear rol y tabla:
```bash
# Ejecutar en Supabase SQL Editor
scripts/sql/create_direccion_role_and_timeline.sql
```

2. Asignar rol "direccion" a usuarios en la tabla `auth_users`:
```sql
UPDATE auth_users 
SET role_id = (SELECT id FROM auth_roles WHERE name = 'direccion')
WHERE email = 'usuario@ejemplo.com';
```

## Tecnologías Utilizadas

- **React 19** - Framework UI
- **Framer Motion** - Animaciones fluidas
- **TailwindCSS** - Estilos minimalistas
- **Lucide React** - Iconos vectorizados
- **React Hot Toast** - Notificaciones
- **Supabase** - Base de datos y autenticación

## Diseño Visual

- **Fondo:** Negro puro (`bg-black`)
- **Cards:** Fondo semitransparente con blur (`bg-white/5 backdrop-blur-sm`)
- **Bordes:** Delicados (`border-white/10`)
- **Gradientes:** Purple → Blue para elementos destacados
- **Tipografía:** Font-light para títulos, tracking-wider para labels
- **Animaciones:** Entrada suave, hover effects, transiciones de 300ms

## Permisos y Seguridad

- **RLS habilitado** en tabla `timeline_activities`
- Usuarios solo ven sus propias actividades
- Administradores pueden ver todas las actividades
- Verificación de permisos en `authService.canAccessModule('direccion')`

## Próximas Mejoras

- [ ] Filtros por estado y prioridad
- [ ] Búsqueda de actividades
- [ ] Exportación a PDF/Excel
- [ ] Notificaciones de actividades próximas
- [ ] Sincronización con calendarios externos
- [ ] Etiquetas personalizadas
- [ ] Archivos adjuntos

