# 📋 Documentación de Clasificación de Plantillas WhatsApp

## Descripción General

El sistema de clasificación de plantillas WhatsApp permite segmentar y categorizar las plantillas de mensajes para enviarlas a los prospectos correctos. Esta información se envía al webhook N8N en un array separado llamado `classification`.

---

## 📊 Estructuras de Datos

### TemplateClassification

```typescript
interface TemplateClassification {
  // Etapa del prospecto objetivo
  etapa?: ProspectoEtapa | null;
  
  // Campaña asociada
  campana?: string | null;
  
  // Destino objetivo
  destino?: DestinoNombre | null;
  
  // Requiere atención humana después de enviar
  requiere_atencion_humana: boolean;
  
  // Categoría de reactivación
  categoria_reactivacion?: CategoriaReactivacion | null;
  
  // Preferencia de entretenimiento
  preferencia_entretenimiento?: PreferenciaEntretenimiento | null;
  
  // Flags de audiencia
  para_familias: boolean;
  para_grupos: boolean;
  con_menores: boolean;
  luna_de_miel: boolean;
}
```

---

## 🏷️ Enums Disponibles

### ProspectoEtapa

Etapas sincronizadas con la tabla `prospectos`:

| Valor | Descripción |
|-------|-------------|
| `Activo PQNC` | Prospecto activo en programa PQNC |
| `Atendió llamada` | Prospecto que atendió una llamada |
| `En seguimiento` | Prospecto en proceso de seguimiento |
| `Es miembro` | Ya es miembro Vidanta |
| `Interesado` | Mostró interés en el producto |
| `Nuevo` | Prospecto nuevo sin contactar |
| `Sin contactar` | No se ha logrado contacto |
| `No interesado` | Declinó la oferta |
| `Cerrado` | Proceso cerrado |

### DestinoNombre

Destinos sincronizados con la tabla `destinos`:

| Valor | Descripción |
|-------|-------------|
| `Nuevo Nayarit` | Riviera Nayarit |
| `Riviera Maya` | Costa Caribeña |
| `Los Cabos` | Baja California Sur |
| `Acapulco` | Guerrero |
| `Puerto Peñasco` | Sonora |
| `Mazatlán` | Sinaloa |
| `Puerto Vallarta` | Jalisco |

### CategoriaReactivacion

5 categorías para clasificar el propósito de reactivación:

| Valor | Label | Descripción |
|-------|-------|-------------|
| `seguimiento_post_llamada` | Seguimiento Post-Llamada | Para seguimiento después de una llamada perdida o sin respuesta |
| `recordatorio_reserva` | Recordatorio de Reserva | Para recordar reservaciones pendientes o confirmar fechas |
| `oferta_especial` | Oferta Especial | Para enviar promociones y descuentos especiales |
| `reenganche_interes` | Reenganche de Interés | Para prospectos que mostraron interés pero no concretaron |
| `actualizacion_info` | Actualización de Información | Para solicitar actualización de datos o preferencias |

### PreferenciaEntretenimiento

| Valor | Descripción |
|-------|-------------|
| `entretenimiento` | Prefiere actividades y entretenimiento |
| `descanso` | Prefiere tranquilidad y descanso |
| `mixto` | Busca balance entre ambos |

---

## 🗄️ Variables de Discovery (llamadas_ventas)

Campos mapeables desde la tabla `llamadas_ventas` para usar en variables de plantilla:

### Campos Directos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `composicion_familiar_numero` | number | Número de personas en la familia |
| `destino_preferido` | string | Destino preferido del prospecto |
| `preferencia_vacaciones` | string | Tipo de vacaciones preferidas |
| `numero_noches` | number | Número de noches deseadas |
| `mes_preferencia` | string | Mes preferido para viajar |
| `estado_civil` | string | Estado civil del prospecto |
| `edad` | number | Edad del prospecto |
| `propuesta_economica_ofrecida` | string | Propuesta económica presentada |
| `habitacion_ofertada` | string | Tipo de habitación ofertada |
| `resort_ofertado` | string | Resort ofertado |
| `resumen_llamada` | string | Resumen de la llamada |

### Campos Anidados (datos_proceso JSONB)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `datos_proceso.numero_personas` | number | Número de personas que viajarán |
| `datos_proceso.duracion_estancia_noches` | number | Duración de estancia en noches |
| `datos_proceso.discovery_completo` | boolean | Si el discovery fue completado |
| `datos_proceso.metodo_pago_discutido` | string | Método de pago discutido |

---

## 📤 Payload del Webhook

Cuando se crea o actualiza una plantilla, el payload enviado al webhook incluye:

```json
{
  "name": "nombre_plantilla",
  "language": "es_MX",
  "category": "MARKETING",
  "components": [
    {
      "type": "BODY",
      "text": "Hola {{1}}, le escribe {{2}}...",
      "example": {
        "body_text": [["Juan", "María"]]
      }
    }
  ],
  "description": "Descripción de la plantilla",
  "classification": {
    "etapa": "En seguimiento",
    "campana": "Black Friday 2025",
    "destino": "Riviera Maya",
    "requiere_atencion_humana": true,
    "categoria_reactivacion": "oferta_especial",
    "preferencia_entretenimiento": "mixto",
    "para_familias": true,
    "para_grupos": false,
    "con_menores": true,
    "luna_de_miel": false
  }
}
```

### Notas Importantes

1. **Todos los campos de clasificación son opcionales** - Aceptan valores `null`
2. **Los booleanos tienen valores por defecto** - `false` si no se especifican
3. **La clasificación no se almacena en BD** - Solo se envía al webhook
4. **El webhook N8N** puede usar estos valores para:
   - Filtrar prospectos objetivo
   - Aplicar lógica condicional
   - Activar flags post-envío
   - Registrar métricas de campaña

---

## 🎯 Casos de Uso

### 1. Plantilla de Seguimiento Post-Llamada

```json
{
  "classification": {
    "etapa": "Atendió llamada",
    "categoria_reactivacion": "seguimiento_post_llamada",
    "requiere_atencion_humana": false
  }
}
```

### 2. Plantilla de Oferta para Familias

```json
{
  "classification": {
    "etapa": "Interesado",
    "destino": "Riviera Maya",
    "categoria_reactivacion": "oferta_especial",
    "preferencia_entretenimiento": "entretenimiento",
    "para_familias": true,
    "con_menores": true,
    "requiere_atencion_humana": true
  }
}
```

### 3. Plantilla de Luna de Miel

```json
{
  "classification": {
    "etapa": "Nuevo",
    "destino": "Los Cabos",
    "categoria_reactivacion": "reenganche_interes",
    "preferencia_entretenimiento": "descanso",
    "luna_de_miel": true,
    "requiere_atencion_humana": true
  }
}
```

---

## 📁 Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `src/types/whatsappTemplates.ts` | Definición de tipos y enums |
| `src/services/whatsappTemplatesService.ts` | Servicio de gestión de plantillas |
| `src/components/admin/WhatsAppTemplatesManager.tsx` | Componente de UI |

---

## 🔄 Versión

- **Versión**: 1.0.0
- **Fecha**: Diciembre 2025
- **Autor**: AI Division


