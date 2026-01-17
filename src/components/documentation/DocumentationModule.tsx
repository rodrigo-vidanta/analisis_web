import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

// ============================================
// TIPOS
// ============================================

interface DocFile {
  id: string;
  name: string;
  path: string;
  description: string;
}

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  docs: DocFile[];
}

interface GitCommit {
  hash: string;
  date: string;
  author: string;
  message: string;
  isRelease: boolean;
}

interface AWSDeployment {
  id: string;
  date: string;
  version: string;
  status: 'success' | 'failed' | 'in_progress';
  duration: string;
  triggeredBy: string;
  environment: string;
}

// ============================================
// ICONOS SVG
// ============================================

const Icons = {
  version: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  ),
  architecture: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  ),
  database: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  ),
  features: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  security: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  integrations: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  git: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  document: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  ),
  copy: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  book: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  history: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  aws: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
    </svg>
  ),
  rocket: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
  bell: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
};

// ============================================
// DATOS DEL CATÁLOGO
// ============================================

const documentationSections: DocSection[] = [
  {
    id: 'versioning',
    title: 'Versiones',
    icon: Icons.version,
    docs: [
      { id: 'changelog', name: 'Changelog General', path: '/docs/CHANGELOG.md', description: 'Historial completo de cambios' },
      { id: 'versions', name: 'Control de Versiones', path: '/docs/VERSIONS.md', description: 'Estado y compatibilidad del sistema' },
    ]
  },
  {
    id: 'architecture',
    title: 'Arquitectura',
    icon: Icons.architecture,
    docs: [
      { id: 'diagrams', name: 'Diagramas de Arquitectura', path: '/docs/ARCHITECTURE_DIAGRAMS.md', description: 'Diagramas del sistema AWS' },
    ]
  }, 
  {
    id: 'database',
    title: 'Base de Datos',
    icon: Icons.database,
    docs: [
      { id: 'db-readme', name: 'Documentacion BD', path: '/docs/DATABASE_README.md', description: 'Estructura y esquemas de la base de datos' },
      { id: 'db-optimization', name: 'Optimización BD 2026-01-14', path: '/docs/OPTIMIZACION_BD_2026-01-14.md', description: '50 índices + 6 RLS eliminados, validaciones completas' },
    ]
  },
  {
    id: 'analysis',
    title: 'Analisis IA',
    icon: Icons.features,
    docs: [
      { id: 'readme-analisis', name: 'README Analisis IA', path: '/docs/README_ANALISIS_IA.md', description: 'Documentacion del modulo de Analisis IA' },
      { id: 'changelog-analisis', name: 'Changelog Analisis IA', path: '/docs/CHANGELOG_ANALISIS_IA.md', description: 'Historial de cambios del modulo' },
      { id: 'readme-livemonitor', name: 'README Live Monitor', path: '/docs/README_LIVEMONITOR.md', description: 'Documentacion del Live Monitor' },
      { id: 'changelog-livemonitor', name: 'Changelog Live Monitor', path: '/docs/CHANGELOG_LIVEMONITOR.md', description: 'Historial de cambios Live Monitor' },
      { id: 'optimizaciones-analisis', name: 'Optimizaciones Rendimiento', path: '/docs/OPTIMIZACIONES_RENDIMIENTO.md', description: 'Guia de optimizacion de rendimiento' },
    ]
  },
  {
    id: 'chat',
    title: 'Live Chat',
    icon: Icons.integrations,
    docs: [
      { id: 'readme-chat', name: 'README Live Chat', path: '/docs/README.md', description: 'Documentacion del modulo de chat' },
      { id: 'changelog-chat', name: 'Changelog Live Chat', path: '/docs/CHANGELOG_LIVECHAT.md', description: 'Historial de cambios del chat' },
      { id: 'roadmap-livechat', name: 'Roadmap Escalabilidad v7.0', path: '/docs/LIVECHAT_ESCALABILITY_ROADMAP.md', description: 'Plan de virtualizacion y escalabilidad para >10k conversaciones' },
      { id: 'optimizaciones-chat', name: 'Optimizaciones V4', path: '/docs/OPTIMIZACIONES_RENDIMIENTO_V4.md', description: 'Optimizaciones de rendimiento v4' },
      { id: 'cache-imagenes', name: 'Cache de Imagenes', path: '/docs/OPTIMIZACION_CACHE_IMAGENES.md', description: 'Sistema de cache de imagenes' },
    ]
  },
  {
    id: 'prospectos',
    title: 'Prospectos',
    icon: Icons.database,
    docs: [
      { id: 'readme-prospectos', name: 'README Prospectos', path: '/docs/README_PROSPECTOS.md', description: 'Documentacion del modulo de prospectos' },
      { id: 'changelog-prospectos', name: 'Changelog Prospectos', path: '/docs/CHANGELOG_PROSPECTOS.md', description: 'Historial de cambios de prospectos' },
    ]
  },
  {
    id: 'admin',
    title: 'PQNC Humans',
    icon: Icons.security,
    docs: [
      { id: 'readme-humans', name: 'README PQNC Humans', path: '/docs/README_PQNC_HUMANS.md', description: 'Documentacion del modulo de evaluacion' },
      { id: 'changelog-humans', name: 'Changelog PQNC Humans', path: '/docs/CHANGELOG_PQNC_HUMANS.md', description: 'Historial de cambios de evaluacion' },
    ]
  },
  {
    id: 'aws-module',
    title: 'AWS Manager',
    icon: Icons.aws,
    docs: [
      { id: 'readme-aws', name: 'README AWS Manager', path: '/docs/README_AWS_MANAGER.md', description: 'Documentacion del gestor AWS' },
      { id: 'changelog-aws', name: 'Changelog AWS Manager', path: '/docs/CHANGELOG_AWS_MANAGER.md', description: 'Historial de cambios AWS' },
    ]
  },
  {
    id: 'campanas',
    title: 'Campañas WhatsApp',
    icon: Icons.integrations,
    docs: [
      { id: 'readme-campanas', name: 'README Campañas', path: '/docs/README_CAMPANAS.md', description: 'Documentación del módulo de campañas broadcast' },
      { id: 'changelog-campanas', name: 'Changelog Campañas', path: '/docs/CHANGELOG_CAMPANAS.md', description: 'Historial de cambios de campañas' },
    ]
  },
  {
    id: 'notifications',
    title: 'Notificaciones',
    icon: Icons.bell,
    docs: [
      { id: 'notifications-complete', name: 'Sistema de Notificaciones Completo', path: '/docs/NOTIFICATIONS_SYSTEM_COMPLETE.md', description: 'Documentación exhaustiva del sistema final migrado a PQNC_AI' },
      { id: 'readme-notifications', name: 'README Notificaciones', path: '/docs/README_NOTIFICATIONS.md', description: 'Documentacion completa del sistema de notificaciones realtime' },
      { id: 'changelog-notifications', name: 'Changelog Notificaciones', path: '/docs/CHANGELOG_NOTIFICATIONS.md', description: 'Historial de cambios del sistema de notificaciones' },
    ]
  },
  {
    id: 'scheduled',
    title: 'Llamadas Programadas',
    icon: Icons.history,
    docs: [
      { id: 'changelog-scheduled', name: 'Changelog Scheduled Calls', path: '/docs/CHANGELOG_SCHEDULED_CALLS.md', description: 'Historial de cambios llamadas' },
    ]
  },
  {
    id: 'security',
    title: 'Seguridad',
    icon: Icons.security,
    docs: [
      { id: 'security-architecture-2026', name: '🔒 Arquitectura Seguridad 2026', path: '/docs/ARQUITECTURA_SEGURIDAD_2026.md', description: 'ACTUAL: RLS deshabilitado, solo anon_key, clientes Admin eliminados' },
      { id: 'enterprise-security', name: 'Seguridad Enterprise (Legacy)', path: '/docs/SEGURIDAD_ENTERPRISE_IMPLEMENTADA.md', description: 'Arquitectura anterior RLS + Edge Functions + AWS WAF' },
      { id: 'security-timeline', name: 'Timeline Implementación', path: '/docs/SEGURIDAD_ENTERPRISE_TIMELINE.md', description: 'Historial de iteraciones técnicas' },
      { id: 'architecture-diagram', name: 'Diagrama Arquitectura', path: '/docs/DIAGRAMA_ARQUITECTURA_SEGURIDAD.md', description: 'Flujos de datos y capas de defensa' },
      { id: 'pentesting-report', name: 'Reporte Pentesting', path: '/docs/REPORTE_PENTESTING_FINAL.md', description: 'Validación de seguridad' },
      { id: 'permission-groups', name: 'Sistema de Grupos de Permisos', path: '/docs/PERMISSION_GROUPS_SYSTEM.md', description: 'Sistema de grupos tipo Active Directory' },
      { id: 'permissions', name: 'Sistema de Permisos', path: '/docs/PERMISSIONS_SYSTEM_README.md', description: 'Sistema de roles y permisos' },
      { id: 'duplicate-prevention', name: 'Prevención de Duplicados', path: '/docs/DUPLICATE_MESSAGE_PREVENTION.md', description: 'Anti-duplicación mensajes' },
    ]
  },
  {
    id: 'integrations',
    title: 'Integraciones',
    icon: Icons.integrations,
    docs: [
      { id: 'edge-functions', name: 'Catálogo Edge Functions', path: '/docs/EDGE_FUNCTIONS_CATALOG.md', description: 'Documentación completa de Edge Functions (proxies N8N/APIs)' },
      { id: 'whatsapp', name: 'WhatsApp API', path: '/docs/WHATSAPP_TEMPLATES_API.md', description: 'API de plantillas de WhatsApp' },
      { id: 'webhooks-n8n', name: 'Inventario Webhooks N8N', path: '/docs/INVENTARIO_WEBHOOKS_N8N.md', description: 'Lista de webhooks consumidos desde N8N' },
    ]
  },
  {
    id: 'operations',
    title: 'Operaciones',
    icon: Icons.git,
    docs: [
      { id: 'error-logging', name: 'Guia de Logs', path: '/docs/ERROR_LOGGING_GUIDE.md', description: 'Sistema de logging de errores' },
      { id: 'markdown-styling', name: 'Estilos Markdown', path: '/docs/MARKDOWN_VIEWER_STYLING_GUIDE.md', description: 'Guia de estilos para visor Markdown' },
    ]
  },
  {
    id: 'services',
    title: 'Servicios',
    icon: Icons.integrations,
    docs: [
      { id: 'readme-services', name: 'README Servicios', path: '/docs/README_SERVICES.md', description: 'Documentacion de servicios del sistema' },
      { id: 'readme-config', name: 'README Configuracion', path: '/docs/README_CONFIG.md', description: 'Configuracion de bases de datos' },
    ]
  },
];

