# 🏗️ Diagramas de Arquitectura - PQNC QA AI Platform

**Fecha:** 2025-01-25  
**Versión:** 1.0.14  
**Propósito:** Diagramas completos de flujos de aplicación y base de datos

---

## 📱 **DIAGRAMA DE FLUJO DE APLICACIÓN**

### **Flujo Principal de Navegación**

```mermaid
flowchart TD
    A[Inicio de Aplicación] --> B{Usuario Autenticado?}
    B -->|No| C[LoginScreen]
    B -->|Sí| D[MainApp]
    
    C --> E[AuthContext.login()]
    E --> F{Credenciales Válidas?}
    F -->|No| C
    F -->|Sí| G[LightSpeedTunnel Animation]
    G --> D
    
    D --> H[Sidebar + Header + Footer]
    H --> I{Rol del Usuario}
    
    I -->|Admin| J[Todos los Módulos]
    I -->|Developer| K[Constructor + Plantillas]
    I -->|Evaluator| L[Módulos Configurados]
    I -->|Vendedor| M[PQNC + Live Monitor]
    
    J --> N[Constructor]
    J --> O[Plantillas]
    J --> P[Natalia IA]
    J --> Q[PQNC Humans]
    J --> R[Live Monitor]
    J --> S[Administración]
    
    K --> N
    K --> O
    
    L --> T{Permisos Específicos}
    T -->|Natalia| P
    T -->|PQNC| Q
    T -->|Live Monitor| R
    
    M --> Q
    M --> R
```

### **Flujo del Constructor de Agentes**

```mermaid
flowchart TD
    A[Constructor Module] --> B[ProjectSelector]
    B --> C{Tipo de Proyecto}
    
    C -->|Individual| D[IndividualAgentWizard]
    C -->|Squad| E[SquadWizard]
    
    D --> F[Step 1: Template Selection]
    F --> G[Step 2: System Messages]
    G --> H[Step 3: Tools Selection]
    H --> I[Step 4: Parameters]
    I --> J[Step 5: Squad Config]
    J --> K[Step 6: JSON Output]
    K --> L[Step 7: Save to DB]
    L --> M[Agent Created]
    
    E --> N[Squad Configuration]
    N --> O[Multiple Agent Setup]
    O --> P[Squad Relationships]
    P --> Q[Save Squad to DB]
    Q --> R[Squad Created]
```

### **Flujo del Módulo Live Monitor**

```mermaid
flowchart TD
    A[Live Monitor] --> B[Load Prospects from BD]
    B --> C[Agent Queue Management]
    C --> D[Display Pipeline Table]
    
    D --> E{User Action}
    E -->|Click Row| F[ProspectDetailModal]
    E -->|Sort Column| G[Re-sort Table]
    
    F --> H{Control Action}
    H -->|Listen| I[Audio Monitor]
    H -->|Intervene| J[Transfer Modal]
    H -->|Hangup| K[Hangup Confirmation]
    H -->|Result| L[Feedback Modal]
    
    J --> M[Select Whisper Reason]
    M --> N[Send Webhook to VAPI]
    N --> O[AI Says Reason to Client]
    O --> P[Transfer to Agent]
    P --> L
    
    K --> Q{Double Confirmation}
    Q -->|First Click| R[Confirm Button]
    Q -->|Second Click| S[Hangup Call]
    S --> L
    
    I --> T[WebSocket to VAPI]
    T --> U[Real-time Audio]
    
    L --> V[Mandatory Feedback]
    V --> W{Feedback Valid?}
    W -->|No| X[Show Error]
    W -->|Yes| Y[Save to BD]
    Y --> Z[Rotate to Next Agent]
    Z --> AA[Update Pipeline]
```

### **Flujo del Sistema de Análisis**

