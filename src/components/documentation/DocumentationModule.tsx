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
      { id: 'permissions', name: 'Sistema de Permisos', path: '/docs/PERMISSIONS_SYSTEM_README.md', description: 'Sistema de roles y permisos' },
    ]
  },
  {
    id: 'integrations',
    title: 'Integraciones',
    icon: Icons.integrations,
    docs: [
      { id: 'whatsapp', name: 'WhatsApp API', path: '/docs/WHATSAPP_TEMPLATES_API.md', description: 'API de plantillas de WhatsApp' },
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
  { label: 'Version', value: 'v2.1.26', highlight: true },
  { label: 'Release', value: 'B6.0.3N6.0.0', highlight: false },
  { label: 'Documentos', value: documentationSections.reduce((acc, s) => acc + s.docs.length, 0).toString(), highlight: true },
  { label: 'Ultima actualizacion', value: '15 Dic 2025', highlight: false },
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

