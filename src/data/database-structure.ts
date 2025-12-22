/**
 * Estructura de Base de Datos para Agentes Modulares
 * Extraída de los patrones de los ejemplos existentes
 */

// ============== TIPOS BASE ==============
export type AgentCategory = 'atencion_clientes' | 'ventas' | 'cobranza' | 'soporte_tecnico';
export type ProjectType = 'individual' | 'squad' | '';
export type AppMode = 'admin';

// ============== INTERFACES PRINCIPALES ==============

export interface AgentTemplate {
  id: string;
  name: string;
  category: AgentCategory;
  description: string;
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string; // e.g., "15 minutos"
  systemMessages: SystemMessage[];
  defaultTools: Tool[];
  defaultParameters: AgentParameters;
  businessRules: BusinessRule[];
  vocalizationRules: VocalizationRule[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SystemMessage {
  id: string;
  order: number;
  role: 'system' | 'user' | 'assistant';
  title: string; // Para identificar el propósito, ej: "IDENTIDAD", "FLUJO_PRINCIPAL", etc.
  content: string;
  category: 'identity' | 'workflow' | 'restrictions' | 'communication' | 'protection';
  isRequired: boolean; // Si es obligatorio para esta categoría de agente
  isEditable: boolean; // Si el usuario puede modificarlo
  variables: string[]; // Variables dinámicas como {{ $json.name }}
}

export interface Tool {
  id: string;
  name: string;
  type: 'function' | 'transferCall' | 'endCall';
  category: 'communication' | 'data_collection' | 'business_logic' | 'external_api';
  description: string;
  icon: string;
  complexity: 'simple' | 'medium' | 'complex';
  
  // Configuración específica según el tipo
  function?: {
    name: string;
    description: string;
    parameters: any; // JSON Schema
  };
  
  transferCall?: {
    destinations: TransferDestination[];
  };
  
  endCall?: {
    messages: EndCallMessage[];
  };
  
  // Configuración del servidor
  server?: {
    url: string;
    timeoutSeconds?: number;
  };
  
  async: boolean;
  messages: ToolMessage[];
  usageExamples: string[];
  businessContext: string;
  
  // Compatibilidad con categorías
  compatibleCategories: AgentTemplate['category'][];
}

export interface TransferDestination {
  type: 'number' | 'assistant';
  number?: string;
  assistantName?: string;
  message: string;
  description: string;
  conditions?: string[]; // Condiciones para usar esta transferencia
}

export interface EndCallMessage {
  type: 'request-start' | 'request-failed' | 'request-response-delayed';
  contents?: {
    type: 'text';
    text: string;
    language: string;
  }[];
  content?: string;
  timingMilliseconds?: number;
}

export interface ToolMessage {
  type: 'request-start' | 'request-failed' | 'request-response-delayed';
  content?: string;
  contents?: any[];
  timingMilliseconds?: number;
}

export interface AgentParameters {
  // Configuración de modelo
  model: {
    provider: 'openai' | 'anthropic';
    model: string;
    temperature: number;
    fallbackModels: string[];
  };
  
  // Configuración de voz
  voice: {
    provider: '11labs' | 'openai';
    voiceId: string;
    model: string;
    stability: number;
    similarityBoost: number;
    style: number;
    speed: number;
    useSpeakerBoost: boolean;
    enableSsmlParsing: boolean;
    language?: string;
    fallbackPlan?: {
      voices: VoiceFallback[];
    };
  };
  
  // Configuración de transcripción
  transcriber: {
    provider: 'deepgram' | 'openai';
    model: string;
    language: string;
    numerals: boolean;
    smartFormat: boolean;
    endpointing: number;
    confidenceThreshold: number;
    keywords: string[];
    fallbackPlan?: {
      transcribers: TranscriberFallback[];
    };
  };
  
  // Configuración de comportamiento
  behavior: {
    firstMessage: string;
    firstMessageMode: 'assistant-speaks-first' | 'user-speaks-first';
    backgroundSound?: string;
    backgroundDenoisingEnabled: boolean;
    maxDurationSeconds: number;
    recordingEnabled: boolean;
    endCallFunctionEnabled: boolean;
    endCallPhrases: string[];
    endCallMessage?: string;
  };
  
  // Configuración de conversación
  conversation: {
    startSpeakingPlan: {
      waitSeconds: number;
      smartEndpointingEnabled: boolean;
    };
    stopSpeakingPlan: {
      numWords: number;
      voiceSeconds: number;
      backoffSeconds: number;
    };
    messagePlan: {
      idleMessages: string[];
      idleMessageMaxSpokenCount: number;
      idleTimeoutSeconds?: number;
    };
    voicemailDetection?: {
      provider: string;
    };
  };
  
  // Configuración de análisis
  analysis: {
    summaryPrompt: string;
    structuredDataPrompt: string;
    structuredDataSchema: any; // JSON Schema
    successEvaluationPrompt?: string;
    successEvaluationRubric?: string;
  };
  
  // URLs y notificaciones
  integration: {
    serverUrl?: string;
    serverMessages: string[];
    observabilityPlan?: {
      provider: string;
      tags: string[];
      metadata: any;
    };
  };
}

export interface VoiceFallback {
  provider: string;
  voiceId: string;
  model: string;
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
  useSpeakerBoost: boolean;
}

export interface TranscriberFallback {
  provider: string;
  model: string;
}

export interface BusinessRule {
  id: string;
  category: string;
  title: string;
  description: string;
  rule: string;
  severity: 'critical' | 'important' | 'recommendation';
  affectedComponents: string[]; // Qué partes del agente afecta
  examples: {
    correct: string;
    incorrect: string;
  }[];
}

export interface VocalizationRule {
  id: string;
  title: string;
  description: string;
  pattern: string; // Regex o patrón a detectar
  replacement: string; // Cómo debe vocalizarse
  category: 'numbers' | 'currency' | 'dates' | 'emails' | 'phones' | 'general';
  examples: {
    input: string;
    output: string;
  }[];
}

// Parámetros homologados más funcionales identificados
export const OPTIMIZED_PARAMETERS = {
  // De los ejemplos más exitosos
  voice: {
    stability: 0.35, // Promedio de los mejores
    similarityBoost: 0.9, // Estable
    style: 0.45, // Conversacional
    speed: 1.05, // Ligeramente acelerado
    useSpeakerBoost: true,
    enableSsmlParsing: true
  },
  
  transcriber: {
    model: "nova-3", // Más moderno
    numerals: true,
    smartFormat: true,
    endpointing: 180, // Promedio equilibrado
    confidenceThreshold: 0.75 // Confianza alta
  },
  
  conversation: {
    startSpeakingPlan: {
      waitSeconds: 0.8,
      smartEndpointingEnabled: true
    },
    stopSpeakingPlan: {
      numWords: 2,
      voiceSeconds: 0.3,
      backoffSeconds: 1.0
    }
  },
  
  model: {
    provider: "openai",
    model: "gpt-4o",
    temperature: 0.75,
    fallbackModels: ["gpt-4-0125-preview", "gpt-3.5-turbo"] as string[]
  }
} as const;

// Categorías de agentes con sus características específicas
export const AGENT_CATEGORIES = {
  atencion_clientes: {
    name: "Atención al Cliente / Citas",
    description: "Agentes para recepción de llamadas, información general y agendamiento",
    icon: "🏢",
    color: "blue",
    keywords: ["recepción", "información", "citas", "consultas", "horarios"],
    defaultTools: ["transferCall", "endCall"],
    requiredPrompts: ["identity", "workflow", "communication"],
    businessRules: ["validation_identity", "information_scope", "professional_tone"]
  },
  
  ventas: {
    name: "Ventas",
    description: "Agentes especializados en prospección, presentación de productos y cierre de ventas",
    icon: "💰",
    color: "green",
    keywords: ["venta", "prospección", "productos", "ofertas", "conversión"],
    defaultTools: ["function", "transferCall", "endCall"],
    requiredPrompts: ["identity", "sales_flow", "objection_handling", "communication"],
    businessRules: ["sales_ethics", "price_transparency", "objection_management"]
  },
  
  cobranza: {
    name: "Cobranza",
    description: "Agentes para gestión de pagos, recordatorios y negociación de deudas",
    icon: "💳",
    color: "orange",
    keywords: ["cobranza", "pagos", "recordatorios", "negociación", "deudas"],
    defaultTools: ["function", "endCall"],
    requiredPrompts: ["identity", "collection_flow", "negotiation", "communication"],
    businessRules: ["respectful_tone", "legal_compliance", "payment_options"]
  },
  
  soporte_tecnico: {
    name: "Soporte Técnico",
    description: "Agentes para resolución de problemas técnicos y asistencia especializada",
    icon: "🔧",
    color: "purple",
    keywords: ["soporte", "técnico", "resolución", "problemas", "asistencia"],
    defaultTools: ["function", "transferCall", "endCall"],
    requiredPrompts: ["identity", "technical_flow", "troubleshooting", "communication"],
    businessRules: ["technical_accuracy", "escalation_protocol", "patience_required"]
  }
} as const;

// ============== CONSTANTES Y CONFIGURACIONES ==============