```mermaid
flowchart TD
    A[Analysis Module] --> B{Force Mode?}
    B -->|Natalia| C[AnalysisDashboard - Natalia]
    B -->|PQNC| D[PQNCDashboard]
    B -->|No Force| E[Analysis Selection]
    
    E --> F{User Permissions}
    F -->|Natalia Access| C
    F -->|PQNC Access| D
    
    D --> G[Load Calls from BD]
    G --> H[Apply Filters]
    H --> I[Display Call Table]
    I --> J{User Action}
    
    J -->|Click Row| K[DetailedCallView]
    J -->|Search| L[Filter Calls]
    J -->|Sort| M[Re-sort Table]
    J -->|Bookmark| N[BookmarkService]
    J -->|Feedback| O[FeedbackService]
    
    K --> P[Tabbed View]
    P --> Q[Performance Tab]
    P --> R[Script Analysis Tab]
    P --> S[Compliance Tab]
    P --> T[Customer Info Tab]
    
    N --> U[Save Bookmark to BD]
    O --> V[Save Feedback to BD]
```

---

## 🗄️ **DIAGRAMA DE BASE DE DATOS**

### **Estructura General de Bases de Datos**

```mermaid
erDiagram
    %% BASE DE DATOS PRINCIPAL (rnhejbuubpbnojalljso.supabase.co)
    AGENT_CATEGORIES {
        uuid id PK
        string name
        string slug UK
        text description
        string icon
        string color
        timestamp created_at
        timestamp updated_at
    }
    
    AGENT_TEMPLATES {
        uuid id PK
        string name
        string slug UK
        text description
        uuid category_id FK
        string difficulty
        string estimated_time
        string agent_type
        text[] keywords
        text[] use_cases
        jsonb vapi_config
        integer usage_count
        numeric success_rate
        boolean is_active
        timestamp created_at
    }
    
    SYSTEM_PROMPTS {
        uuid id PK
        string title
        text content
        string role
        string category
        string prompt_type
        text[] keywords
        jsonb variables
        timestamp created_at
    }
    
    TOOL_CATALOG {
        uuid id PK
        string name
        string tool_type
        jsonb config
        text description
        string complexity
        text[] keywords
        boolean is_active
        timestamp created_at
    }
    
    AGENT_PROMPTS {
        uuid id PK
        uuid agent_template_id FK
        uuid system_prompt_id FK
        integer order_index
        boolean is_customized
        text custom_content
    }
    
    AGENT_TOOLS {
        uuid id PK
        uuid agent_template_id FK
        uuid tool_id FK
        boolean is_enabled
        jsonb custom_config
    }
    
    %% BASE DE DATOS PQNC (hmmfuhqgvsehkizlfzga.supabase.co)
    AUTH_USERS {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string first_name
        string last_name
        string phone
        string department
        string position
        uuid role_id FK
        boolean is_active
        timestamp last_login
        timestamp created_at
    }
    
    AUTH_ROLES {
        uuid id PK
        string name UK
        string display_name
        text description
        timestamp created_at
    }
    
    AUTH_PERMISSIONS {
        uuid id PK
        string name UK
        string module
        string sub_module
        text description
        timestamp created_at
    }
    
    AUTH_ROLE_PERMISSIONS {
        uuid id PK
        uuid role_id FK
        uuid permission_id FK
        timestamp created_at
    }
    
    AUTH_SESSIONS {
        uuid id PK
        uuid user_id FK
        string session_token UK
        timestamp expires_at
        string ip_address
        timestamp created_at
    }
    
    USER_AVATARS {
        uuid id PK
        uuid user_id FK
        string avatar_url
        string original_filename
        integer file_size
        string mime_type
        timestamp uploaded_at
    }
    
    SYSTEM_CONFIG {
        uuid id PK
        string config_key UK
        jsonb config_value
        text description
        uuid created_by FK
        timestamp created_at
    }
    
    CALLS {
        uuid id PK
        string verint_id
        string agent_name
        string customer_name
        string call_type
        string call_result
        string duration
        numeric quality_score
        timestamp start_time
        timestamp end_time
        string audio_file_url
        jsonb agent_performance
        jsonb call_evaluation
        jsonb comunicacion_data
        jsonb customer_data
        jsonb service_offered
        jsonb script_analysis
        jsonb compliance_data
        timestamp created_at
    }
    
    CALL_SEGMENTS {
        uuid id PK
        uuid call_id FK
        integer segment_index
        text text
        text context_text
        string embedding
        timestamp created_at
    }
    
    CALL_FEEDBACK {
        uuid id PK
        uuid call_id FK
        text feedback_text
        uuid created_by FK
        timestamp created_at
        boolean is_active
        integer view_count
    }
    
    CALL_BOOKMARKS {
        uuid id PK
        uuid call_id FK
        uuid user_id FK
        string color
        text notes
        timestamp created_at
    }
    
    %% BASE DE DATOS ANÁLISIS (glsmifhkoaifvaegsozd.supabase.co)
    PROSPECTOS {
        uuid id PK
        string nombre_completo
        string nombre_whatsapp
        integer edad
        string estado_civil
        string ciudad_residencia
        string etapa
        string whatsapp
        string email
        text observaciones
        integer tamano_grupo
        integer cantidad_menores
        string viaja_con
        string[] destino_preferencia
        timestamp created_at
        timestamp updated_at
    }
    
    %% RELACIONES BASE PRINCIPAL
    AGENT_CATEGORIES ||--o{ AGENT_TEMPLATES : category_id
    AGENT_TEMPLATES ||--o{ AGENT_PROMPTS : agent_template_id
    AGENT_TEMPLATES ||--o{ AGENT_TOOLS : agent_template_id
    SYSTEM_PROMPTS ||--o{ AGENT_PROMPTS : system_prompt_id
    TOOL_CATALOG ||--o{ AGENT_TOOLS : tool_id
    
    %% RELACIONES BASE PQNC
    AUTH_ROLES ||--o{ AUTH_USERS : role_id
    AUTH_ROLES ||--o{ AUTH_ROLE_PERMISSIONS : role_id
    AUTH_PERMISSIONS ||--o{ AUTH_ROLE_PERMISSIONS : permission_id
    AUTH_USERS ||--o{ AUTH_SESSIONS : user_id
    AUTH_USERS ||--o{ USER_AVATARS : user_id
    AUTH_USERS ||--o{ SYSTEM_CONFIG : created_by
    CALLS ||--o{ CALL_SEGMENTS : call_id
    CALLS ||--o{ CALL_FEEDBACK : call_id
    CALLS ||--o{ CALL_BOOKMARKS : call_id
    AUTH_USERS ||--o{ CALL_FEEDBACK : created_by
    AUTH_USERS ||--o{ CALL_BOOKMARKS : user_id
```

