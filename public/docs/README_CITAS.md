# 🏖️ Sistema de Citas Vidanta

**Vacation Planner Confirmación**

Subproyecto del PQNC QA AI Platform para gestión de citas de vacaciones.

---

## 📋 Descripción

Sistema web para que los usuarios de Vidanta puedan:
- Iniciar sesión con sus credenciales corporativas
- Ver y gestionar sus citas programadas
- Explorar destinos disponibles
- Configurar preferencias de cuenta

## 🚀 Acceso

| Ambiente | URL |
|----------|-----|
| **Producción** | https://ai.vidavacations.com/citas |
| **Local** | http://localhost:5173/citas |

## 🎨 Diseño Visual

- **Estilo:** Playa tropical, acuarela, minimalista
- **Fuente:** Montserrat (Google Fonts)
- **Colores:** Teal como acento principal, grises para texto
- **Efectos:** Glassmorphism, drop-shadows, blur

## 📁 Estructura

```
src/components/citas/
├── CitasApp.tsx          # Componente raíz
├── CitasLoginScreen.tsx  # Pantalla de login
├── CitasDashboard.tsx    # Dashboard principal
├── index.ts              # Exports
├── .cursorrules          # Reglas para IA
└── README.md             # Este archivo

public/assets/
├── citas-background-beach.png
├── citas-login-success.mp3
├── citas-workspace-light.png
├── citas-workspace-dark.png
├── citas-sidebar-light.png
└── citas-sidebar-dark.png
```

## 🔐 Autenticación

Usa el mismo `authService` del proyecto principal:
- Login con email/password
- Persistencia de sesión
- Logout seguro

## ✨ Características

- ✅ Login con diseño tropical
- ✅ Audio de gaviotas al login exitoso
- ✅ Dashboard con sidebar colapsable
- ✅ Modo claro/oscuro
- ✅ Animaciones con Framer Motion
- ✅ Responsive (en progreso)

## 📖 Documentación

Ver `.cursorrules` para documentación técnica completa:
- Sistema de diseño
- Animaciones
- Z-index
- Patrones de código

## 👥 Equipo

Vidanta AI Division

---

*Última actualización: 05 Enero 2026*

