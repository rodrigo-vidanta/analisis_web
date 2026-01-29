# Modificadores de Texto WhatsApp

## 📋 Modificadores Oficiales Soportados

Según la [documentación oficial de WhatsApp](https://faq.whatsapp.com/539178204879377/), estos son los modificadores de texto disponibles:

### 1. Negrita (Bold)
```
*texto en negrita*
```
**Ejemplo:** *Hola, bienvenido*
**Renderiza:** **Hola, bienvenido**

### 2. Cursiva (Italic)
```
_texto en cursiva_
```
**Ejemplo:** _Este texto está en cursiva_
**Renderiza:** *Este texto está en cursiva*

### 3. Tachado (Strikethrough)
```
~texto tachado~
```
**Ejemplo:** ~Precio anterior~
**Renderiza:** ~~Precio anterior~~

### 4. Monoespaciado (Monospace)
```
```texto monoespaciado```
```
**Ejemplo:** ```código aquí```
**Renderiza:** `código aquí`

---

## 🎯 Uso en la Plataforma

### Vista Previa en Módulo de Campañas

Los modificadores de texto se interpretan automáticamente en:

1. **Pestaña "Contenido"** - Vista previa en tiempo real mientras editas
2. **Pestaña "Vista Previa"** - Vista completa del mensaje con datos reales
3. **Modal de vista previa** - Al hacer clic en "Vista Previa" en tarjetas de plantillas
4. **Tarjetas de plantillas** - Preview truncado en el listado

### Implementación Técnica

**Archivo:** `src/utils/whatsappTextFormatter.tsx`

```typescript
import { renderWhatsAppFormattedText } from '../utils/whatsappTextFormatter';

// Uso en componentes
<div className="text-sm">
  {renderWhatsAppFormattedText(mensajeConModificadores)}
</div>
```

### Ejemplos de Uso

#### Mensaje con múltiples formatos
```
Hola *{{1}}*, te confirmamos tu cita para el día _{{2}}_.

~Horario anterior~
*Nuevo horario:* {{3}}

Código de referencia: ```{{4}}```
```

**Se renderizará como:**
```
Hola **[Nombre]**, te confirmamos tu cita para el día *[Fecha]*.

~~Horario anterior~~
**Nuevo horario:** [Hora]

Código de referencia: `[Código]`
```

---

## ⚙️ Configuración

### Componente Principal

**Archivo:** `src/components/campaigns/plantillas/WhatsAppTemplatesManager.tsx`

El componente ya incluye soporte automático para:
- ✅ Vista previa en pestaña de contenido
- ✅ Vista previa en pestaña dedicada
- ✅ Vista previa en modales
- ✅ Preview en tarjetas de listado

### Función de Parseo

```typescript
parseWhatsAppText(text: string): ParsedSegment[]
```

Convierte texto plano con modificadores en segmentos estructurados.

### Función de Renderizado

```typescript
renderWhatsAppFormattedText(text: string): React.ReactNode
```

Renderiza texto con modificadores aplicando estilos HTML/Tailwind correspondientes.

---

## 🎨 Estilos Aplicados

| Modificador | Clase CSS | Resultado Visual |
|-------------|-----------|------------------|
| `*texto*` | `font-bold` | **Negrita** |
| `_texto_` | `italic` | *Cursiva* |
| `~texto~` | `line-through` | ~~Tachado~~ |
| ` ```texto``` ` | `font-mono bg-gray-100 px-1 rounded` | `Monospace` |

---

## 📝 Notas de Compatibilidad

### Limitaciones

1. Los modificadores **no pueden cruzar líneas** (saltos de `\n`)
2. Los modificadores **no se anidan** (ej: `*_texto_*` no funciona)
3. Los espacios dentro de modificadores se preservan

### Casos Especiales

```typescript
// ✅ Correcto
*Hola mundo*

// ❌ Incorrecto (cruza línea)
*Hola
mundo*

// ✅ Correcto (múltiples en misma línea)
*Hola* _mundo_ ~todos~

// ❌ No soportado (anidado)
*Hola _mundo_*
```

---

## 🔧 Mantenimiento

### Agregar Nuevo Modificador

Si WhatsApp agrega nuevos modificadores oficiales:

1. Actualizar `parseWhatsAppText()` en `whatsappTextFormatter.tsx`
2. Agregar patrón regex correspondiente
3. Actualizar `renderSegment()` con nuevo caso
4. Actualizar esta documentación

### Testing

```typescript
// Test básico
const texto = "Hola *mundo* con _estilo_";
const resultado = renderWhatsAppFormattedText(texto);
// Debe renderizar: Hola <strong>mundo</strong> con <em>estilo</em>
```

---

## 📚 Referencias

- [Documentación Oficial WhatsApp](https://faq.whatsapp.com/539178204879377/)
- [WhatsApp Business API - Text Formatting](https://developers.facebook.com/docs/whatsapp/on-premises/reference/messages#text-object)

---

**Última actualización:** 28 de Enero 2026  
**Implementado en:** v2.1.26+