### **Flujo de Datos entre Bases de Datos**

```mermaid
flowchart LR
    subgraph "BD Principal (Templates)"
        A[agent_templates]
        B[system_prompts]
        C[tool_catalog]
        D[agent_categories]
    end
    
    subgraph "BD PQNC (Auth & Analysis)"
        E[auth_users]
        F[auth_roles]
        G[auth_permissions]
        H[calls]
        I[call_segments]
        J[call_feedback]
        K[call_bookmarks]
        L[system_config]
    end
    
    subgraph "BD Análisis (Live Monitor)"
        M[prospectos]
    end
    
    subgraph "Aplicación Frontend"
        N[MainApp]
        O[Constructor]
        P[Analysis]
        Q[Live Monitor]
        R[Admin]
    end
    
    %% Flujos de datos
    N --> E
    O --> A
    O --> B
    O --> C
    P --> H
    P --> I
    Q --> M
    R --> E
    R --> F
    R --> G
    
    E --> N
    A --> O
    H --> P
    M --> Q
```

---

## 🔄 **FLUJOS DE OPERACIÓN DETALLADOS**

### **Flujo de Autenticación y Permisos**

```mermaid
sequenceDiagram
    participant U as Usuario
    participant L as LoginScreen
    participant A as AuthContext
    participant AS as AuthService
    participant BD as BD PQNC
    participant S as Sidebar
    
    U->>L: Ingresa credenciales
    L->>A: login(credentials)
    A->>AS: login(credentials)
    AS->>BD: authenticate_user()
    BD-->>AS: user_data + permissions
    AS-->>A: AuthState
    A->>A: setAuthState
    A->>S: Actualizar navegación
    S->>S: Filtrar módulos por permisos
    
    Note over A,S: Sistema de permisos granular
    S->>BD: get_evaluator_analysis_config()
    BD-->>S: permisos específicos
    S->>S: Mostrar módulos permitidos
```

