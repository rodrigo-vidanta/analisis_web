import { useState } from 'react';
import { useAppStore } from '../stores/appStore';

type AgentType = 'inbound' | 'outbound' | 'both';
type Voice = {
  id: string;
  name: string;
  preview_url: string;
  language: 'es' | 'en';
};

interface BusinessHours {
  [key: string]: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface AgentTemplate {
  id: string;
  name: string;
  category: 'sales' | 'collection' | 'support' | 'customer_service';
  personality: string;
  description: string;
  systemPrompt: string;
  icon: string;
}

interface AgentConfig {
  // Tipo de agente
  type: AgentType;
  
  // Información básica
  name: string;
  companyName: string;
  companyDescription: string;
  productService: string;
  businessHours: BusinessHours;
  
  // Teléfono
  phoneNumber: string;
  countryCode: string;
  isBYO: boolean;
  
  // Personalidad y voz
  personality: string;
  voice: string;
  language: 'es' | 'en';
  model: string;
  
  // Prompts y plantillas
  selectedTemplate: string;
  customSystemPrompt: string;
  firstMessage: string;
  
  // Configuraciones avanzadas
  endCallConfig: {
    enabled: boolean;
    phrase: string;
  };
  transferConfig: {
    enabled: boolean;
    phone: string;
    extension: string;
    hasExtension: boolean;
  };
}

const IndividualAgentWizard = () => {
  const { setCurrentStep } = useAppStore();
  const [currentWizardStep, setCurrentWizardStep] = useState(1);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    type: 'inbound',
    name: '',
    companyName: '',
    companyDescription: '',
    productService: '',
    businessHours: {
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: true, start: '09:00', end: '18:00' },
      saturday: { enabled: false, start: '09:00', end: '14:00' },
      sunday: { enabled: false, start: '09:00', end: '14:00' }
    },
    phoneNumber: '',
    countryCode: 'MX',
    isBYO: false,
    personality: 'profesional',
    voice: 'es-ES-ElviraNeural',
    language: 'es',
    model: 'gpt-4',
    selectedTemplate: '',
    customSystemPrompt: '',
    firstMessage: '',
    endCallConfig: {
      enabled: true,
      phrase: ''
    },
    transferConfig: {
      enabled: false,
      phone: '',
      extension: '',
      hasExtension: false
    }
  });

  const totalSteps = 7;
  const progressPercentage = (currentWizardStep / totalSteps) * 100;

  // Voces disponibles (ejemplo - esto debería venir de tu API de 11labs)
  const voices: Voice[] = [
    { id: 'es-1', name: 'Elena (Profesional)', preview_url: '', language: 'es' },
    { id: 'es-2', name: 'Carlos (Amigable)', preview_url: '', language: 'es' },
    { id: 'es-3', name: 'Sofia (Energética)', preview_url: '', language: 'es' },
    { id: 'en-1', name: 'Sarah (Professional)', preview_url: '', language: 'en' },
    { id: 'en-2', name: 'Michael (Friendly)', preview_url: '', language: 'en' },
  ];

  // Plantillas de agentes predefinidos
  const agentTemplates: AgentTemplate[] = [
    {
      id: 'sales-aggressive',
      name: 'Vendedor Agresivo',
      category: 'sales',
      personality: 'enérgico y persuasivo',
      description: 'Enfocado en cerrar ventas rápidamente con técnicas de persuasión directa',
      systemPrompt: `Eres un vendedor experto y agresivo de ${agentConfig.companyName}. Tu objetivo principal es cerrar ventas de ${agentConfig.productService}. Características:
- Eres directo y persuasivo
- No aceptas fácilmente un "no" como respuesta
- Usas técnicas de cierre agresivas pero profesionales
- Siempre mencionas la urgencia y escasez
- Destacas los beneficios únicos de nuestro producto/servicio
- Hablas con confianza y autoridad
Tu empresa: ${agentConfig.companyDescription}`,
      icon: '🎯'
    },
    {
      id: 'sales-consultative',
      name: 'Vendedor Consultivo',
      category: 'sales',
      personality: 'empático y analítico',
      description: 'Se enfoca en entender las necesidades del cliente para ofrecer soluciones personalizadas',
      systemPrompt: `Eres un consultor de ventas especializado en ${agentConfig.productService} de ${agentConfig.companyName}. Tu enfoque es consultivo y centrado en el cliente. Características:
- Haces preguntas abiertas para entender necesidades
- Escuchas activamente antes de proponer soluciones
- Educas al cliente sobre beneficios relevantes
- Construyes confianza a largo plazo
- Personalizas tu propuesta según sus necesidades específicas
Tu empresa: ${agentConfig.companyDescription}`,
      icon: '🤝'
    },
    {
      id: 'collection-firm',
      name: 'Cobrador Firme',
      category: 'collection',
      personality: 'firme pero profesional',
      description: 'Mantiene firmeza en el cobro mientras preserva la relación con el cliente',
      systemPrompt: `Eres un especialista en cobranza de ${agentConfig.companyName}. Tu objetivo es recuperar pagos vencidos manteniendo la relación profesional. Características:
- Eres firme pero siempre respetuoso
- Ofreces opciones de pago flexibles
- Explicas las consecuencias de no pagar
- Mantienes un tono profesional sin ser agresivo
- Documentas todos los acuerdos de pago
Tu empresa: ${agentConfig.companyDescription}`,
      icon: '💳'
    },
    {
      id: 'collection-empathetic',
      name: 'Cobrador Empático',
      category: 'collection',
      personality: 'comprensivo y flexible',
      description: 'Aborda el cobro con empatía, buscando soluciones que funcionen para ambas partes',
      systemPrompt: `Eres un especialista en cobranza empática de ${agentConfig.companyName}. Entiendes que los clientes pueden tener dificultades financieras. Características:
- Muestras comprensión por situaciones difíciles
- Ofreces planes de pago accesibles
- Explicas opciones disponibles pacientemente
- Buscas soluciones mutuamente beneficiosas
- Mantienes la dignidad del cliente
Tu empresa: ${agentConfig.companyDescription}`,
      icon: '💙'
    },
    {
      id: 'support-technical',
      name: 'Soporte Técnico Avanzado',
      category: 'support',
      personality: 'técnico y preciso',
      description: 'Especialista en resolver problemas técnicos complejos de manera eficiente',
      systemPrompt: `Eres un especialista en soporte técnico de ${agentConfig.companyName} para ${agentConfig.productService}. Tu objetivo es resolver problemas técnicos eficientemente. Características:
- Haces diagnósticos precisos paso a paso
- Explicas soluciones técnicas en términos simples
- Eres paciente con usuarios no técnicos
- Documentas todos los casos para seguimiento
- Escalas problemas complejos cuando es necesario
Tu empresa: ${agentConfig.companyDescription}`,
      icon: '🔧'
    },
    {
      id: 'support-friendly',
      name: 'Soporte Amigable',
      category: 'support',
      personality: 'amigable y paciente',
      description: 'Enfoque cálido en el soporte, priorizando la experiencia del usuario',
      systemPrompt: `Eres un especialista en soporte al cliente de ${agentConfig.companyName}. Tu prioridad es brindar una experiencia cálida y amigable. Características:
- Siempre mantienes un tono amigable y positivo
- Eres extremadamente paciente con todos los clientes
- Explicas todo de manera simple y clara
- Te aseguras de que el cliente se sienta valorado
- Sigues up en todos los casos hasta su resolución
Tu empresa: ${agentConfig.companyDescription}`,
      icon: '😊'
    },
    {
      id: 'customer-service-professional',
      name: 'Atención Profesional',
      category: 'customer_service',
      personality: 'formal y eficiente',
      description: 'Manejo profesional de consultas con enfoque en eficiencia y satisfacción',
      systemPrompt: `Eres un representante de atención al cliente de ${agentConfig.companyName}. Manejas todas las consultas sobre ${agentConfig.productService} con máximo profesionalismo. Características:
- Mantienes siempre un tono formal y respetuoso
- Eres eficiente en la resolución de consultas
- Sigues protocolos establecidos meticulosamente
- Proporcionas información precisa y completa
- Escalas adecuadamente cuando es necesario
Tu empresa: ${agentConfig.companyDescription}`,
      icon: '👔'
    },
    {
      id: 'customer-service-casual',
      name: 'Atención Casual',
      category: 'customer_service',
      personality: 'relajado y accesible',
      description: 'Atención al cliente con estilo casual y accesible para crear conexión',
      systemPrompt: `Eres un representante de atención al cliente de ${agentConfig.companyName} con un estilo casual y accesible. Características:
- Usas un lenguaje natural y conversacional
- Creas conexión personal con los clientes
- Eres flexible en tu enfoque de resolución
- Mantienes el profesionalismo pero de manera relajada
- Adaptas tu comunicación al estilo del cliente
Tu empresa: ${agentConfig.companyDescription}`,
      icon: '👋'
    }
  ];

  const daysOfWeek = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ];

  const handleNext = () => {
    if (currentWizardStep < totalSteps) {
      setCurrentWizardStep(currentWizardStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentWizardStep > 1) {
      setCurrentWizardStep(currentWizardStep - 1);
    } else {
      setCurrentStep(1);
    }
  };

  const updateConfig = (field: string, value: any) => {
    setAgentConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNestedConfig = (section: string, field: string, value: any) => {
    setAgentConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof AgentConfig],
        [field]: value
      }
    }));
  };

  const updateBusinessHours = (day: string, field: string, value: any) => {
    setAgentConfig(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value
        }
      }
    }));
  };

  const playVoicePreview = async (voiceId: string) => {
    // Aquí integrarías con tu API de 11labs
    console.log(`Playing preview for voice: ${voiceId} with personality: ${agentConfig.personality}`);
    
    // Ejemplo de mensaje personalizado según personalidad
    const personalityMessages = {
      'profesional': 'Hola, soy tu asistente virtual profesional. ¿En qué puedo ayudarte hoy?',
      'amigable': '¡Hola! ¡Qué gusto saludarte! Soy tu asistente virtual. ¿Cómo puedo ayudarte?',
      'energico': '¡Hola! ¡Excelente día para hacer negocios! Soy tu asistente virtual. ¿Qué necesitas?',
      'formal': 'Buenos días. Soy el asistente virtual de la empresa. ¿En qué puedo asistirle?',
      'casual': 'Hey, ¿qué tal? Soy tu asistente virtual. ¿En qué te puedo echar una mano?'
    };
    
    const message = personalityMessages[agentConfig.personality as keyof typeof personalityMessages] || personalityMessages.profesional;
    
    // Aquí harías la llamada a tu API de 11labs
    // const response = await fetch('your-11labs-api-endpoint', { ... });
    
    alert(`Preview: ${message}\n(Voz: ${voiceId})`);
  };

  const generateAgent = async () => {
    try {
      // Usar Edge Function en lugar de webhook directo
      const edgeFunctionUrl = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/agent-creator-proxy`;
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(agentConfig)
      });
      
      const result = await response.json();
      
      // Mostrar respuesta en recuadro flotante
      alert(`Agente generado exitosamente!\n\nRespuesta: ${JSON.stringify(result, null, 2)}`);
      
    } catch (error) {
      console.error('Error generando agente:', error);
      alert('Error al generar el agente. Por favor intenta nuevamente.');
    }
  };

  const filteredVoices = voices.filter(voice => voice.language === agentConfig.language);

  const renderStep = () => {
    switch (currentWizardStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Tipo de Agente
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                ¿Cómo funcionará tu agente?
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  type: 'inbound' as AgentType,
                  title: 'Llamadas Entrantes',
                  description: 'Tu agente recibirá llamadas de clientes',
                  icon: '📞',
                  features: ['Atención 24/7', 'Respuesta inmediata', 'Manejo de consultas']
                },
                {
                  type: 'outbound' as AgentType,
                  title: 'Llamadas Salientes',
                  description: 'Tu agente realizará llamadas a clientes',
                  icon: '📱',
                  features: ['Campañas automatizadas', 'Seguimiento de leads', 'Procesos de ventas']
                },
                {
                  type: 'both' as AgentType,
                  title: 'Ambos Tipos',
                  description: 'Tu agente manejará llamadas entrantes y salientes',
                  icon: '🔄',
                  features: ['Máxima flexibilidad', 'Cobertura completa', 'Optimización de recursos']
                }
              ].map((option) => (
                <div
                  key={option.type}
                  className={`modern-card p-6 cursor-pointer transition-all ${
                    agentConfig.type === option.type 
                      ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                      : 'hover:shadow-lg'
                  }`}
                  onClick={() => updateConfig('type', option.type)}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-4">{option.icon}</div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {option.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {option.description}
                    </p>
                    <div className="space-y-1">
                      {option.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center text-xs text-gray-500">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></div>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Información de la Empresa
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Cuéntanos sobre tu empresa y agente
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre del Agente
                  </label>
                  <input
                    type="text"
                    value={agentConfig.name}
                    onChange={(e) => updateConfig('name', e.target.value)}
                    placeholder="Ej: Asistente de Ventas"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre de la Empresa
                  </label>
                  <input
                    type="text"
                    value={agentConfig.companyName}
                    onChange={(e) => updateConfig('companyName', e.target.value)}
                    placeholder="Ej: TechSolutions Corp"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción de la Empresa
                </label>
                <textarea
                  value={agentConfig.companyDescription}
                  onChange={(e) => updateConfig('companyDescription', e.target.value)}
                  placeholder="Describe tu empresa: ubicación, sucursales, historia, valores..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Producto o Servicio
                </label>
                <textarea
                  value={agentConfig.productService}
                  onChange={(e) => updateConfig('productService', e.target.value)}
                  placeholder="Describe detalladamente qué vendes o qué servicio ofreces..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Horarios de servicio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Horarios de Servicio
                </label>
                <div className="space-y-3">
                  {daysOfWeek.map((day) => (
                    <div key={day.key} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-20">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={agentConfig.businessHours[day.key].enabled}
                            onChange={(e) => updateBusinessHours(day.key, 'enabled', e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {day.label}
                          </span>
                        </label>
                      </div>
                      
                      {agentConfig.businessHours[day.key].enabled && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="time"
                            value={agentConfig.businessHours[day.key].start}
                            onChange={(e) => updateBusinessHours(day.key, 'start', e.target.value)}
                            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md text-sm"
                          />
                          <span className="text-gray-500">a</span>
                          <input
                            type="time"
                            value={agentConfig.businessHours[day.key].end}
                            onChange={(e) => updateBusinessHours(day.key, 'end', e.target.value)}
                            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md text-sm"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Configuración de Número
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {agentConfig.type === 'inbound' && 'Número desde el cual recibirás las llamadas'}
                {agentConfig.type === 'outbound' && 'Número desde el cual se realizarán las llamadas'}
                {agentConfig.type === 'both' && 'Número principal para tu agente'}
              </p>
            </div>

            <div className="modern-card p-6">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    País
                  </label>
                  <select
                    value={agentConfig.countryCode}
                    onChange={(e) => updateConfig('countryCode', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="MX">🇲🇽 México (+52)</option>
                    <option value="US">🇺🇸 Estados Unidos (+1)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Número
                  </label>
                  <div className="flex items-center space-x-4 pt-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="phone-type"
                        checked={!agentConfig.isBYO}
                        onChange={() => updateConfig('isBYO', false)}
                        className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Nuevo</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="phone-type"
                        checked={agentConfig.isBYO}
                        onChange={() => updateConfig('isBYO', true)}
                        className="text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">BYO (Bring Your Own)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Número de Teléfono
                  {agentConfig.isBYO && <span className="text-xs text-indigo-600 ml-2">(BYO - Bring Your Own)</span>}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">
                      {agentConfig.countryCode === 'MX' ? '🇲🇽 +52' : '🇺🇸 +1'}
                    </span>
                  </div>
                  <input
                    type="tel"
                    value={agentConfig.phoneNumber}
                    onChange={(e) => updateConfig('phoneNumber', e.target.value)}
                    placeholder={agentConfig.countryCode === 'MX' ? '5512345678' : '5551234567'}
                    maxLength={10}
                    pattern="[0-9]{10}"
                    className="w-full pl-20 pr-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-mono"
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ingresa 10 dígitos sin espacios ni caracteres especiales
                  </p>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-mono">
                      {agentConfig.phoneNumber 
                        ? `${agentConfig.countryCode === 'MX' ? '+52' : '+1'}${agentConfig.phoneNumber}` 
                        : `${agentConfig.countryCode === 'MX' ? '+52' : '+1'}__________`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Personalidad y Voz
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Define cómo sonará tu agente
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Personalidad
                </label>
                <select
                  value={agentConfig.personality}
                  onChange={(e) => updateConfig('personality', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="profesional">Profesional</option>
                  <option value="amigable">Amigable</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                  <option value="energico">Enérgico</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Idioma
                </label>
                <select
                  value={agentConfig.language}
                  onChange={(e) => updateConfig('language', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Selecciona una Voz
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                {filteredVoices.map((voice) => (
                  <div
                    key={voice.id}
                    className={`modern-card p-4 cursor-pointer transition-all ${
                      agentConfig.voice === voice.id 
                        ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                        : 'hover:shadow-lg'
                    }`}
                    onClick={() => updateConfig('voice', voice.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {voice.name}
                        </h3>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playVoicePreview(voice.id);
                        }}
                        className="p-2 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-800 dark:hover:bg-indigo-700 rounded-lg transition-colors"
                        title="Escuchar preview"
                      >
                        <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Modelo de IA
              </label>
              <select
                value={agentConfig.model}
                onChange={(e) => updateConfig('model', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="gpt-4">GPT-4 (Recomendado)</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3">Claude 3</option>
              </select>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Plantillas de Agente
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Selecciona una plantilla predefinida o personaliza
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {agentTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`modern-card p-6 cursor-pointer transition-all ${
                    agentConfig.selectedTemplate === template.id 
                      ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                      : 'hover:shadow-lg'
                  }`}
                  onClick={() => {
                    updateConfig('selectedTemplate', template.id);
                    updateConfig('customSystemPrompt', template.systemPrompt);
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{template.icon}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {template.name}
                        </h3>
                        <p className="text-xs text-gray-500 capitalize">
                          {template.personality}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Abrir modal de personalización
                        console.log('Personalizar plantilla:', template.id);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      title="Personalizar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    {template.description}
                  </p>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {template.category === 'sales' && '💼 Ventas'}
                    {template.category === 'collection' && '💳 Cobranza'}
                    {template.category === 'support' && '🔧 Soporte'}
                    {template.category === 'customer_service' && '🎧 Atención al Cliente'}
                  </div>
                </div>
              ))}
            </div>

            {agentConfig.selectedTemplate && (
              <div className="modern-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Prompt del Sistema (Personalizable)
                </h3>
                <textarea
                  value={agentConfig.customSystemPrompt}
                  onChange={(e) => updateConfig('customSystemPrompt', e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm"
                  placeholder="El prompt del sistema se adaptará automáticamente con la información de tu empresa..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Las modificaciones se guardarán solo para esta sesión
                </p>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Configuraciones Avanzadas
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Configuración de fin de llamada y transferencias
              </p>
            </div>

            <div className="space-y-8">
              {/* End Call Configuration */}
              <div className="modern-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Fin de Llamada *
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Permite que el agente termine la llamada (Requerido)
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agentConfig.endCallConfig.enabled}
                      onChange={(e) => updateNestedConfig('endCallConfig', 'enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Frase de Despedida * (Obligatoria)
                  </label>
                  <input
                    type="text"
                    value={agentConfig.endCallConfig.phrase}
                    onChange={(e) => updateNestedConfig('endCallConfig', 'phrase', e.target.value)}
                    placeholder="Gracias por llamar. ¡Que tengas un buen día!"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Transfer Configuration */}
              <div className="modern-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Transferencia de Llamadas
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Permite transferir llamadas a un número específico
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agentConfig.transferConfig.enabled}
                      onChange={(e) => updateNestedConfig('transferConfig', 'enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                
                {agentConfig.transferConfig.enabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Número de Transferencia
                      </label>
                      <input
                        type="tel"
                        value={agentConfig.transferConfig.phone}
                        onChange={(e) => updateNestedConfig('transferConfig', 'phone', e.target.value)}
                        placeholder="+1234567890"
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          ¿Tiene Extensión?
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Agregar extensión al número de transferencia
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agentConfig.transferConfig.hasExtension}
                          onChange={(e) => updateNestedConfig('transferConfig', 'hasExtension', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {agentConfig.transferConfig.hasExtension && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Extensión (máximo 8 dígitos)
                        </label>
                        <input
                          type="number"
                          value={agentConfig.transferConfig.extension}
                          onChange={(e) => updateNestedConfig('transferConfig', 'extension', e.target.value)}
                          placeholder="1234"
                          min="0"
                          max="99999999"
                          maxLength={8}
                          className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Resumen Final
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Revisa la configuración de tu agente antes de generar
              </p>
            </div>

            <div className="modern-card p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Tipo de Agente
                  </h3>
                  <p className="text-gray-900 dark:text-white capitalize">
                    {agentConfig.type === 'inbound' && 'Llamadas Entrantes'}
                    {agentConfig.type === 'outbound' && 'Llamadas Salientes'}
                    {agentConfig.type === 'both' && 'Entrantes y Salientes'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Nombre del Agente
                  </h3>
                  <p className="text-gray-900 dark:text-white">{agentConfig.name || 'Sin definir'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Empresa
                  </h3>
                  <p className="text-gray-900 dark:text-white">{agentConfig.companyName || 'Sin definir'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Teléfono
                  </h3>
                  <p className="text-gray-900 dark:text-white font-mono">
                    {agentConfig.phoneNumber 
                      ? `${agentConfig.countryCode === 'MX' ? '+52' : '+1'}${agentConfig.phoneNumber}` 
                      : 'Sin definir'
                    }
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Personalidad
                  </h3>
                  <p className="text-gray-900 dark:text-white capitalize">{agentConfig.personality}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Voz
                  </h3>
                  <p className="text-gray-900 dark:text-white">{agentConfig.voice}</p>
                </div>
              </div>

              {agentConfig.productService && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Producto/Servicio
                  </h3>
                  <p className="text-gray-900 dark:text-white text-sm">{agentConfig.productService}</p>
                </div>
              )}

              {agentConfig.selectedTemplate && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Plantilla Seleccionada
                  </h3>
                  <p className="text-gray-900 dark:text-white text-sm">
                    {agentTemplates.find(t => t.id === agentConfig.selectedTemplate)?.name || 'Personalizada'}
                  </p>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Configuraciones
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${agentConfig.endCallConfig.enabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="text-gray-600 dark:text-gray-300">
                      Fin de llamada: {agentConfig.endCallConfig.enabled ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${agentConfig.transferConfig.enabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="text-gray-600 dark:text-gray-300">
                      Transferencias: {agentConfig.transferConfig.enabled ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-5xl mx-auto px-6">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Paso {currentWizardStep} de {totalSteps}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(progressPercentage)}% completado
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Main content */}
        <div className="glass-card p-8 mb-8">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            className="flex items-center space-x-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Anterior</span>
          </button>

          <div className="flex space-x-4">
            <button className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200">
              Guardar Borrador
            </button>

            {currentWizardStep < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={
                  (currentWizardStep === 2 && (!agentConfig.name || !agentConfig.companyName)) ||
                  (currentWizardStep === 3 && !agentConfig.phoneNumber) ||
                  (currentWizardStep === 6 && !agentConfig.endCallConfig.phrase)
                }
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Siguiente</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            ) : (
              <button
                className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg"
                onClick={generateAgent}
                disabled={!agentConfig.endCallConfig.phrase}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Generar Agente</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndividualAgentWizard;