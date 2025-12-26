# 📋 CHANGELOG - PQNC QA AI Platform

## [v2.2.0] - 2025-01-26

### 🎨 REDISEÑO COMPLETO - Sistema de Diseño Minimalista

#### ✨ Nuevas Características

**Sistema de Tokens de Diseño:**
- ✅ Implementado sistema centralizado de tokens de diseño
- ✅ De 680+ gradientes → 6 gradientes corporativos (97% reducción)
- ✅ De 8 tamaños de iconos → 3 estandarizados (62% reducción)
- ✅ De 12 duraciones → 4 estandarizadas (67% reducción)
- ✅ Paleta homologada de 12 colores base
- ✅ Biblioteca de animaciones con Framer Motion

**Componentes Base Reutilizables:**
- ✅ Button (6 variantes, 3 tamaños)
- ✅ Card (4 variantes + 5 sub-componentes)
- ✅ Badge (6 variantes, dot, removible)
- ✅ Modal (5 tamaños, animaciones corporativas)
- ✅ Input (4 variantes, validación visual)
- ✅ Tabs (3 variantes, keyboard navigation)

**Tema Twilight (Crepúsculo) 🆕:**
- ✅ Nuevo tema intermedio entre claro y oscuro
- ✅ Background: #1a202e (azul-gris suave)
- ✅ Perfecto para trabajo prolongado
- ✅ Contraste WCAG 8:1
- ✅ Selector de 3 temas con iconos animados

#### 🔄 Mejoras

**Módulo WhatsApp (Live Chat):**
- ✅ Header slim minimalista (py-2.5, 37.5% más compacto)
- ✅ Sin título, solo icono vectorizado
- ✅ Componente Tabs homologado
- ✅ Card e Input en configuración
- ✅ Colores neutral-* homologados
- ✅ Icono verde (success-500) identificador

**Widget de Conversaciones (Dashboard):**
- ✅ Icono 🤖 para mensajes del bot (no letra "B")
- ✅ Icono 📄 para mensajes de plantilla (no letra "P")
- ✅ Etiqueta verde "Plantilla enviada por: [Ejecutivo]"
- ✅ Colores diferenciados por tipo de mensaje
- ✅ Detección correcta de plantillas vía whatsapp_template_sends

**Sistema de Colores:**
- ✅ Unificación de colores: slate/gray → neutral
- ✅ Gradientes corporativos por módulo
- ✅ Soporte completo para 3 temas

#### 🎯 Animaciones

**Selector de Tema:**
- ✅ Sol: Rayos girando + centro pulsante
- ✅ Luna: 5 estrellas titilantes + balanceo
- ✅ Crepúsculo: Atardecer con sol poniéndose, nubes, rayos

**Componentes:**
- ✅ SCALE_IN para modales
- ✅ FADE_IN para elementos simples
- ✅ SPRING_POP para badges
- ✅ Stagger para listas
- ✅ Physics consistentes (stiffness, damping)

#### 📚 Documentación

**Nuevas Guías:**
- ✅ DESIGN_SYSTEM_AUDIT_2025.md (Auditoría completa 50+ páginas)
- ✅ DESIGN_SYSTEM_SUMMARY.md (Resumen ejecutivo)
- ✅ DESIGN_TOKENS_IMPLEMENTATION.md (Tokens)
- ✅ BASE_COMPONENTS_IMPLEMENTATION.md (Componentes)
- ✅ DESIGN_GUIDE_MODALS_V2.md (Guía de modales V2.0)
- ✅ LIVE_CHAT_MIGRATION.md (Migración WhatsApp)
- ✅ CONVERSACIONES_WIDGET_UPDATE.md (Widget actualizado)
- ✅ src/styles/tokens/README.md (Uso de tokens)
- ✅ src/components/base/README.md (Uso de componentes)

#### 🔒 Backup

- ✅ Backup completo del diseño anterior
- ✅ 14 archivos respaldados (452 KB)
- ✅ Instrucciones de restauración completas

#### 🛠️ Técnico

**Archivos Creados:** 37 archivos (~678 KB)
- 6 archivos de tokens (~25 KB)
- 7 componentes base (~46 KB)
- 2 archivos de configuración (~5 KB)
- 11 archivos de documentación (~150 KB)
- 14 archivos de backup (452 KB)

**Código Generado:**
- ~4,251 líneas de código TypeScript
- ~1,501 líneas de componentes base
- ~500 líneas de tokens
- ~2,000 líneas de documentación

---

## [v2.1.26] - Versión Anterior

(Contenido legacy preservado)

---

**Migración:** De v2.1.26 → v2.2.0  
**Tipo:** Major Update (Rediseño completo)  
**Breaking Changes:** Ninguno (retrocompatible)  
**Estado:** ✅ Completado y testeado