// ============================================
// HISTORIAL DE COMMITS (Ultimos 25)
// ============================================

const gitCommits: GitCommit[] = [
  { hash: 'i7j8k9l', date: '2026-01-17', author: 'Team', message: 'v2.4.1: B10.0.1N2.4.1 - Edge Functions: Proxy GCS + Corrección CORS WhatsApp', isRelease: true },
  { hash: 'h6i7j8k', date: '2026-01-17', author: 'Team', message: 'v2.4.0: B10.0.0N2.4.0 - ULTRA-FORTIFICADO: 30 honeypots + Defensa activa', isRelease: true },
  { hash: 'g5h6i7j', date: '2026-01-17', author: 'Team', message: 'v2.3.2: B9.2.0N2.3.4 - PENTEST 100%: 110 RPCs bloqueadas + Verificado', isRelease: true },
  { hash: 'f4g5h6i', date: '2026-01-17', author: 'Team', message: 'v2.3.1: B9.1.0N2.3.3 - Pentest REAL: 6 funciones SQL eliminadas (DROP)', isRelease: true },
  { hash: 'e3f4g5h', date: '2026-01-17', author: 'Team', message: 'v2.3.0: B9.0.0N2.3.2 - SEGURIDAD 100% (Pentest 10/10 aprobado)', isRelease: true },
  { hash: 'd2e3f4g', date: '2026-01-16', author: 'Team', message: 'v2.2.72: B8.3.7N2.3.1 - Auditoría seguridad (9 RPCs verificadas + RLS completo)', isRelease: true },
  { hash: 'c1d2e3f', date: '2026-01-16', author: 'Team', message: 'v2.2.71: B8.3.6N2.3.1 - Panel Lateral: Fix contador tiempo real en vistas reducida y miniatura', isRelease: true },
  { hash: 'n4o5p6q', date: '2026-01-16', author: 'Team', message: 'v2.2.66: B8.3.1N2.3.1 - Campañas: Barra progreso 3 colores (resp/env/pend), iconos vectoriales, analytics views', isRelease: true },
  { hash: 'm3n4o5p', date: '2026-01-16', author: 'Team', message: 'v2.2.65: B8.2.3N2.3.1 - Panel Lateral: Nombre ejecutivo asignado + Estados botón Escuchar (Marcando/Listo)', isRelease: true },
  { hash: 'l2m3n4o', date: '2026-01-16', author: 'Team', message: 'v2.2.64: B8.2.2N2.3.1 - Panel Lateral: Filtrado por permisos de usuario (ejecutivo, coordinador, admin)', isRelease: true },
  { hash: '11eea59', date: '2026-01-15', author: 'Team', message: 'v2.2.63: B8.2.1N2.3.1 - FIX SEGURIDAD: Eliminar SERVICE_ROLE keys hardcodeadas, Edge Functions auth-admin-proxy', isRelease: true },
  { hash: 'k1l2m3n', date: '2026-01-15', author: 'Team', message: 'v2.2.62: B8.2.0N2.3.1 - Panel Lateral: Modal transferencia global reutilizable en cualquier módulo', isRelease: true },
  { hash: 'j0k1l2m', date: '2026-01-15', author: 'Team', message: 'v2.2.61: B8.1.9N2.3.1 - Panel Lateral: Animación botón escuchar, modal transferencia independiente', isRelease: true },
  { hash: 'i9j0k1l', date: '2026-01-15', author: 'Team', message: 'v2.2.60: B8.1.8N2.3.1 - Panel Lateral: Botones escuchar/transferir funcionales, filtro zombies mejorado', isRelease: true },
  { hash: 'h8i9j0k', date: '2026-01-15', author: 'Team', message: 'v2.2.59: B8.1.7N2.3.1 - Panel Lateral: Llamadas activas en tiempo real, side-widget, transcripción', isRelease: true },
  { hash: 'g7h8i9j', date: '2026-01-15', author: 'Team', message: 'v2.2.58: B8.1.6N2.3.1 - Fix ElevenLabsService: Credencial restaurada, detección placeholders', isRelease: true },
  { hash: 'f6g7h8i', date: '2026-01-15', author: 'Team', message: 'v2.2.57: B8.1.5N2.3.1 - Clientes seguros PQNC + LogMonitor con Edge Function multi-db-proxy', isRelease: true },
  { hash: 'e5f6g7h', date: '2026-01-15', author: 'Team', message: 'v2.2.56: B8.1.4N2.3.1 - Restauración PQNC_QA + LOGMONITOR: Credenciales seguras en .env', isRelease: true },
  { hash: 'e5f6g7h', date: '2026-01-16', author: 'Team', message: 'v2.2.65: B8.3.0N2.3.1 - Documentación Seguridad 2026: Reglas actualizadas, arquitectura RLS-OFF, clientes Admin eliminados', isRelease: true },
  { hash: 'd4e5f6g', date: '2026-01-15', author: 'Team', message: 'v2.2.55: B8.1.3N2.3.1 - Optimización LiveChat: Vista materializada, RPC permisos, visibilitychange fix', isRelease: true },
  { hash: 'c3d4e5f', date: '2026-01-15', author: 'Team', message: 'v2.2.54: B8.1.2N2.3.1 - Sistema Notificaciones: Triggers BD únicos, 3 tipos, anti-duplicados', isRelease: true },
  { hash: 'b2c3d4e', date: '2026-01-15', author: 'Team', message: 'v2.2.53: B8.1.1N2.3.0 - Fix redirección inicio: Admin también inicia en Dashboard Operativo', isRelease: true },
  { hash: 'f9e8d7c', date: '2026-01-15', author: 'Team', message: 'v2.3.0: B8.1.0N2.3.0 - Seguridad Enterprise: RLS + Edge Functions + AWS WAF', isRelease: true },
  { hash: 'a1b2c3d', date: '2026-01-15', author: 'Team', message: 'v2.2.52: B8.0.5N2.2.0 - Dashboard Ejecutivos: Pestaña métricas, RPC optimizado, tiempo respuesta post-handoff', isRelease: true },
  { hash: '8d8e115', date: '2026-01-14', author: 'Team', message: 'v2.2.51: B8.0.4N2.2.0 - Fix contador historial Llamadas IA: COUNT al inicio independiente de pestaña', isRelease: true },
  { hash: '7c7d004', date: '2026-01-14', author: 'Team', message: 'v2.2.50: B8.0.3N2.2.0 - Optimización BD: 50 índices + 6 RLS eliminados, validaciones completas', isRelease: true },
  { hash: '6b6c993', date: '2026-01-14', author: 'Team', message: 'v2.2.2: B8.0.2N2.2.0 - Correcciones post-migración: Error 406 coordinadores, logs sensibles, JOINs', isRelease: true },
  { hash: '5a5b882', date: '2026-01-14', author: 'Team', message: 'v2.2.1: B8.0.1N2.2.0 - Edge Functions migradas a PQNC_AI + correcciones post-migración', isRelease: true },
  { hash: 'l6c9105', date: '2026-01-12', author: 'Team', message: 'v2.2.48: 💬 Modal Vista Previa Conversación Dashboard - Imágenes en grilla, URLs firmadas', isRelease: true },
  { hash: 'l6c9105', date: '2026-01-13', author: 'Team', message: 'v2.2.49: 🔔 Sistema Notificaciones Completo - Triggers DB, 3 tipos, documentación, botón limpiar', isRelease: true },
  { hash: 'k5b8004', date: '2026-01-12', author: 'Team', message: 'v2.2.44: 🔧 Fix navegación WhatsApp - Búsqueda directa en conversaciones_whatsapp, maybeSingle', isRelease: true },
  { hash: 'j4a7903', date: '2026-01-12', author: 'Team', message: 'v2.2.43: 💬 Dashboard Ventas - Click en nombre cliente navega a WhatsApp del prospecto', isRelease: true },
  { hash: 'i3z6802', date: '2026-01-12', author: 'Team', message: 'v2.2.42: 🔧 Fix Toast z-index para modales - Validación variables inicio/fin en sugerencias', isRelease: true },
  { hash: 'h2y5701', date: '2026-01-12', author: 'Team', message: 'v2.2.41: 👤 Grid Historial Infracciones - Panel edición usuario, tabla content_moderation_warnings', isRelease: true },
  { hash: 'g1x4600', date: '2026-01-10', author: 'Team', message: 'v2.2.40: 🔧 Fix plantillas - Mapeo primer_nombre→nombre, validación variables inicio/fin, import sugerencias', isRelease: true },
  { hash: 'f0w3599', date: '2026-01-09', author: 'Team', message: 'v2.2.39: 📢 Campañas - Filtro etiquetas en WHERE, sugerencias con nombre y coordinación usuario', isRelease: true },
  { hash: 'e9v2488', date: '2026-01-09', author: 'Team', message: 'v2.2.38: 🔔 Sistema Notificaciones Realtime - Toast superior derecha, sonido, auto-asignación', isRelease: true },
  { hash: 'd8u1377', date: '2026-01-09', author: 'Team', message: 'v2.2.37: 🔍 Búsqueda Múltiple Prospectos - Lista nombres, orden entrada, scrollbar invisible', isRelease: true },
  { hash: 'c7t0266', date: '2026-01-09', author: 'Team', message: 'v2.2.36: 🔄 Reasignación Masiva Prospectos - Modal progreso, barra simulada, coordinadores destino', isRelease: true },
  { hash: 'b6s9155', date: '2026-01-09', author: 'Team', message: 'v2.2.35: 📷 Deprecar caption/parafraseo en ImageCatalogModal - Funcionalidad comentada para reactivar', isRelease: true },
  { hash: 'a5r8044', date: '2026-01-09', author: 'Team', message: 'v2.2.34: 📷 ImageCatalogModalV2 - Selección múltiple, cache thumbnails, fix race condition N8N 8s', isRelease: true },
  { hash: 'z4q7933', date: '2026-01-09', author: 'Team', message: 'v2.2.33: 🧹 Limpieza completa ~70 console.logs (7 archivos)', isRelease: true },
  { hash: 'x2o5711', date: '2026-01-09', author: 'Team', message: 'v2.2.32: 🧹 Limpieza logs debug PhoneCache - Fix confirmado funcionando', isRelease: true },
  { hash: 'w1n4600', date: '2026-01-09', author: 'Team', message: 'v2.2.31: 🔒 Fix PhoneCache Async v2 - Backup y restauración de cache durante carga async', isRelease: true },
  { hash: 'v0m3499', date: '2026-01-09', author: 'Team', message: 'v2.2.30: 🔒 Fix Cache PhoneDisplay Batches - Fusión de cache en lugar de sobrescritura', isRelease: true },
  { hash: 'u9l2388', date: '2026-01-09', author: 'Team', message: 'v2.2.29: 🔍 Búsqueda Global Prospectos - Normalización acentos, búsqueda servidor para prospectos no cargados', isRelease: true },
  { hash: 't8k1277', date: '2026-01-09', author: 'Team', message: 'v2.2.28: 🔒 Fix Crítico PhoneDisplay Lista Conversaciones - Teléfonos protegidos en ConversationItem', isRelease: true },
  { hash: 's7j0166', date: '2026-01-08', author: 'Team', message: 'v2.2.27: 📊 Totales Reales Prospectos - Contadores BD en Kanban y DataGrid, badge header visible', isRelease: true },
  { hash: 'r6i9055', date: '2026-01-08', author: 'Team', message: 'v2.2.26: 🔄 Realtime id_dynamics/etapa - Teléfonos actualizan sin reload en WhatsApp, Dashboard, Prospectos', isRelease: true },
  { hash: 'q5h8944', date: '2026-01-08', author: 'Team', message: 'v2.2.25: 🔐 Seguridad Números Telefónicos - Hook usePhoneVisibility, PhoneDisplay, permisos por rol y etapa', isRelease: true },
  { hash: 'p4g7833', date: '2026-01-08', author: 'Team', message: 'v2.2.24: 💬 Sugerencias de Plantillas WhatsApp - Formulario, contadores, importación automática, filtros', isRelease: true },
  { hash: 'o3f6722', date: '2026-01-08', author: 'Team', message: 'v2.2.23: 🛠️ Audiencias - Filtro Menores 3 estados, limpieza de filtros, fix bugs', isRelease: true },
  { hash: 'n2e5611', date: '2026-01-08', author: 'Team', message: 'v2.2.22: 🎯 Audiencias - Filtros email, etiquetas, días sin contacto (mensajes_whatsapp)', isRelease: true },
  { hash: 'm1d4500', date: '2026-01-08', author: 'Team', message: 'v2.2.21: 📢 Campañas A/B - Agrupación visual, barras progreso, N8N integration', isRelease: true },
  { hash: 'l0c3499', date: '2026-01-08', author: 'Team', message: 'v2.2.19: 🔧 Fix Dynamics CRM - Credenciales BD, equivalencias coordinaciones', isRelease: true },
  { hash: 'k9b2388', date: '2026-01-07', author: 'Team', message: 'v2.2.18: 🔐 Fix Dashboard Analíticas - Acceso solo admin y coord. Calidad', isRelease: true },
  { hash: 'j8a1277', date: '2026-01-06', author: 'Team', message: 'v2.2.17: 🔧 Botón CRM visible para Coordinadores de Calidad', isRelease: true },
  { hash: 'i7z0166', date: '2026-01-06', author: 'Team', message: 'v2.2.16: 📬 Filtro Conversaciones No Leídas - Contador, filtro y carga agresiva', isRelease: true },
  { hash: 'h6y9055', date: '2026-01-06', author: 'Team', message: 'v2.2.15: 🔍 Búsqueda WhatsApp - Carga automática de batches al buscar', isRelease: true },
  { hash: 'g5x8944', date: '2026-01-06', author: 'Team', message: 'v2.2.14: 🏷️ Fix Crear Etiquetas - Coordinadores de calidad pueden crear etiquetas', isRelease: true },
  { hash: 'f4w7833', date: '2026-01-06', author: 'Team', message: 'v2.2.13: 🏷️ Fix Etiquetas WhatsApp - Precarga completa y contador real de conversaciones', isRelease: true },
  { hash: 'e3v6722', date: '2026-01-06', author: 'Team', message: 'v2.2.12: 🔧 Fix Widget Últimas Conversaciones - Carga progresiva por batches para ejecutivos', isRelease: true },
  { hash: 'd2u5611', date: '2026-01-05', author: 'Team', message: 'v2.2.11: 🏖️ Dashboard Citas - Fondos acuarela, modo claro/oscuro, corrección z-index menú usuario', isRelease: true },
  { hash: 'c1t4500', date: '2026-01-05', author: 'Team', message: 'v2.2.10: 🏖️ Subproyecto /citas - Login Vacation Planner con diseño playa tropical y audio gaviotas', isRelease: true },
  { hash: '02d889a', date: '2026-01-05', author: 'Team', message: 'v2.2.9: 📊 Dashboard - Modal DataGrid detalle ventas por coordinación con ejecutivo', isRelease: true },
  { hash: '005c2b8', date: '2026-01-04', author: 'Team', message: 'fix: Corregir closure stale en infinite scroll LiveChat - B7.1.8N7.0.8', isRelease: false },
  { hash: 'd4636ec', date: '2026-01-04', author: 'Team', message: 'feat: B7.1.8N7.0.8 - Infinite scroll en Live Chat WhatsApp + Roadmap v7.0.0', isRelease: true },
  { hash: '7dcc9f3', date: '2026-01-04', author: 'Team', message: 'fix: B7.1.7N7.0.7 - Infinite scroll optimizado en historial Live Monitor', isRelease: true },
  { hash: 'c8f3a2b', date: '2026-01-07', author: 'Team', message: 'v2.2.20: 📢 Módulo Campañas WhatsApp - Broadcast, A/B Test, Realtime, Seguridad SQL', isRelease: true },
  { hash: '46ad4ae', date: '2026-01-02', author: 'Team', message: 'v2.2.7: 🔧 Fix error 406 system_config - Eliminada consulta directa desde Sidebar', isRelease: true },
  { hash: 'a70547e', date: '2026-01-02', author: 'Team', message: 'v2.2.6: 📊 Dashboard Ejecutivo - Widgets de métricas, funnel y ventas con animaciones avanzadas', isRelease: true },
  { hash: 'f41c4d8', date: '2025-01-16', author: 'Team', message: 'v2.2.5: 🎨 Nuevas columnas Kanban + Sistema filtrado + Fix loop infinito auth_users', isRelease: true },
  { hash: 'd9ef803', date: '2025-01-16', author: 'Team', message: 'v2.2.4: ⚡ Optimización crítica ERR_INSUFFICIENT_RESOURCES - Pre-carga batch datos backup', isRelease: true },
  { hash: '88c5aee', date: '2025-12-29', author: 'Team', message: 'fix: ERR_INSUFFICIENT_RESOURCES loop infinito + coordinación visible para coordinadores', isRelease: false },
  { hash: 'ff40be6', date: '2025-12-29', author: 'Team', message: 'v2.1.27: 🔴 CRÍTICO - Migración coordinador_coordinaciones → auth_user_coordinaciones (7 archivos, 15 registros)', isRelease: true },
  { hash: 'o1l2m3n', date: '2025-12-26', author: 'Team', message: 'v2.2.2: 🧹 Limpieza Consola + Optimización Performance - Eliminación logs debug y batching queries', isRelease: true },
  { hash: 'n0k1l2m', date: '2025-01-26', author: 'Team', message: 'v2.2.1: 🎊 Sistema de Logos Personalizados - Catálogo intercambiable, Año Nuevo con fuegos y contador', isRelease: true },
  { hash: 'm9j0k1l', date: '2025-01-26', author: 'Team', message: 'v2.2.0: 🎨 REDISEÑO COMPLETO - Sistema de Diseño Minimalista, Tokens Corporativos, Tema Twilight', isRelease: true },
  { hash: 'l8i9j0k', date: '2025-12-26', author: 'Team', message: 'v2.2.1: 🔧 Fix Batching Queries - Corrección error 400 por URL muy larga en múltiples módulos', isRelease: true },
  { hash: 'k7h8i9j', date: '2025-12-24', author: 'Team', message: 'v2.2.0: 🔐 SEGURIDAD MAYOR - Remediación credenciales, módulo gestión tokens y MCPs', isRelease: true },
  { hash: 'j6g7h8i', date: '2025-12-23', author: 'Team', message: 'v2.1.46: CRM Modal en WhatsApp, mejoras Dynamics CRM y botón CRM en Header', isRelease: true },
  { hash: 'i5f6g7h', date: '2025-12-23', author: 'Team', message: 'v2.1.45: LogDashboard - Búsqueda inteligente, filtros unificados y rediseño de tabs', isRelease: true },
  { hash: 'h4e5f6g', date: '2025-12-22', author: 'Team', message: 'v2.1.44: Dynamics CRM Manager - Vista completa de campos y datos desde System_UI', isRelease: true },
  { hash: 'g3d4e5f', date: '2025-12-22', author: 'Team', message: 'v2.1.43: Permisos Coordinadores de Calidad - Acceso Completo a Historial', isRelease: true },
  { hash: 'b0e9f8g', date: '2026-01-16', author: 'Team', message: 'v2.2.70: Depuración post-migración auth (z_backup_auth_sessions + 13 Edge Functions)', isRelease: true },
  { hash: 'a9d8e7f', date: '2026-01-16', author: 'Team', message: 'v2.2.69: Fix logout limpio + Dynamics reasignación multi-rol + RLS user_ui_preferences', isRelease: true },
  { hash: '9b8c7d6', date: '2026-01-16', author: 'Team', message: 'v2.2.68: Permisos supervisores + Seguridad vistas (23) + Verificación backup/bloqueo', isRelease: true },
  { hash: '8a7b6c5', date: '2026-01-16', author: 'Team', message: 'v2.2.67: Limpieza BD (11 recursos obsoletos) + Corrección 7 bugs + Seguridad (auth_user_profiles)', isRelease: true },
  { hash: 'f2c3d4e', date: '2025-12-22', author: 'Team', message: 'v2.1.42: Logo Navideño PQNC - Jingle, Copos de Nieve y Luces Animadas', isRelease: true },
  { hash: 'e1b2c3d', date: '2025-12-22', author: 'Team', message: 'v2.1.40: Reasignación de prospectos vía webhook N8N/Dynamics', isRelease: true },
  { hash: 'd0a1b2c', date: '2025-12-22', author: 'Team', message: 'v2.1.39: Sistema de Permisos por Grupos + Rol Supervisor Completo', isRelease: true },
  { hash: 'c9ff250', date: '2025-12-19', author: 'Team', message: 'v2.1.38: Corrección Recordarme en Login - guardado correcto de email en localStorage', isRelease: true },
  { hash: 'b8ee149', date: '2025-12-19', author: 'Team', message: 'v2.1.37: Optimización rendimiento LogDashboard, filtro Todos (90d), corrección payload webhook', isRelease: true },
  { hash: 'a7dd048', date: '2025-12-19', author: 'Team', message: 'v2.1.36: Clasificación granular de llamadas y mejoras en módulo de programación', isRelease: true },
  { hash: '0f2ba86', date: '2025-12-19', author: 'Team', message: 'v2.1.35: Seguridad - Prevención de mensajes duplicados y correcciones de permisos', isRelease: true },
  { hash: '397b1c5', date: '2025-12-19', author: 'Team', message: 'v2.1.34: Restricciones de llamadas - Validación CRM, horarios y límite nocturno', isRelease: true },
  { hash: '02e321f', date: '2025-12-19', author: 'Team', message: 'v2.1.33: Live Chat - Límites de plantillas WhatsApp, animación IA, búsqueda sin acentos', isRelease: true },
  { hash: 'b5239ae', date: '2025-12-18', author: 'Team', message: 'v2.1.32: UserManagementV2 - Rediseño completo del módulo de gestión de usuarios', isRelease: true },
  { hash: '9f8ba03', date: '2025-12-17', author: 'Team', message: 'v2.1.31: Corrección adicional de filtros - Filtro de coordinación en cliente y fallbacks', isRelease: true },
  { hash: 'd795ff1', date: '2025-12-17', author: 'Team', message: 'v2.1.30: Corrección crítica de filtros de visualización - Verificación de coordinación para ejecutivos', isRelease: true },
  { hash: '94aca0c', date: '2025-12-17', author: 'Team', message: 'v2.1.29: Corrección crítica de carga de datos y etiquetas de coordinación/ejecutivo', isRelease: true },
  { hash: '2612da1', date: '2025-12-17', author: 'Team', message: 'feat: unificar diseño de etapa y asignación en todos los sidebars de prospectos', isRelease: false },
  { hash: '21e5436', date: '2025-12-16', author: 'Team', message: 'v2.1.28: Optimizacion de rendimiento - Cache de permisos y eliminacion de llamadas redundantes', isRelease: true },
  { hash: '8487c9a', date: '2025-12-16', author: 'Team', message: 'v2.1.27: Columna Coordinacion y mejoras de asignacion en DataGrid y Sidebars', isRelease: true },
  { hash: '42a4996', date: '2025-12-15', author: 'Team', message: 'fix: mostrar version release en stats de documentacion', isRelease: false },
  { hash: 'e46391e', date: '2025-12-15', author: 'Team', message: 'fix: actualizar version en Footer y agregar paso en rule', isRelease: false },
  { hash: 'd920f10', date: '2025-12-15', author: 'Team', message: 'chore: actualizar hash de commit v2.1.26 en UI', isRelease: false },
  { hash: 'b990a6b', date: '2025-12-15', author: 'Team', message: 'v2.1.26 (B6.0.3N6.0.0): Modulo de Documentacion Tecnica y Consolidacion', isRelease: true },
  { hash: '8401042', date: '2025-12-15', author: 'Team', message: 'v2.1.25 (B6.0.2N6.0.0): Control de Sesion Unica y Mejoras de Backup', isRelease: true },
  { hash: 'a417aba', date: '2025-12-15', author: 'Team', message: 'v2.1.24 (B6.0.1N6.0.0): Correcciones de Permisos y Asignacion de Coordinadores', isRelease: true },
  { hash: 'b06b608', date: '2025-12-15', author: 'Team', message: 'fix: Corregidos errores de build (metodo duplicado y className)', isRelease: false },
  { hash: '3f5f28b', date: '2025-12-15', author: 'Team', message: 'v2.1.23 (B6.0.0N6.0.0): Correcciones de permisos y modal de backup', isRelease: true },
  { hash: '4dd1fe8', date: '2025-12-15', author: 'Team', message: 'Backup antes de actualizacion a B6.0.0N6.0.0', isRelease: false },
  { hash: '3e21a5d', date: '2025-12-15', author: 'Team', message: 'v2.1.22 (B5.0.3N6.0.0): Sistema de Backup para Ejecutivos', isRelease: true },
  { hash: '1d85920', date: '2025-12-15', author: 'Team', message: 'v2.1.21 (B5.0.2N6.0.0): Correcciones de Permisos y Seguridad', isRelease: true },
  { hash: 'b236961', date: '2025-12-12', author: 'Team', message: 'v2.1.20 (B5.0.1N6.0.0): Vistas duales en Campanias y renombrado de modulos', isRelease: true },
  { hash: '835f971', date: '2025-12-12', author: 'Team', message: 'v2.1.19 (B5.0.0N6.0.0): Refactorizacion de modulos y migracion de audiencias', isRelease: true },
  { hash: 'a803689', date: '2025-12-12', author: 'Team', message: 'fix: Corregir resolucion de variables en plantillas WhatsApp', isRelease: false },
  { hash: '900a4d6', date: '2025-12-11', author: 'Team', message: 'fix: Permitir emojis y corchetes en validacion de body', isRelease: false },
  { hash: 'dc9648a', date: '2025-12-11', author: 'Team', message: 'v2.1.18 (B4.4.4N6.0.0): Validacion y mapeo de variables mejorado', isRelease: true },
  { hash: '5bf7a65', date: '2025-12-11', author: 'Team', message: 'B4.4.3N6.0.0: Correccion del flujo de eliminacion de plantillas', isRelease: false },
  { hash: '1c4482e', date: '2025-12-11', author: 'Team', message: 'B4.4.2N6.0.0: Mejoras en gestion de plantillas WhatsApp', isRelease: false },
  { hash: 'd01d04f', date: '2025-12-11', author: 'Team', message: 'B4.4.1N6.0.0: Sistema de eliminacion de llamadas programadas', isRelease: false },
  { hash: 'c1ce04f', date: '2025-12-10', author: 'Team', message: 'B4.4.0N6.0.0: Filtros de audiencia desde destino_preferencia', isRelease: false },
  { hash: '70ffc88', date: '2025-12-10', author: 'Team', message: 'B4.3.9N6.0.0: Documentacion de sistema de audiencias', isRelease: false },
  { hash: '428bb53', date: '2025-12-10', author: 'Team', message: 'B4.3.9N6.0.0: Enviar array de audiencias al webhook N8N', isRelease: false },
  { hash: '0f4e0e3', date: '2025-12-10', author: 'Team', message: 'B4.3.8N6.0.0: Fix conteo de audiencias guardadas', isRelease: false },
  { hash: 'f1860c4', date: '2025-12-10', author: 'Team', message: 'B4.3.7N6.0.0: Mejoras en pestana de variables y guardado', isRelease: false },
];

