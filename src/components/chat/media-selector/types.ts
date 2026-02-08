import type { ComponentType } from 'react';

// ============================================
// CONTENT & MEDIA TYPES
// ============================================

export interface ContentItem {
  id: string;
  nombre: string;
  tipo_contenido: string;
  descripcion: string;
  destinos: string[];
  resorts: string[];
  atracciones: string[];
  bucket: string;
  nombre_archivo: string;
  created_at: string;
}

export interface SelectedImage {
  item: ContentItem;
  url: string;
}

export interface SendImageData {
  archivo: string;
  destino: string;
  resort: string;
  caption?: string;
}

// ============================================
// MEDIA TABS
// ============================================

export type MediaTabId = 'images' | 'documents' | 'links' | 'videos';

export interface MediaTabDefinition {
  id: MediaTabId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  available: boolean;
  description: string;
}

// ============================================
// COMPONENT PROPS
// ============================================

export interface MediaSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendImage: (imageData: SendImageData) => void;
  selectedConversation: {
    id: string;
    prospecto_id?: string;
    [key: string]: unknown;
  } | null;
  onImageSent?: (imageUrl: string, caption: string) => void;
  onPauseBot?: (uchatId: string, durationMinutes: number | null, force?: boolean) => Promise<boolean>;
}

export interface ImageCardProps {
  item: ContentItem;
  isSelected: boolean;
  selectionIndex: number;
  onSelect: () => void;
  onPreview: () => void;
}

export interface ImageGridProps {
  images: ContentItem[];
  selectedImageIds: Set<string>;
  selectedImages: SelectedImage[];
  onSelect: (item: ContentItem) => void;
  onPreview: (item: ContentItem) => void;
  loading: boolean;
}

export interface ImagePreviewModalProps {
  item: ContentItem;
  onClose: () => void;
  onSelect: () => void;
  isSelected: boolean;
  getImageUrl: (item: ContentItem) => Promise<string>;
}

export interface SendConfirmationModalProps {
  selectedImages: SelectedImage[];
  onSend: () => void;
  onClose: () => void;
  sending: boolean;
  sendingProgress: { current: number; total: number } | null;
}

export interface MediaSidebarProps {
  activeTab: MediaTabId;
  onTabChange: (tab: MediaTabId) => void;
}

export interface ProspectoData {
  whatsapp: string;
  id_uchat: string;
}

// ============================================
// CACHE TYPES
// ============================================

export interface CachedBlob {
  blob: Blob;
  timestamp: number;
  size: number;
}

export interface CachedUrl {
  url: string;
  timestamp: number;
}
