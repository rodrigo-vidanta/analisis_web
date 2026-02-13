/**
 * ============================================
 * STORE DE COMUNICADOS - ZUSTAND
 * ============================================
 *
 * Maneja el estado global de comunicados para usuarios.
 * Los comunicados pendientes se muestran como overlay fullscreen.
 * Patron: notificationStore.ts
 */

import { create } from 'zustand';
import { comunicadosService } from '../services/comunicadosService';
import type { Comunicado } from '../types/comunicados';

interface ComunicadosState {
  pendingComunicados: Comunicado[];
  currentComunicado: Comunicado | null;
  isOverlayVisible: boolean;
  isLoading: boolean;
  isSubscribed: boolean;

  loadPending: (userId: string, coordinacionId?: string, roleName?: string) => Promise<void>;
  addComunicado: (comunicado: Comunicado, userId: string, coordinacionId?: string, roleName?: string) => void;
  showNext: () => void;
  markCurrentAsRead: (userId: string) => Promise<void>;
  dismiss: () => void;
  clear: () => void;
  setSubscribed: (value: boolean) => void;
}

export const useComunicadosStore = create<ComunicadosState>((set, get) => ({
  pendingComunicados: [],
  currentComunicado: null,
  isOverlayVisible: false,
  isLoading: false,
  isSubscribed: false,

  loadPending: async (userId, coordinacionId, roleName) => {
    set({ isLoading: true });
    try {
      const pending = await comunicadosService.getComunicadosPendientes(
        userId,
        coordinacionId,
        roleName
      );
      set({ pendingComunicados: pending, isLoading: false });

      // Auto-mostrar el primero si hay pendientes
      if (pending.length > 0) {
        get().showNext();
      }
    } catch (error) {
      console.error('Error cargando comunicados pendientes:', error);
      set({ isLoading: false });
    }
  },

  addComunicado: (comunicado, userId, coordinacionId, roleName) => {
    const state = get();

    // Evitar duplicados
    if (state.pendingComunicados.some(c => c.id === comunicado.id)) return;
    if (state.currentComunicado?.id === comunicado.id) return;

    // Check targeting local
    let matchesTarget = false;
    switch (comunicado.target_type) {
      case 'todos':
        matchesTarget = true;
        break;
      case 'coordinacion':
        matchesTarget = coordinacionId ? comunicado.target_ids.includes(coordinacionId) : false;
        break;
      case 'usuarios':
        matchesTarget = comunicado.target_ids.includes(userId);
        break;
      case 'roles':
        matchesTarget = roleName ? comunicado.target_ids.includes(roleName) : false;
        break;
    }

    if (!matchesTarget) return;

    set((s) => ({
      pendingComunicados: [...s.pendingComunicados, comunicado],
    }));

    // Mostrar si overlay no visible
    if (!state.isOverlayVisible) {
      // Use setTimeout to allow state update to complete
      setTimeout(() => get().showNext(), 0);
    }
  },

  showNext: () => {
    const { pendingComunicados } = get();
    if (pendingComunicados.length === 0) {
      set({ currentComunicado: null, isOverlayVisible: false });
      return;
    }

    // Pick highest priority
    const sorted = [...pendingComunicados].sort((a, b) => {
      if (b.prioridad !== a.prioridad) return b.prioridad - a.prioridad;
      // Secondary sort: published_at DESC
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateB - dateA;
    });

    set({
      currentComunicado: sorted[0],
      isOverlayVisible: true,
    });
  },

  markCurrentAsRead: async (userId) => {
    const { currentComunicado } = get();
    if (!currentComunicado) return;

    const comunicadoId = currentComunicado.id;

    // Optimistic: remove from pending and hide
    set((s) => ({
      pendingComunicados: s.pendingComunicados.filter(c => c.id !== comunicadoId),
      currentComunicado: null,
      isOverlayVisible: false,
    }));

    // Mark as read in DB
    await comunicadosService.markAsRead(comunicadoId, userId);

    // Show next if any
    setTimeout(() => get().showNext(), 300);
  },

  dismiss: () => {
    set({ currentComunicado: null, isOverlayVisible: false });
  },

  clear: () => {
    set({
      pendingComunicados: [],
      currentComunicado: null,
      isOverlayVisible: false,
      isLoading: false,
      isSubscribed: false,
    });
  },

  setSubscribed: (value) => {
    set({ isSubscribed: value });
  },
}));
