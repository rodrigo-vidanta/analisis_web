/**
 * ============================================
 * CATÁLOGO DE LOGOS - Sistema Intercambiable
 * ============================================
 * 
 * Sistema de logos personaliz ados estilo Google Doodles.
 * Permite alternar entre diferentes logos con animaciones.
 * 
 * Logos disponibles:
 * 1. Default - Logo normal de PQNC
 * 2. Christmas - Logo navideño con luces y nieve
 * 3. NewYear - Logo de Año Nuevo con fuegos artificiales y reloj
 */

import React from 'react';
import { DefaultLogo } from './DefaultLogo';
import { ChristmasLogo } from './ChristmasLogo';
import { NewYearLogo } from './NewYearLogo';
import { ReyesLogo } from './ReyesLogo';

// ============================================
// TIPOS
// ============================================

export type LogoType = 'default' | 'christmas' | 'newyear' | 'reyes';

export interface LogoConfig {
  id: LogoType;
  name: string;
  description: string;
  preview: string;
  component: React.ComponentType<any>;
  availableFrom?: string; // Fecha desde cuando está disponible
  availableUntil?: string; // Fecha hasta cuando está disponible
  isSeasonallogo?: boolean; // Si es logo de temporada
}

// ============================================
// CATÁLOGO DE LOGOS
// ============================================

export const LOGO_CATALOG: Record<LogoType, LogoConfig> = {
  default: {
    id: 'default',
    name: 'Logo Estándar',
    description: 'Logo clásico de PQNC en texto sin animaciones',
    preview: '/assets/logo-default-preview.png', // Preview placeholder
    component: DefaultLogo,
    isSeasonallogo: false,
  },
  christmas: {
    id: 'christmas',
    name: 'Logo Navideño',
    description: 'Logo festivo con luces titilantes y copos de nieve. Incluye jingle navideño al hacer clic.',
    preview: '/assets/pqnc-christmas-text-final.png',
    component: ChristmasLogo,
    availableFrom: '2024-12-01',
    availableUntil: '2025-01-06',
    isSeasonallogo: true,
  },
  newyear: {
    id: 'newyear',
    name: 'Logo de Año Nuevo',
    description: 'Logo celebratorio con fuegos artificiales, reloj en tiempo real. Incluye sonido de fuegos artificiales al hacer clic.',
    preview: '/assets/logo_pqnc-newyear.png',
    component: NewYearLogo,
    availableFrom: '2024-12-26',
    availableUntil: '2025-01-15',
    isSeasonallogo: true,
  },
  reyes: {
    id: 'reyes',
    name: 'Logo de Reyes Magos',
    description: 'Logo de Reyes con estrella dejando estela tipo cometa, estrellas flotantes y resplandor. Audio oriental al hacer clic.',
    preview: '/assets/logo_pqnc-reyes.png',
    component: ReyesLogo,
    availableFrom: '2025-01-01',
    availableUntil: '2025-01-10',
    isSeasonallogo: true,
  },
};

// ============================================
// UTILIDADES
// ============================================

/**
 * Obtiene el componente del logo según el tipo
 */
export const getLogoComponent = (logoType: LogoType = 'default'): React.ComponentType<any> => {
  return LOGO_CATALOG[logoType]?.component || DefaultLogo;
};

/**
 * Verifica si un logo está disponible según las fechas
 * NOTA: Por ahora todos los logos están siempre disponibles
 */
export const isLogoAvailable = (logoType: LogoType): boolean => {
  // ✅ SIEMPRE DISPONIBLE (sin restricción de fechas)
  return true;
};

/**
 * Obtiene todos los logos disponibles actualmente
 */
export const getAvailableLogos = (): LogoConfig[] => {
  return Object.values(LOGO_CATALOG).filter(logo => 
    !logo.isSeasonallogo || isLogoAvailable(logo.id)
  );
};

/**
 * Obtiene el logo sugerido según la fecha actual
 */
export const getSuggestedLogo = (): LogoType => {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const day = now.getDate();
  
  // 1 Ene - 10 Ene: Reyes Magos (prioridad sobre Año Nuevo)
  if (month === 0 && day >= 1 && day <= 10) {
    return 'reyes';
  }
  
  // 26 Dic - 31 Dic: Año Nuevo
  if (month === 11 && day >= 26) {
    return 'newyear';
  }
  
  // 1 Dic - 25 Dic: Navidad
  if (month === 11 && day >= 1 && day <= 25) {
    return 'christmas';
  }
  
  return 'default';
};

export default LOGO_CATALOG;