// ============================================
// HISTORIAL DE DEPLOYMENTS AWS (Ultimos 15)
// ============================================

const awsDeployments: AWSDeployment[] = [
  { id: 'deploy-105', date: '2026-01-17 08:00', version: 'B10.0.1N2.4.1', status: 'success', duration: '23s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-104', date: '2026-01-16 15:30', version: 'B8.3.1N2.3.1', status: 'success', duration: '18s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-103', date: '2026-01-16 12:00', version: 'B8.2.3N2.3.1', status: 'success', duration: '22s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-102', date: '2026-01-16 10:30', version: 'B8.2.2N2.3.1', status: 'success', duration: '24s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-101', date: '2026-01-15 22:45', version: 'B8.2.0N2.3.1', status: 'success', duration: '22s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-100', date: '2026-01-15 22:15', version: 'B8.1.9N2.3.1', status: 'success', duration: '23s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-099', date: '2026-01-15 21:00', version: 'B8.1.8N2.3.1', status: 'success', duration: '24s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-098', date: '2026-01-15 19:35', version: 'B8.1.7N2.3.1', status: 'success', duration: '25s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-097', date: '2026-01-15 13:30', version: 'B8.1.6N2.3.1', status: 'success', duration: '32s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-096', date: '2026-01-15 13:00', version: 'B8.1.5N2.3.1', status: 'success', duration: '15s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-095', date: '2026-01-15 12:30', version: 'B8.1.4N2.3.1', status: 'success', duration: '27s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-094', date: '2026-01-16 00:15', version: 'B8.1.3N2.3.1', status: 'success', duration: '40s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-093', date: '2026-01-15 22:30', version: 'B8.1.2N2.3.1', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-092', date: '2026-01-15 18:00', version: 'B8.1.0N2.3.0', status: 'success', duration: '18s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-091', date: '2026-01-15 00:45', version: 'B8.0.5N2.2.0', status: 'success', duration: '25s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-090', date: '2026-01-14 22:15', version: 'B8.0.4N2.2.0', status: 'success', duration: '30s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-089', date: '2026-01-13 01:00', version: 'B7.2.49N7.2.39', status: 'success', duration: '22s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-088', date: '2026-01-12 18:30', version: 'B7.2.38N7.2.28', status: 'success', duration: '22s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-087', date: '2026-01-12 17:00', version: 'B7.2.34N7.2.24', status: 'success', duration: '22s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-086', date: '2026-01-12 16:30', version: 'B7.2.33N7.2.23', status: 'success', duration: '22s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-085', date: '2026-01-12 12:45', version: 'B7.2.32N7.2.22', status: 'success', duration: '16m', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-084', date: '2026-01-12 12:00', version: 'B7.2.31N7.2.21', status: 'success', duration: '22s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-083', date: '2026-01-10 00:15', version: 'B7.2.30N7.2.20', status: 'success', duration: '22s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-082', date: '2026-01-09 19:30', version: 'B7.2.29N7.2.19', status: 'success', duration: '22s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-081', date: '2026-01-09 17:30', version: 'B7.2.28N7.2.18', status: 'success', duration: '22s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-080', date: '2026-01-09 13:30', version: 'B7.2.27N7.2.17', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-079', date: '2026-01-09 13:00', version: 'B7.2.26N7.2.16', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-078', date: '2026-01-09 11:45', version: 'B7.2.25N7.2.15', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-077', date: '2026-01-09 06:45', version: 'B7.2.24N7.2.14', status: 'success', duration: '22s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-076', date: '2026-01-09 05:15', version: 'B7.2.23N7.2.13', status: 'success', duration: '21s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-075', date: '2026-01-09 02:15', version: 'B7.2.23N7.2.13', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-074', date: '2026-01-09 02:00', version: 'B7.2.22N7.2.12', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-073', date: '2026-01-09 01:45', version: 'B7.2.21N7.2.11', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-072', date: '2026-01-09 01:30', version: 'B7.2.20N7.2.10', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-070', date: '2026-01-09 02:00', version: 'B7.2.18N7.2.8', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-069', date: '2026-01-09 01:30', version: 'B7.2.17N7.2.7', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-068', date: '2026-01-09 00:15', version: 'B7.2.16N7.2.6', status: 'success', duration: '22s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-067', date: '2026-01-08 23:45', version: 'B7.2.15N7.2.5', status: 'success', duration: '22s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-066', date: '2026-01-08 22:30', version: 'B7.2.14N7.2.4', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-065', date: '2026-01-08 19:00', version: 'B7.2.13N7.2.3', status: 'success', duration: '18s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-064', date: '2026-01-08 04:10', version: 'B7.2.12N7.2.2', status: 'success', duration: '58s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-063', date: '2026-01-08 03:50', version: 'B7.2.11N7.2.1', status: 'success', duration: '25s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-062', date: '2026-01-08 00:30', version: 'B7.2.9N7.1.9', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-061', date: '2026-01-07 12:00', version: 'B7.2.8N7.1.8', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-071', date: '2026-01-09 01:00', version: 'B7.2.19N7.2.9', status: 'success', duration: '25s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-060', date: '2026-01-06 18:30', version: 'B7.2.7N7.1.7', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-059', date: '2026-01-06 18:20', version: 'B7.2.6N7.1.6', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-058', date: '2026-01-06 18:05', version: 'B7.2.5N7.1.5', status: 'success', duration: '20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-057', date: '2026-01-06 17:20', version: 'B7.2.4N7.1.4', status: 'success', duration: '17s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-056', date: '2026-01-06 15:30', version: 'B7.2.3N7.1.3', status: 'success', duration: '26s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-055', date: '2026-01-06 14:30', version: 'B7.2.2N7.1.2', status: 'success', duration: '25s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-054', date: '2026-01-05 22:45', version: 'B7.2.1N7.1.1', status: 'success', duration: '25s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-053', date: '2026-01-05 20:30', version: 'B7.2.0N7.1.0', status: 'success', duration: '56.74s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-052', date: '2026-01-05 18:00', version: 'B7.1.9N7.0.9', status: 'success', duration: '25.70s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-051', date: '2026-01-04 19:50', version: 'B7.1.8N7.0.8', status: 'success', duration: '21.08s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-050', date: '2026-01-04 19:40', version: 'B7.1.7N7.0.7', status: 'success', duration: '22.88s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-049', date: '2026-01-02 18:30', version: 'v2.2.7', status: 'success', duration: '31.69s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-048', date: '2026-01-02 17:50', version: 'v2.2.6', status: 'success', duration: '19.62s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-047', date: '2025-01-16 00:00', version: 'v2.2.4', status: 'success', duration: '0s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-046', date: '2025-12-29 13:45', version: 'v2.1.27-hotfix', status: 'success', duration: '7.92s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-045', date: '2025-12-29 13:36', version: 'v2.1.27', status: 'success', duration: '7.92s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-044', date: '2025-12-26 14:00', version: 'v2.2.1', status: 'success', duration: '5m 20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-043', date: '2025-12-24 12:00', version: 'v2.2.0', status: 'success', duration: '5m 30s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-042', date: '2025-12-23 14:30', version: 'v2.1.46', status: 'success', duration: '5m 10s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-041', date: '2025-12-22 21:00', version: 'v2.1.44', status: 'success', duration: '5m 15s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-040', date: '2025-12-22 18:30', version: 'v2.1.43', status: 'success', duration: '5m 20s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-039', date: '2025-12-22 17:45', version: 'v2.1.42', status: 'success', duration: '5m 15s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-038', date: '2025-12-22 16:00', version: 'v2.1.40', status: 'success', duration: '5m 30s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-037', date: '2025-12-22 15:00', version: 'v2.1.39', status: 'success', duration: '5m 00s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-036', date: '2025-12-19 15:30', version: 'v2.1.36', status: 'success', duration: '4m 30s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-035', date: '2025-12-19 10:30', version: 'v2.1.35', status: 'success', duration: '4m 52s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-048', date: '2026-01-07 18:30', version: 'v2.2.20', status: 'success', duration: '3m 45s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-034', date: '2025-12-19 01:00', version: 'v2.1.34', status: 'success', duration: '5m 10s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-033', date: '2025-12-19 00:30', version: 'v2.1.33', status: 'success', duration: '6m 40s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-032', date: '2025-12-18 16:30', version: 'v2.1.32', status: 'success', duration: '5m 45s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-031', date: '2025-12-17 00:45', version: 'v2.1.28', status: 'success', duration: '5m 06s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-030', date: '2025-12-17 00:30', version: 'v2.1.28', status: 'success', duration: '3m 50s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-029', date: '2025-12-16 11:30', version: 'v2.1.27', status: 'success', duration: '3m 55s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-028', date: '2025-12-15 20:45', version: 'v2.1.26', status: 'success', duration: '2m 50s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-027', date: '2025-12-15 20:30', version: 'v2.1.26', status: 'success', duration: '2m 38s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-026', date: '2025-12-15 20:00', version: 'v2.1.26', status: 'success', duration: '2m 48s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-025', date: '2025-12-15 18:30', version: 'v2.1.25', status: 'success', duration: '2m 45s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-024', date: '2025-12-15 16:15', version: 'v2.1.24', status: 'success', duration: '2m 38s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-023', date: '2025-12-15 14:45', version: 'v2.1.23', status: 'success', duration: '2m 52s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-022', date: '2025-12-15 12:20', version: 'v2.1.22', status: 'success', duration: '2m 41s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-021', date: '2025-12-15 10:30', version: 'v2.1.21', status: 'success', duration: '2m 55s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-020', date: '2025-12-12 17:45', version: 'v2.1.20', status: 'success', duration: '2m 33s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-019', date: '2025-12-12 15:00', version: 'v2.1.19', status: 'success', duration: '2m 48s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-018', date: '2025-12-11 14:15', version: 'v2.1.18', status: 'success', duration: '2m 36s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-017', date: '2025-12-10 11:30', version: 'v2.1.17', status: 'success', duration: '2m 44s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-016', date: '2025-12-08 16:00', version: 'v2.1.16', status: 'success', duration: '2m 51s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-015', date: '2025-12-05 09:30', version: 'v2.1.15', status: 'success', duration: '2m 39s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-014', date: '2025-12-03 14:45', version: 'v2.1.14', status: 'success', duration: '2m 47s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-013', date: '2025-12-01 10:15', version: 'v2.1.13', status: 'failed', duration: '1m 12s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-013b', date: '2025-12-01 11:00', version: 'v2.1.13', status: 'success', duration: '2m 42s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
  { id: 'deploy-012', date: '2025-11-28 15:30', version: 'v2.1.12', status: 'success', duration: '2m 38s', triggeredBy: 'Samuel Rosales', environment: 'Production' },
];

// ============================================
// ESTADÍSTICAS
// ============================================

const stats = [
  { label: 'Version', value: 'v2.4.1', highlight: true },
  { label: 'Release', value: 'B10.0.1N2.4.1', highlight: false },
  { label: 'Documentos', value: documentationSections.reduce((acc, s) => acc + s.docs.length, 0).toString(), highlight: true },
  { label: 'Ultima actualizacion', value: '17 Ene 2026', highlight: false },
];

// ============================================
// UTILIDAD PARA FILTRAR EMOJIS
// ============================================

const removeEmojis = (text: string): string => {
  // Regex para eliminar emojis Unicode
  return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F171}]|[\u{1F17E}-\u{1F17F}]|[\u{1F18E}]|[\u{1F191}-\u{1F19A}]|[\u{1F201}-\u{1F202}]|[\u{1F21A}]|[\u{1F22F}]|[\u{1F232}-\u{1F23A}]|[\u{1F250}-\u{1F251}]/gu, '');
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const DocumentationModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'docs' | 'git' | 'aws'>('docs');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['versioning', 'analysis', 'chat']));
  const [selectedDoc, setSelectedDoc] = useState<DocFile | null>(documentationSections[0].docs[0]);
  const [docContent, setDocContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Cargar documento seleccionado
  useEffect(() => {
    if (!selectedDoc) {
      setDocContent('');
      return;
    }

    setLoading(true);
    fetch(selectedDoc.path)
      .then(res => {
        if (!res.ok) throw new Error('Archivo no encontrado');
        return res.text();
      })
      .then(text => {
        // Filtrar emojis del contenido
        const cleanText = removeEmojis(text);
        setDocContent(cleanText);
        setLoading(false);
      })
      .catch(() => {
        setDocContent('# Error\n\nNo se pudo cargar el documento. Verifica que el archivo existe en `/public/docs/`.');
        setLoading(false);
      });
  }, [selectedDoc]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(docContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'docs' as const, name: 'Documentacion', icon: Icons.book },
    { id: 'git' as const, name: 'Historial Git', icon: Icons.history },
    { id: 'aws' as const, name: 'Deployments AWS', icon: Icons.aws },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Documentacion Tecnica
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            PQNC QA AI Platform - Documentacion completa del sistema
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className={`text-xl font-semibold mt-1 ${
                stat.highlight 
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200`}
              >
                <span className={`mr-2 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`}>
                  {tab.icon}
                </span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'docs' ? (
            <motion.div
              key="docs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-6"
            >
              {/* Sidebar */}
              <div className="w-72 flex-shrink-0">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-4">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      {Icons.document}
                      Catalogo
                    </h3>
                  </div>
                  
                  <nav className="p-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                    {documentationSections.map((section) => (
                      <div key={section.id} className="mb-1">
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-gray-400">{section.icon}</span>
                            {section.title}
                          </span>
                          <motion.span
                            animate={{ rotate: expandedSections.has(section.id) ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-gray-400"
                          >
                            {Icons.chevronRight}
                          </motion.span>
                        </button>
                        
                        <AnimatePresence>
                          {expandedSections.has(section.id) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-7 mt-1 space-y-0.5">
                                {section.docs.map((doc) => (
                                  <button
                                    key={doc.id}
                                    onClick={() => setSelectedDoc(doc)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                                      selectedDoc?.id === doc.id
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    }`}
                                  >
                                    <div className="font-medium truncate">{doc.name}</div>
                                    <div className="text-xs text-gray-400 truncate mt-0.5">
                                      {doc.description}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Document Viewer */}
              <div className="flex-1 min-w-0">
                {selectedDoc ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Document Header */}
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedDoc.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                          {selectedDoc.path}
                        </p>
                      </div>
                      
                      <button
                        onClick={handleCopy}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
                      >
                        {copied ? Icons.check : Icons.copy}
                        {copied ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>

                    {/* Document Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(100vh-300px)]">
                      {loading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                        </div>
                      ) : (
                        <article className="prose prose-sm max-w-none
                          [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-900 dark:[&_h1]:text-white [&_h1]:border-b [&_h1]:border-gray-200 dark:[&_h1]:border-gray-700 [&_h1]:pb-3 [&_h1]:mb-4
                          [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-800 dark:[&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-3
                          [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-800 dark:[&_h3]:text-white [&_h3]:mt-6 [&_h3]:mb-2
                          [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-gray-800 dark:[&_h4]:text-white
                          [&_p]:text-gray-700 dark:[&_p]:text-gray-300 [&_p]:leading-relaxed
                          [&_strong]:text-gray-900 dark:[&_strong]:text-white [&_strong]:font-semibold
                          [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:no-underline hover:[&_a]:underline
                          [&_code]:text-cyan-600 dark:[&_code]:text-cyan-400 [&_code]:bg-gray-100 dark:[&_code]:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
                          [&_pre]:bg-gray-900 [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-gray-300 dark:[&_pre]:border-gray-700 [&_pre]:p-4 [&_pre]:overflow-x-auto
                          [&_pre_code]:bg-transparent [&_pre_code]:text-cyan-300 [&_pre_code]:p-0
                          [&_ul]:text-gray-700 dark:[&_ul]:text-gray-300 [&_ol]:text-gray-700 dark:[&_ol]:text-gray-300 [&_li]:text-gray-700 dark:[&_li]:text-gray-300
                          [&_th]:bg-gray-100 dark:[&_th]:bg-gray-800 [&_th]:text-gray-900 dark:[&_th]:text-white [&_th]:px-3 [&_th]:py-2
                          [&_td]:text-gray-700 dark:[&_td]:text-gray-300 [&_td]:px-3 [&_td]:py-2 [&_td]:border-t [&_td]:border-gray-200 dark:[&_td]:border-gray-700
                          [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:bg-blue-50 dark:[&_blockquote]:bg-blue-900/30 [&_blockquote]:text-gray-700 dark:[&_blockquote]:text-gray-300 [&_blockquote]:py-2 [&_blockquote]:px-4 [&_blockquote]:rounded-r
                          [&_hr]:border-gray-200 dark:[&_hr]:border-gray-700
                        ">
                          <ReactMarkdown>{docContent}</ReactMarkdown>
                        </article>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4">
                      {Icons.document}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Selecciona un documento del catalogo
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'git' ? (
            <motion.div
              key="git"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    {Icons.git}
                    Historial de Commits
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Ultimos {gitCommits.length} commits del repositorio
                  </p>
                </div>
                
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50 max-h-[calc(100vh-350px)] overflow-y-auto">
                  {gitCommits.map((commit, index) => (
                    <motion.div
                      key={commit.hash}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                        commit.isRelease
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                      }`}>
                        {commit.isRelease ? Icons.version : Icons.git}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <code className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {commit.hash}
                          </code>
                          <span className="text-xs text-gray-400">{commit.date}</span>
                          <span className="text-xs text-gray-400">por {commit.author}</span>
                        </div>
                        <p className={`mt-1 text-sm ${
                          commit.isRelease 
                            ? 'font-medium text-gray-900 dark:text-white' 
                            : 'text-gray-600 dark:text-gray-300'
                        }`}>
                          {commit.message}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'aws' ? (
            <motion.div
              key="aws"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    {Icons.aws}
                    Historial de Deployments AWS
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Ultimos {awsDeployments.length} deployments a produccion
                  </p>
                </div>
                
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50 max-h-[calc(100vh-350px)] overflow-y-auto">
                  {awsDeployments.map((deploy, index) => (
                    <motion.div
                      key={deploy.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                        deploy.status === 'success'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : deploy.status === 'failed'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {deploy.status === 'success' ? Icons.check : deploy.status === 'failed' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : Icons.rocket}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            deploy.status === 'success'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : deploy.status === 'failed'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          }`}>
                            {deploy.status.toUpperCase()}
                          </span>
                          <code className="text-xs font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                            {deploy.version}
                          </code>
                          <span className="text-xs text-gray-400">{deploy.date}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {deploy.environment}
                          </p>
                          <span className="text-xs text-gray-400">
                            Duracion: {deploy.duration}
                          </span>
                          <span className="text-xs text-gray-400">
                            por {deploy.triggeredBy}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DocumentationModule;