### **Flujo del Constructor de Agentes**

```mermaid
sequenceDiagram
    participant U as Usuario
    participant PS as ProjectSelector
    participant IAW as IndividualAgentWizard
    participant SS as SupabaseService
    participant BD as BD Principal
    
    U->>PS: Selecciona tipo proyecto
    PS->>IAW: Inicia wizard
    IAW->>IAW: Step 1: Template Selection
    IAW->>IAW: Step 2: System Messages
    IAW->>IAW: Step 3: Tools Selection
    IAW->>IAW: Step 4: Parameters
    IAW->>IAW: Step 5: Squad Config
    IAW->>IAW: Step 6: JSON Review
    U->>IAW: Confirma creación
    IAW->>SS: createAgentFromEditor()
    SS->>BD: INSERT agent_templates
    SS->>BD: INSERT agent_prompts
    SS->>BD: INSERT agent_tools
    BD-->>SS: Agent ID
    SS-->>IAW: Success
    IAW->>U: Agent creado exitosamente
```

### **Flujo del Live Monitor**

```mermaid
sequenceDiagram
    participant V as Vendedor
    participant LM as LiveMonitor
    participant LMS as LiveMonitorService
    participant BD as BD Análisis
    participant VAPI as VAPI API
    participant IA as IA Natalia
    
    V->>LM: Accede a Live Monitor
    LM->>LMS: getActiveProspects()
    LMS->>BD: SELECT prospectos activos
    BD-->>LMS: Lista de prospectos
    LMS-->>LM: Prospects data
    LM->>LM: Render pipeline table
    
    V->>LM: Click en prospecto
    LM->>LM: Show ProspectDetailModal
    
    V->>LM: Click "Escuchar Llamada"
    LM->>VAPI: WebSocket connection
    VAPI-->>LM: Audio stream
    LM->>LM: Show audio waves
    
    V->>LM: Click "Intervenir Llamada"
    LM->>LM: Show transfer modal
    V->>LM: Selecciona razón
    LM->>LMS: sendWhisperToAI()
    LMS->>VAPI: POST /webhook/whisper
    VAPI->>IA: Susurro con razón
    IA->>IA: Dice razón al cliente
    IA->>VAPI: Ejecuta transferencia
    VAPI-->>V: Llamada transferida
    
    V->>LM: Marca resultado
    LM->>LM: Feedback obligatorio
    V->>LM: Completa feedback
    LM->>LMS: saveFeedback()
    LMS->>BD: UPDATE observaciones
    LM->>LM: Rotate to next agent
    LM->>LM: Refresh pipeline
```

### **Flujo del Sistema de Análisis PQNC**

