# Plan de Consolidacion de Documentacion

**Fecha**: 2025-12-15  
**Estado**: En Proceso

---

## Analisis de Documentacion Actual

### Estadisticas
- **Total archivos en /docs/**: 45
- **Archivos publicados en /public/docs/**: 8
- **Archivos duplicados/obsoletos identificados**: ~20
- **Archivos a consolidar**: 15

---

## Grupos de Documentacion Identificados

### 1. N8N Troubleshooting (4 archivos -> 1)

| Archivo Original | Estado | Contenido |
|-----------------|--------|-----------|
| N8N_CRITICAL_ISSUE.md | OBSOLETO | Diagnostico inicial 24-Nov |
| N8N_PROBLEMA_RESUELTO.md | OBSOLETO | Solucion HTTP/HTTPS |
| N8N_RESUELTO_FINAL.md | OBSOLETO | Solucion final |
| N8N_TROUBLESHOOTING_NAVEGADOR.md | MANTENER | Guia navegador |

**Accion**: Fusionar en `N8N_TROUBLESHOOTING_GUIDE.md`

---

### 2. Sistema de Permisos (4 archivos -> 1)

| Archivo Original | Estado | Contenido |
|-----------------|--------|-----------|
| PERMISSIONS_SYSTEM_README.md | PRINCIPAL | Doc tecnica completa |
| INSTRUCCIONES_NUEVO_SISTEMA_PERMISOS.md | ARCHIVAR | Instrucciones SQL |
| PLAN_IMPLEMENTACION_ROLES_PERMISOS.md | ARCHIVAR | Plan original |
| RESUMEN_IMPLEMENTACION_PERMISOS.md | ARCHIVAR | Resumen impl |

**Accion**: Mantener `PERMISSIONS_SYSTEM_README.md`, archivar resto

---

### 3. Sistema de Coordinaciones (4 archivos -> 1)

| Archivo Original | Estado | Contenido |
|-----------------|--------|-----------|
| RESUMEN_IMPLEMENTACION_COMPLETA.md | FUSIONAR | Resumen completo |
| INTEGRACION_COMPLETA.md | FUSIONAR | Integracion componentes |
| COORDINACIONES_NUEVA_LOGICA.md | FUSIONAR | Logica archivado |
| ESTADO_IMPLEMENTACION_COORDINACIONES.md | FUSIONAR | Estado impl |

**Accion**: Fusionar en `COORDINACIONES_SYSTEM_GUIDE.md`

---

### 4. Asignacion de Prospectos (3 archivos -> 1)

| Archivo Original | Estado | Contenido |
|-----------------|--------|-----------|
| GUIA_ASIGNACION_MANUAL_PROSPECTOS.md | FUSIONAR | Asignacion manual |
| GUIA_N8N_ASIGNACION_AUTOMATICA.md | FUSIONAR | Asignacion N8N |
| PROBLEMA_ASIGNACION_AUTOMATICA.md | FUSIONAR | Troubleshooting |
| GUIA_INSERTAR_LEAD_ASIGNADO_N8N.md | FUSIONAR | Insert lead N8N |

**Accion**: Fusionar en `PROSPECT_ASSIGNMENT_GUIDE.md`

---

### 5. WhatsApp (2 archivos -> mantener ambos)

| Archivo Original | Estado | Contenido |
|-----------------|--------|-----------|
| WHATSAPP_TEMPLATES_API.md | PUBLICADO | API de templates |
| WHATSAPP_TEMPLATES_CLASSIFICATION.md | PUBLICAR | Clasificacion |

**Accion**: Publicar ambos (son complementarios)

---

### 6. System UI (2 archivos -> 1)

| Archivo Original | Estado | Contenido |
|-----------------|--------|-----------|
| PLAN_ACTUALIZACION_SYSTEM_UI.md | ARCHIVAR | Plan original |
| RESUMEN_ACTUALIZACION_SYSTEM_UI.md | ARCHIVAR | Resumen |

**Accion**: Contenido ya integrado en otras docs

---

### 7. Archivos de Troubleshooting Especificos

| Archivo | Estado | Accion |
|---------|--------|--------|
| DEBUG_MODULO_EJECUTIVOS.md | ARCHIVAR | Problema resuelto |
| DIAGNOSTICO_PROSPECTOS_PERFORMANCE.md | ARCHIVAR | Problema resuelto |
| PROXIMOS_PASOS_MIGRACION.md | ARCHIVAR | Migracion completada |

---

### 8. Archivos a Mantener (Ya publicados o necesarios)

| Archivo | Estado | Categoria |
|---------|--------|-----------|
| CHANGELOG.md | PUBLICADO | Versiones |
| VERSIONS.md | PUBLICADO | Versiones |
| ARCHITECTURE_DIAGRAMS.md | PUBLICADO | Arquitectura |
| DATABASE_README.md | PUBLICADO | Base de Datos |
| LIVE_MONITOR_VIEW_DOCUMENTATION.md | PUBLICADO | Funcionalidades |
| ERROR_LOGGING_GUIDE.md | PUBLICADO | Operaciones |
| PERMISSIONS_SYSTEM_README.md | PUBLICADO | Seguridad |
| WHATSAPP_TEMPLATES_API.md | PUBLICADO | Integraciones |

---

## Nueva Estructura Propuesta

```
/public/docs/
  |-- CHANGELOG.md                    # Historial de versiones
  |-- VERSIONS.md                     # Control de versiones
  |-- ARCHITECTURE_DIAGRAMS.md        # Diagramas AWS
  |-- DATABASE_README.md              # Esquema de BD
  |-- PERMISSIONS_SYSTEM_README.md    # Sistema de permisos
  |-- COORDINACIONES_SYSTEM_GUIDE.md  # Sistema de coordinaciones
  |-- PROSPECT_ASSIGNMENT_GUIDE.md    # Guia de asignacion
  |-- N8N_TROUBLESHOOTING_GUIDE.md    # Troubleshooting N8N
  |-- LIVE_MONITOR_VIEW_DOCUMENTATION.md
  |-- WHATSAPP_TEMPLATES_API.md
  |-- WHATSAPP_TEMPLATES_CLASSIFICATION.md
  |-- ERROR_LOGGING_GUIDE.md
  |-- MARKDOWN_VIEWER_STYLING_GUIDE.md  # NUEVO
```

---

## Categorias para el Catalogo UI

1. **Versiones**
   - CHANGELOG.md
   - VERSIONS.md

2. **Arquitectura**
   - ARCHITECTURE_DIAGRAMS.md

3. **Base de Datos**
   - DATABASE_README.md

4. **Seguridad**
   - PERMISSIONS_SYSTEM_README.md

5. **Operaciones**
   - COORDINACIONES_SYSTEM_GUIDE.md
   - PROSPECT_ASSIGNMENT_GUIDE.md
   - N8N_TROUBLESHOOTING_GUIDE.md

6. **Funcionalidades**
   - LIVE_MONITOR_VIEW_DOCUMENTATION.md
   - WHATSAPP_TEMPLATES_API.md
   - WHATSAPP_TEMPLATES_CLASSIFICATION.md

7. **Guias de Desarrollo**
   - ERROR_LOGGING_GUIDE.md
   - MARKDOWN_VIEWER_STYLING_GUIDE.md

---

## Archivos a Archivar (mover a /docs/archive/)

```
INSTRUCCIONES_NUEVO_SISTEMA_PERMISOS.md
PLAN_IMPLEMENTACION_ROLES_PERMISOS.md
RESUMEN_IMPLEMENTACION_PERMISOS.md
RESUMEN_IMPLEMENTACION_COMPLETA.md
INTEGRACION_COMPLETA.md
COORDINACIONES_NUEVA_LOGICA.md
ESTADO_IMPLEMENTACION_COORDINACIONES.md
GUIA_ASIGNACION_MANUAL_PROSPECTOS.md
GUIA_N8N_ASIGNACION_AUTOMATICA.md
PROBLEMA_ASIGNACION_AUTOMATICA.md
GUIA_INSERTAR_LEAD_ASIGNADO_N8N.md
N8N_CRITICAL_ISSUE.md
N8N_PROBLEMA_RESUELTO.md
N8N_RESUELTO_FINAL.md
PLAN_ACTUALIZACION_SYSTEM_UI.md
RESUMEN_ACTUALIZACION_SYSTEM_UI.md
DEBUG_MODULO_EJECUTIVOS.md
DIAGNOSTICO_PROSPECTOS_PERFORMANCE.md
PROXIMOS_PASOS_MIGRACION.md
```

---

## Historial

| Fecha | Accion |
|-------|--------|
| 2025-12-15 | Plan de consolidacion creado |


