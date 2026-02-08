import { Image, FileText, Link2, Video } from 'lucide-react';
import type { MediaTabDefinition } from './types';

// ============================================
// IMAGE GALLERY CONSTANTS
// ============================================

export const MAX_IMAGES = 4;
export const IMAGES_PER_BATCH = 40;
export const CACHE_KEY = 'livechat_recent_images_v2';
export const CACHE_SIZE = 8;
export const PRELOAD_BATCH_SIZE = 20;
export const CONCURRENT_LIMIT = 5;

// ============================================
// CACHE CONSTANTS
// ============================================

export const IDB_NAME = 'pqnc-media-cache';
export const IDB_VERSION = 1;
export const IDB_STORE_THUMBNAILS = 'thumbnails';
export const IDB_MAX_ENTRIES = 500;
export const IDB_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
export const URL_CACHE_TTL_MS = 25 * 60 * 1000; // 25 minutos

// ============================================
// MEDIA TABS
// ============================================

export const MEDIA_TABS: MediaTabDefinition[] = [
  {
    id: 'images',
    label: 'Imagenes',
    icon: Image,
    available: true,
    description: 'Galeria de imagenes para enviar'
  },
  {
    id: 'documents',
    label: 'Documentos',
    icon: FileText,
    available: false,
    description: 'Enviar archivos PDF, Word, Excel y mas'
  },
  {
    id: 'links',
    label: 'Enlaces',
    icon: Link2,
    available: false,
    description: 'Compartir enlaces con vista previa'
  },
  {
    id: 'videos',
    label: 'Videos',
    icon: Video,
    available: false,
    description: 'Enviar videos promocionales'
  }
];
