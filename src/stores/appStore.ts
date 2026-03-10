// STORE PRINCIPAL: Estado global de la aplicación Alpha 1.0
// - Gestiona configuraciones de usuario persistentes
// - Controla tema claro/oscuro dinámico
// - Maneja modos de aplicación y navegación
import { create } from 'zustand';

type ProjectType = 'individual' | 'squad' | '';
type AppMode = 'pqnc' | 'live-monitor' | 'admin' | 'live-chat' | 'prospectos' | 'scheduled-calls' | 'operative-dashboard' | 'campaigns' | 'dashboard';

interface AppState {
  currentStep: number;
  projectType: ProjectType;
  darkMode: boolean;
  appMode: AppMode;
  setCurrentStep: (step: number) => void;
  setProjectType: (type: ProjectType) => void;
  toggleDarkMode: () => void;
  setAppMode: (mode: AppMode) => void;
  resetApp: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentStep: 1,
  projectType: '',
  darkMode: true, // Por defecto modo oscuro
  appMode: 'admin',
  
  setCurrentStep: (step) => set({ currentStep: step }),
  setProjectType: (type) => set({ projectType: type }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setAppMode: (mode) => set({ appMode: mode, currentStep: 1, projectType: '' }),
  resetApp: () => set({ currentStep: 1, projectType: '', darkMode: true, appMode: 'admin' }),
}));