```mermaid
sequenceDiagram
    participant U as Usuario
    participant PD as PQNCDashboard
    participant AS as AnalysisSupabase
    participant BD as BD PQNC
    participant DCV as DetailedCallView
    participant FS as FeedbackService
    participant BS as BookmarkService
    
    U->>PD: Accede a PQNC Humans
    PD->>AS: getActiveProspects()
    AS->>BD: SELECT calls con filtros
    BD-->>AS: Call records
    AS-->>PD: Filtered calls
    PD->>PD: Render call table
    
    U->>PD: Click en llamada
    PD->>DCV: Show detailed view
    DCV->>DCV: Render tabs
    
    U->>DCV: Add feedback
    DCV->>FS: upsertFeedback()
    FS->>BD: INSERT/UPDATE call_feedback
    BD-->>FS: Feedback saved
    
    U->>DCV: Add bookmark
    DCV->>BS: upsertBookmark()
    BS->>BD: INSERT/UPDATE call_bookmarks
    BD-->>BS: Bookmark saved
    
    DCV-->>PD: Close detail view
    PD->>PD: Refresh table
```

---

## 🔐 **FLUJO DEL SISTEMA DE PERMISOS**

### **Gestión Dinámica de Permisos para Evaluadores**

```mermaid
flowchart TD
    A[Admin - UserManagement] --> B[Edit Evaluator]
    B --> C[Show Checkboxes]
    C --> D{Select Permissions}
    
    D -->|Natalia| E[Mark Natalia]
    D -->|PQNC| F[Mark PQNC]
    D -->|Live Monitor| G[Mark Live Monitor]
    
    E --> H[Save to localStorage]
    F --> H
    G --> H
    
    H --> I[Try RPC Function]
    I --> J{RPC Available?}
    J -->|Yes| K[Save to BD]
    J -->|No| L[Use localStorage]
    
    K --> M[Update Permissions]
    L --> M
    
    M --> N[User Login]
    N --> O[useAnalysisPermissions]
    O --> P[Load from RPC/localStorage]
    P --> Q[Update Sidebar]
    Q --> R[Show Allowed Modules]
```

### **Flujo de Autenticación Completo**

```mermaid
stateDiagram-v2
    [*] --> Loading
    Loading --> LoginScreen : No auth token
    Loading --> ValidatingSession : Has auth token
    
    ValidatingSession --> LoginScreen : Invalid token
    ValidatingSession --> LoadingUser : Valid token
    
    LoginScreen --> Authenticating : User submits
    Authenticating --> LoginAnimation : Success
    Authenticating --> LoginScreen : Failed
    
    LoginAnimation --> LoadingUser : Animation complete
    
    LoadingUser --> DeterminingModule : User loaded
    
    DeterminingModule --> Constructor : Default/Developer
    DeterminingModule --> Plantillas : First available
    DeterminingModule --> NataliaIA : Evaluator with Natalia
    DeterminingModule --> PQNCHumans : Evaluator with PQNC
    DeterminingModule --> LiveMonitor : Vendedor
    DeterminingModule --> Admin : Admin role
    
    Constructor --> [*] : Logout
    Plantillas --> [*] : Logout
    NataliaIA --> [*] : Logout
    PQNCHumans --> [*] : Logout
    LiveMonitor --> [*] : Logout
    Admin --> [*] : Logout
```

---

## 📊 **FLUJO DE DATOS EN TIEMPO REAL**

### **Live Monitor - Tiempo Real**

```mermaid
flowchart TD
    subgraph "IA Natalia (VAPI)"
        A[Llamada Activa]
        B[actualizar_informacion_prospecto]
        C[transferCall]
    end
    
    subgraph "BD Análisis"
        D[prospectos table]
    end
    
    subgraph "Live Monitor"
        E[Pipeline Table]
        F[Auto Refresh 10s]
        G[Progress Indicators]
        H[Temperature Colors]
    end
    
    subgraph "Vendedor Actions"
        I[Escuchar Llamada]
        J[Intervenir Llamada]
        K[Colgar Llamada]
        L[Marcar Resultado]
    end
    
    A --> B
    B --> D
    D --> F
    F --> E
    E --> G
    E --> H
    
    E --> I
    E --> J
    E --> K
    E --> L
    
    J --> M[Webhook Susurro]
    M --> A
    A --> C
    C --> N[Transfer Complete]
    
    L --> O[Feedback Obligatorio]
    O --> D
    D --> P[Etapa: Finalizado]
    P --> Q[Remove from Pipeline]
```

