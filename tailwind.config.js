/** @type {import('tailwindcss').Config} */

// Importar tokens de diseño corporativo
// Nota: En runtime de build, estos se resolverán correctamente
const NEUTRAL_COLORS = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
};

const PRIMARY_COLORS = {
  50: '#eef2ff',
  100: '#e0e7ff',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
};

const ACCENT_COLORS = {
  400: '#c084fc',
  500: '#a855f7',
  600: '#9333ea',
};

const SUCCESS_COLORS = {
  400: '#34d399',
  500: '#10b981',
  600: '#059669',
};

const WARNING_COLORS = {
  400: '#fbbf24',
  500: '#f59e0b',
  600: '#d97706',
};

const ERROR_COLORS = {
  400: '#f87171',
  500: '#ef4444',
  600: '#dc2626',
};

const INFO_COLORS = {
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
};

const RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  full: '9999px',
};

const SHADOWS = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
  sm: '0 2px 4px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.03)',
  md: '0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
  lg: '0 8px 16px rgba(0, 0, 0, 0.10), 0 4px 8px rgba(0, 0, 0, 0.05)',
  xl: '0 16px 32px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06)',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Colores corporativos
      colors: {
        // Neutrales (Slate mejorado)
        neutral: NEUTRAL_COLORS,
        
        // Primario (Indigo elegante)
        primary: PRIMARY_COLORS,
        
        // Acento (Purple sutil)
        accent: ACCENT_COLORS,
        
        // Estados
        success: SUCCESS_COLORS,
        warning: WARNING_COLORS,
        error: ERROR_COLORS,
        info: INFO_COLORS,
        
        // Aliases para compatibilidad con código existente
        'corp-neutral': NEUTRAL_COLORS,
        'corp-primary': PRIMARY_COLORS,
        'corp-accent': ACCENT_COLORS,
      },
      
      // Border radius corporativo
      borderRadius: RADIUS,
      
      // Shadows corporativas
      boxShadow: SHADOWS,
      
      // Gradientes como background images
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
        'gradient-accent': 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)',
        'gradient-success': 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        'gradient-warning': 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
        'gradient-info': 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
        'gradient-neutral': 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      },
      
      // Animaciones personalizadas
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      
      // Transiciones suaves
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'sharp': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
