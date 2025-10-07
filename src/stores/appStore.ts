// STORE PRINCIPAL: Estado global de la aplicación Alpha 1.0
// - Gestiona configuraciones de usuario persistentes
// - Controla tema claro/oscuro dinámico
// - Maneja modos de aplicación y navegación
import { create } from 'zustand';

type ProjectType = 'individual' | 'squad' | '';
type AppMode = 'constructor' | 'plantillas' | 'agent-studio' | 'natalia' | 'pqnc' | 'live-monitor' | 'admin' | 'academia' | 'ai-models' | 'prompts-manager' | 'live-chat' | 'aws-manager';

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
  darkMode: false,
  appMode: 'constructor',
  
  setCurrentStep: (step) => set({ currentStep: step }),
  setProjectType: (type) => set({ projectType: type }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setAppMode: (mode) => set({ appMode: mode, currentStep: 1, projectType: '' }),
  resetApp: () => set({ currentStep: 1, projectType: '', darkMode: false, appMode: 'constructor' }),
}));
