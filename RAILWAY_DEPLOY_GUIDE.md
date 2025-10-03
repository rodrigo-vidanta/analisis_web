# 🚀 Guía de Deploy en Railway - PQNC AI Platform

**Fecha:** Octubre 2025  
**Versión:** 3.0.8  
**Estado:** ✅ Deploy exitoso

---

## 📋 **Resumen Ejecutivo**

Esta guía documenta el proceso completo de resolución de problemas de deploy en Railway, desde la detección incorrecta de Deno hasta el deploy exitoso con Node.js 20+.

---

## 🔍 **Problema Original**

### **Síntomas:**
- Railway detectaba el proyecto como **Deno** en lugar de **Node.js**
- Error: `npm: command not found`
- Build fallaba en la fase de instalación de dependencias

### **Causa Raíz:**
- Archivo `supabase/functions/n8n-proxy/deno.json` confundía el detector de Nixpacks
- Nixpacks priorizaba Deno sobre Node.js por la presencia de archivos Deno

---

## 🔄 **Proceso de Resolución (Iterativo)**

### **Iteración 1: Configuración Básica (v3.0.4)**
```toml
# railway.toml
[build]
builder = "nixpacks"
buildCommand = "npm ci && npm run build"
```
**Resultado:** ❌ Seguía detectando Deno

### **Iteración 2: Configuración Avanzada (v3.0.5)**
```toml
# .nixpacks.toml
[providers]
node = true

[phases.setup]
nixPkgs = ['nodejs_18', 'npm']
```
**Resultado:** ❌ Error `undefined variable 'npm'`

### **Iteración 3: Simplificación (v3.0.6)**
```toml
# .nixpacks.toml
[phases.setup]
nixPkgs = ['nodejs_18']  # Sin npm explícito
```
**Resultado:** ❌ Error de compatibilidad Vite

### **Iteración 4: Node.js 20+ (v3.0.7)**
```toml
# .nixpacks.toml
[phases.setup]
nixPkgs = ['nodejs_20']  # ← SOLUCIÓN FINAL
```
**Resultado:** ✅ Deploy exitoso

---

## ✅ **Solución Final**

### **Archivos de Configuración Clave:**

#### **`.nixpacks.toml`** (Principal)
```toml
[providers]
node = true

[phases.setup]
nixPkgs = ['nodejs_20']

[phases.install]
cmds = ['npm ci']

[phases.build]
cmds = ['npm run build']

[phases.start]
cmd = 'npm run preview'

[variables]
NODE_ENV = 'production'
```

#### **`railway.toml`** (Variables)
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run preview"
healthcheckPath = "/"
healthcheckTimeout = 300

[env]
NODE_ENV = "production"
NIXPACKS_NODE_VERSION = "20"
```

#### **`package.json`** (Engines)
```json
{
  "engines": {
    "node": ">=20.19.0",
    "npm": ">=9.0.0"
  }
}
```

#### **`.dockerignore`** (Exclusiones)
```
# Supabase Edge Functions (Deno)
supabase/
**/deno.json
**/deno.lock
```

---

## 🔑 **Factores Críticos de Éxito**

### **1. Versión Node.js Correcta**
- **Requerimiento**: Node.js 20.19+ para Vite 7.1.4
- **Configuración**: `nodejs_20` en Nixpacks
- **Verificación**: `NIXPACKS_NODE_VERSION = "20"`

### **2. Exclusión de Archivos Deno**
- **Problema**: `deno.json` confunde detector
- **Solución**: `.dockerignore` y `.railwayignore`
- **Resultado**: Nixpacks solo ve archivos Node.js

### **3. Configuración Explícita**
- **Provider**: `node = true` fuerza detección Node.js
- **Fases separadas**: install, build, start independientes
- **Variables**: NODE_ENV y versión específica

---

## 📚 **Guía para Futuras Modificaciones**

### **✅ Mejores Prácticas:**

#### **Antes de Actualizar Dependencias:**
1. Verificar compatibilidad de versiones Node.js
2. Revisar requirements de herramientas (Vite, etc.)
3. Probar build local antes de deploy

#### **Para Proyectos con Supabase:**
1. Usar `.dockerignore` para excluir Edge Functions
2. Configurar provider explícitamente: `node = true`
3. No mezclar archivos Deno en directorio principal

#### **Configuración Railway:**
1. Especificar versión Node.js en múltiples lugares
2. Usar fases separadas (install, build, start)
3. Configurar healthcheck con timeout adecuado

### **❌ Errores a Evitar:**

#### **Configuración:**
1. No especificar `npm` explícitamente en nixPkgs
2. No usar versiones Node.js obsoletas
3. No omitir exclusiones de archivos Deno

#### **Deploy:**
1. No hacer cambios funcionales durante debug de deploy
2. No usar configuraciones dummy o temporales
3. No omitir documentación del proceso

---

## 🎯 **Verificación de Deploy Exitoso**

### **Checklist Post-Deploy:**
- [ ] ✅ Build completa sin errores
- [ ] ✅ Servidor inicia correctamente
- [ ] ✅ Healthcheck pasa en `/`
- [ ] ✅ Aplicación carga en producción
- [ ] ✅ Live Chat funciona correctamente
- [ ] ✅ Modo oscuro responde
- [ ] ✅ Sidebar adaptativo funciona

### **Comandos de Verificación Local:**
```bash
# Verificar compatibilidad
npm run build
npm run preview

# Verificar versión Node.js
node --version  # Debe ser 20.19.0+
```

---

## 📞 **Contacto y Soporte**

Para futuras modificaciones de deploy, consultar esta documentación y seguir el proceso iterativo documentado.

**Autor:** Sistema de IA PQNC  
**Fecha:** Octubre 2025  
**Estado:** Documentación completa y verificada
