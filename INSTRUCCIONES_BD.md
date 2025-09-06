# 🛠️ Instrucciones para Completar la Base de Datos

## 📋 **PROBLEMA IDENTIFICADO**
Las tablas `call_feedback` existen pero **faltan las foreign keys** hacia `auth_users`, causando errores en las consultas.

## ⚡ **SOLUCIÓN INMEDIATA**

### **1. Ejecutar SQL en Supabase Dashboard**

Ve a tu proyecto de Supabase → SQL Editor → Nueva consulta y ejecuta:

```sql
-- AÑADIR FOREIGN KEYS FALTANTES
ALTER TABLE call_feedback 
ADD CONSTRAINT IF NOT EXISTS fk_call_feedback_created_by 
FOREIGN KEY (created_by) REFERENCES auth_users(id);

ALTER TABLE call_feedback 
ADD CONSTRAINT IF NOT EXISTS fk_call_feedback_updated_by 
FOREIGN KEY (updated_by) REFERENCES auth_users(id);

-- VERIFICAR QUE SE CREARON CORRECTAMENTE
SELECT 
    constraint_name, 
    table_name, 
    column_name,
    foreign_table_name,
    foreign_column_name
FROM information_schema.key_column_usage 
WHERE table_name = 'call_feedback' 
AND constraint_name LIKE 'fk_%';
```

### **2. Recargar la Aplicación**
Después de ejecutar el SQL:
1. Recarga la página web (F5 o Cmd+R)
2. Ve al módulo de Análisis → PQNC Humans
3. Los botones "Retro" deberían mostrar correctamente el estado

## 🔧 **VERIFICACIÓN**

### **Síntomas Resueltos:**
- ✅ No más errores de "Could not find relationship" en consola
- ✅ Botones "Retro" cambian de color correctamente
- ✅ Retroalimentaciones se cargan sin errores
- ✅ Estados visuales se actualizan automáticamente

### **Comportamiento Esperado:**
- **Botón gris** = Sin retroalimentación
- **Botón verde** = Con retroalimentación
- **Tooltip** muestra preview del feedback al hacer hover
- **Click** lleva al análisis detallado

## 🎯 **Estado Actual**
- ✅ Frontend completamente implementado
- ✅ Tablas de BD creadas
- ⚠️ **PENDIENTE**: Crear foreign keys (SQL arriba)
- ✅ Manejo de errores robusto

## 📞 **Soporte**
Si sigues viendo errores después de ejecutar el SQL, verifica:
1. Que las tablas `auth_users` y `calls` existen
2. Que los IDs en `call_feedback` coinciden con IDs válidos
3. Que el usuario tenga permisos de escritura en la BD