---

## 🎯 **ARQUITECTURA DE COMPONENTES**

### **Jerarquía de Componentes Principales**

```mermaid
flowchart TD
    A[App.tsx] --> B[MainApp.tsx]
    B --> C[AuthProvider]
    B --> D[Sidebar]
    B --> E[Header]
    B --> F[Footer]
    B --> G[Main Content]
    
    G --> H{appMode}
    H -->|constructor| I[IndividualAgentWizard]
    H -->|plantillas| J[AdminDashboard → TemplateManager]
    H -->|natalia| K[AnalysisDashboard forceMode='natalia']
    H -->|pqnc| L[AnalysisDashboard forceMode='pqnc' → PQNCDashboard]
    H -->|live-monitor| M[LiveMonitor]
    H -->|admin| N[AdminDashboardTabs]
    
    I --> O[ProjectSelector]
    I --> P[AgentConfig Steps]
    
    J --> Q[TemplateManager]
    Q --> R[AgentTemplateCard]
    Q --> S[ImportAgentModal]
    Q --> T[EditAgentModal]
    
    L --> U[PQNCDashboard]
    U --> V[DetailedCallView]
    V --> W[UniversalDataView]
    V --> X[AudioPlayer]
    V --> Y[FeedbackModal]
    
    M --> Z[ProspectDetailModal]
    M --> AA[Pipeline Table]
    M --> BB[Agent Queue]
    
    N --> CC[UserManagement]
    N --> DD[SystemPreferences]
    N --> EE[DatabaseConfiguration]
```

---

## 🔧 **SERVICIOS Y HOOKS**

### **Arquitectura de Servicios**

```mermaid
flowchart LR
    subgraph "Hooks"
        A[useAuth]
        B[useSystemConfig]
        C[useUserProfile]
        D[useAnalysisPermissions]
    end
    
    subgraph "Services"
        E[authService]
        F[supabaseService]
        G[feedbackService]
        H[bookmarkService]
        I[audioService]
        J[liveMonitorService]
    end
    
    subgraph "Contexts"
        K[AuthContext]
    end
    
    subgraph "Stores"
        L[appStore]
    end
    
    A --> E
    A --> K
    B --> F
    C --> E
    D --> J
    
    E --> BD1[(BD PQNC)]
    F --> BD2[(BD Principal)]
    G --> BD1
    H --> BD1
    I --> BD1
    J --> BD3[(BD Análisis)]
    
    K --> L
```

---

## 📈 **MÉTRICAS Y RENDIMIENTO**

### **Flujo de Optimización de Performance**

```mermaid
flowchart TD
    A[Usuario Accede] --> B[Detectar Rango de Fechas]
    B --> C{Rango > 3 meses?}
    C -->|Sí| D[Mostrar Warning]
    C -->|No| E[Aplicar Filtros]
    
    E --> F[Consulta con Índices]
    F --> G[Skeleton Loading]
    G --> H[Datos Cargados]
    H --> I[Render Components]
    
    I --> J[Auto Refresh 90s]
    J --> K[Update Metrics]
    K --> L[Update Table]
    L --> M[Maintain Performance]
```

Este sistema de diagramas proporciona una **visión completa** de:

1. **Flujos de aplicación**: Navegación, autenticación, módulos
2. **Estructura de BD**: 3 bases de datos con relaciones
3. **Operaciones en tiempo real**: Live Monitor y análisis
4. **Sistema de permisos**: Gestión dinámica granular
5. **Arquitectura de componentes**: Jerarquía completa
6. **Servicios y hooks**: Interacciones de datos

¿Te gustaría que profundice en algún flujo específico o que agregue más detalles a algún diagrama en particular?
