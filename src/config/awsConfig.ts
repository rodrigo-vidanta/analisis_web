// Configuración AWS para PQNC AI Platform
// Basado en la documentación del proyecto AWS_Project

export const AWS_CONFIG = {
  // Región principal optimizada para VAPI (latencia <50ms)
  REGION: 'us-west-2',
  
  // Configuración de servicios según documentación
  SERVICES: {
    // PostgreSQL RDS
    RDS: {
      INSTANCE_IDENTIFIER: 'n8n-postgres',
      INSTANCE_CLASS: 'db.r6g.large',
      ENGINE: 'postgres',
      ALLOCATED_STORAGE: 100,
      MULTI_AZ: true
    },
    
    // ElastiCache Redis
    REDIS: {
      CLUSTER_ID: 'n8n-redis',
      NODE_TYPE: 'cache.r6g.large',
      NUM_CACHE_NODES: 2,
      ENGINE: 'redis'
    },
    
    // ECS Fargate
    ECS: {
      CLUSTER_NAME: 'n8n-production',
      SERVICE_NAME: 'n8n-service',
      TASK_DEFINITION: 'n8n-task',
      DESIRED_COUNT: 2
    },
    
    // VPC Network
    VPC: {
      VPC_ID: 'vpc-05eb3d8651aff5257',
      CIDR_BLOCK: '10.0.0.0/16',
      SUBNETS: 4
    },
    
    // Route 53 DNS
    ROUTE53: {
      HOSTED_ZONE_ID: 'Z05991931MBGUXOLH9HO2',
      DOMAIN_NAME: 'ai.vidanta.com'
    },
    
    // S3 Storage
    S3: {
      BUCKET_NAME: 'vidanta-ai-assets',
      REGION: 'us-west-2'
    }
  },
  
  // Configuración de monitoreo CloudWatch
  MONITORING: {
    METRICS_NAMESPACE: 'PQNC/VidantaAI',
    ALARM_THRESHOLDS: {
      CPU_HIGH: 80,
      MEMORY_HIGH: 80,
      RESPONSE_TIME_HIGH: 1000, // ms
      ERROR_RATE_HIGH: 5 // %
    }
  },
  
  // Configuración de costos estimados (según documentación)
  COST_ESTIMATES: {
    MONTHLY: {
      ECS_FARGATE: { min: 150, max: 300 },
      RDS_POSTGRESQL: { min: 100, max: 200 },
      ELASTICACHE_REDIS: { min: 80, max: 150 },
      LOAD_BALANCER: { min: 20, max: 30 },
      CLOUDFRONT_S3: { min: 10, max: 50 },
      ROUTE53: { min: 5, max: 10 },
      TOTAL: { min: 380, max: 890 }
    }
  }
};

// Configuración de credenciales AWS
export const AWS_CREDENTIALS_CONFIG = {
  // Prioridad de fuentes de credenciales
  CREDENTIAL_SOURCES: [
    'environment', // Variables de entorno (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    'profile',     // Archivo ~/.aws/credentials
    'instance'     // IAM Role si está en EC2
  ],
  
  // Variables de entorno esperadas
  ENV_VARS: {
    ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
    SECRET_ACCESS_KEY: 'AWS_SECRET_ACCESS_KEY',
    SESSION_TOKEN: 'AWS_SESSION_TOKEN',
    REGION: 'AWS_DEFAULT_REGION',
    PROFILE: 'AWS_PROFILE'
  },
  
  // Configuración del archivo de credenciales
  CREDENTIALS_FILE: {
    PATH: '~/.aws/credentials',
    DEFAULT_PROFILE: 'default',
    VIDANTA_PROFILE: 'vidanta-ai'
  }
};

// Utilidades para validación de credenciales
export const validateAWSCredentials = (): boolean => {
  const hasEnvCredentials = 
    import.meta.env.VITE_AWS_ACCESS_KEY_ID && 
    import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
    
  // En el navegador verificar variables de Vite
  const isClient = typeof window !== 'undefined';
  
  if (isClient) {
    console.log('🔍 Verificando credenciales AWS en cliente...');
    return !!hasEnvCredentials;
  }
  
  return !!hasEnvCredentials;
};

// Credenciales AWS (usar variables de entorno en producción)
export const AWS_REAL_CREDENTIALS = {
  accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || 'CONFIGURE_IN_ENV',
  secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || 'CONFIGURE_IN_ENV',
  region: 'us-west-2'
};

// Configuración para desarrollo local
export const DEV_CONFIG = {
  // Usar datos reales siempre
  USE_MOCK_DATA: false,
  
  // Datos simulados para desarrollo
  MOCK_DATA: {
    RDS_STATUS: 'available',
    REDIS_STATUS: 'available',
    ECS_STATUS: 'active',
    ROUTE53_STATUS: 'active',
    
    METRICS: {
      COST_REDUCTION: 68, // %
      LATENCY: '<50ms',
      UPTIME: 99.9, // %
      REGION: 'us-west-2'
    }
  }
};

export default AWS_CONFIG;
