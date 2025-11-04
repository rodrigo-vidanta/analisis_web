# 🎯 INSTRUCCIONES PARA DESPLEGAR SUPABASE STUDIO OFICIAL

## ✅ **MÉTODO OFICIAL GARANTIZADO**

Según la documentación oficial del proyecto [supabase-on-aws](https://github.com/supabase-community/supabase-on-aws), Supabase Studio se despliega en **AWS Amplify Hosting**.

## 🚀 **PASO A PASO (5 MINUTOS):**

### **1. Abrir AWS Console CloudFormation**

Ve a esta URL directa para us-west-2:
```
https://us-west-2.console.aws.amazon.com/cloudformation/home#/stacks/create/review?stackName=Supabase&templateURL=https://supabase-on-aws-us-west-2.s3.amazonaws.com/stable/Supabase.template.json&param_SesRegion=us-west-2
```

### **2. Configurar Parámetros Mínimos:**

**Email Settings:**
- Email: `admin@example.com`
- SesRegion: `us-west-2`

**Auth Settings:**
- DisableSignup: `false`
- SiteUrl: `https://d2bxqn3xh4v4kj.cloudfront.net`

**Infrastructure:**
- EnableHighAvailability: `false` (para ahorrar costos)

### **3. Marcar Checkboxes:**

✅ I acknowledge that AWS CloudFormation might create IAM resources
✅ I acknowledge that AWS CloudFormation might create IAM resources with custom names
✅ I acknowledge that AWS CloudFormation might require CAPABILITY_AUTO_EXPAND

### **4. Click "Create Stack"**

### **5. Esperar 15-20 minutos**

El stack creará:
- ✅ Aurora Serverless v2 para PostgreSQL
- ✅ ECS Fargate para APIs (Kong, PostgREST, Auth, etc.)
- ✅ **Amplify Hosting para Studio** ⭐
- ✅ CloudFront CDN
- ✅ Service Discovery
- ✅ Load Balancer

### **6. Obtener URL de Studio**

Una vez completado, ve a la pestaña "Outputs" y busca:
- **StudioURL**: URL de Supabase Studio
- **ApiUrl**: URL de la API

---

## 🔧 **ALTERNATIVA POR CLI (Si prefieres):**

Si ya tienes cuenta de GitHub conectada a Amplify, usa este comando:

```bash
aws cloudformation create-stack \
  --stack-name Supabase-Official \
  --template-url https://supabase-on-aws-us-west-2.s3.amazonaws.com/stable/Supabase.template.json \
  --parameters \
    ParameterKey=Email,ParameterValue=admin@example.com \
    ParameterKey=SesRegion,ParameterValue=us-west-2 \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --region us-west-2
```

---

## 📊 **LO QUE OBTENDRÁS:**

✅ **Supabase Studio oficial** en Amplify Hosting
✅ **Todos los servicios oficiales** funcionando
✅ **SSL automático** con CloudFront
✅ **Escalado automático** de todos los componentes
✅ **Interfaz idéntica** a supabase.com

---

## ⚠️ **IMPORTANTE:**

- Studio se despliega en **Amplify Hosting** (no EC2, no ECS)
- El template oficial **crea su propia base de datos Aurora**
- Si quieres usar TU base de datos Aurora existente, tendrías que modificar el template

---

## 💰 **COSTOS ESTIMADOS:**

- Aurora Serverless v2: ~$50-100/mes
- ECS Fargate: ~$150/mes
- Amplify Hosting: ~$10-20/mes
- CloudFront: ~$30/mes
- **Total**: ~$240-300/mes

---

## 🎯 **RECOMENDACIÓN:**

**Usa AWS Console** con el link directo de arriba. Es el método más confiable y está probado por la comunidad.

La URL te llevará directo a CloudFormation con el template pre-cargado y solo necesitas:
1. Configurar el email
2. Click "Create Stack"
3. Esperar 15-20 minutos
4. ¡Studio funcionando!

---

¿Prefieres que haga el despliegue por CLI o vas a usar AWS Console con el link directo?
