# 🏗️ ARQUITECTURA DE ALTO NIVEL - VIDANTA AI CALL SYSTEM

```mermaid
graph TB
    subgraph "📱 CUSTOMER JOURNEY"
        A[🎯 Leads Redes Sociales] --> B[📱 WhatsApp Business]
        B --> C[🤖 IA Discovery WhatsApp]
        C --> D[📞 Trigger Llamada AI]
        D --> E[☎️ VAPI AI Call]
        E --> F[👨‍💼 Escalación Humana]
        F --> G[🏢 Cisco PBX]
    end

    subgraph "☁️ AWS MULTI-REGION (Primary: us-west-2)"
        subgraph "🌐 DNS & CDN Layer"
            H[🌍 Route 53 DNS]
            I[⚡ CloudFront CDN]
        end

        subgraph "🖥️ Application Layer"
            J[🎛️ Frontend Admin]
            K[🔄 n8n Middleware]
            L[📊 Analytics Dashboard]
        end

        subgraph "💾 Data Layer"
            M[🗄️ PostgreSQL RDS]
            N[🔴 Redis Cache]
            O[🪣 S3 Storage]
        end

        subgraph "🔧 Infrastructure"
            P[🐳 ECS Fargate]
            Q[⚖️ Application LB]
            R[🔒 VPC + Security]
        end
    end

    subgraph "☁️ GOOGLE CLOUD (Fallback)"
        S[🔄 GKE Cluster]
        T[🗄️ Cloud SQL]
        U[🔴 Memorystore]
        V[⚖️ Global LB]
    end

    subgraph "🤖 VAPI INTEGRATION"
        W[📞 VAPI Oregon]
        X[🛠️ Tools Integration]
        Y[📊 Call Analytics]
    end

    subgraph "📞 TELECOM LAYER"
        Z[📡 SIP Trunk]
        AA[🏢 Cisco PBX]
        BB[☎️ PSTN Network]
    end

    %% Flujo principal
    A --> B --> C --> K
    K --> W
    W --> X
    X --> K
    W --> Z
    Z --> AA
    AA --> BB

    %% Infraestructura
    H --> Q
    Q --> P
    P --> K
    K --> M
    K --> N
    J --> I
    I --> O

    %% Fallback
    H -.-> V
    V -.-> S
    S -.-> T
    S -.-> U

    %% VAPI Integration
    K <--> W
    W --> Y

    %% Styling
    classDef aws fill:#FF9900,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef gcp fill:#4285F4,stroke:#1a73e8,stroke-width:2px,color:#fff
    classDef vapi fill:#00D2FF,stroke:#0099CC,stroke-width:2px,color:#fff
    classDef customer fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef telecom fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff

    class H,I,J,K,L,M,N,O,P,Q,R aws
    class S,T,U,V gcp
    class W,X,Y vapi
    class A,B,C,D,E,F customer
    class Z,AA,BB telecom
```

## 🎯 SERVICIOS PRINCIPALES

### 📱 **Customer Experience Layer**
- **Leads Generation**: Redes sociales → WhatsApp
- **IA Discovery**: Análisis inteligente de mensajes
- **Call Trigger**: Activación automática de llamadas
- **Human Escalation**: Transferencia a agentes humanos

### 🔄 **Integration & Middleware Layer**
- **n8n**: Orquestación de workflows y APIs
- **VAPI Integration**: Gestión de llamadas AI
- **Tools Ecosystem**: Integración con CRMs, APIs
- **Analytics**: Métricas y reporting en tiempo real

### 💾 **Data & Storage Layer**
- **PostgreSQL**: Transacciones, leads, llamadas
- **Redis**: Cache, sesiones, queues
- **S3**: Grabaciones, documentos, backups
- **Analytics DB**: Data warehouse para BI

### ☁️ **Multi-Cloud Infrastructure**
- **AWS Primary**: us-west-2 (Oregon) - Latencia óptima VAPI
- **GCP Secondary**: Failover automático
- **DNS Global**: Route 53 con health checks
- **CDN**: CloudFront para assets estáticos
