# 🔧 CONFIGURAR GITHUB TOKEN EN AMPLIFY - PASO A PASO

## 📋 **SITUACIÓN ACTUAL:**

✅ **Aplicación Amplify creada:** `d2vjjsnhpgkok4`
✅ **URL cuando esté listo:** `https://main.d2vjjsnhpgkok4.amplifyapp.com`
❌ **Falta:** Conectar repositorio GitHub (necesita token)

---

## 🚀 **OPCIÓN 1: CONFIGURAR EN AWS CONSOLE (5 MINUTOS)**

### **1. Ve a AWS Amplify Console:**
```
https://us-west-2.console.aws.amazon.com/amplify/home?region=us-west-2#/d2vjjsnhpgkok4
```

### **2. Conectar GitHub:**
- Click en **"Connect repository"** o **"Set up CI/CD"**
- Selecciona **"GitHub"**
- Te pedirá autorizar AWS Amplify con GitHub
- **Autoriza** (puedes usar cualquier cuenta GitHub)

### **3. Seleccionar repositorio:**
- Repository: **`supabase/supabase`**
- Branch: **`master`**
- App root directory: **`apps/studio`**

### **4. Configurar Build:**
```yaml
version: 1
applications:
  - appRoot: apps/studio
    frontend:
      phases:
        preBuild:
          commands:
            - cd apps/studio
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: apps/studio/.next
        files:
          - '**/*'
```

### **5. Variables de entorno:**
```
NEXT_PUBLIC_SUPABASE_URL=https://d2bxqn3xh4v4kj.cloudfront.net
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
POSTGRES_PASSWORD=SuperBase123!
AMPLIFY_MONOREPO_APP_ROOT=apps/studio
```

### **6. Deploy:**
- Click **"Save and deploy"**
- Espera 10-15 minutos
- **¡Studio funcionando!**

---

## 🚀 **OPCIÓN 2: CREAR CUENTA GITHUB (2 MINUTOS)**

Si no tienes GitHub:

### **1. Ve a GitHub:**
```
https://github.com/signup
```

### **2. Crea cuenta gratuita:**
- Email: cualquiera
- Username: cualquiera
- Password: cualquiera

### **3. Crear token:**
- Ve a: **Settings → Developer settings → Personal access tokens**
- Click **"Generate new token (classic)"**
- Selecciona: **`public_repo`**
- Click **"Generate token"**
- **Copia el token**

### **4. Usar token en Amplify:**
- Vuelve a AWS Console Amplify
- Conecta GitHub con el token

---

## 📊 **LO QUE OBTIENES:**

Una vez configurado:
✅ **Supabase Studio oficial** (interfaz de supabase.com)
✅ **Table Editor visual**
✅ **SQL Editor con autocompletado**
✅ **Auth management**
✅ **Storage management**
✅ **Conectado a tu Aurora PostgreSQL**

---

## 🎯 **RESUMEN:**

**Tu Supabase está 100% funcional.** Solo necesitas:

1. **Cuenta GitHub** (gratuita)
2. **Autorizar Amplify** (1 click)
3. **Configurar repositorio** (5 minutos)
4. **¡Studio funcionando!**

**¿Tienes cuenta de GitHub o necesitas crear una?**
