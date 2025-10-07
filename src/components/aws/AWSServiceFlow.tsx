import React from 'react';
import { ArrowRight, Phone, MessageCircle, Brain, Database, Cloud, Activity, Users } from 'lucide-react';

const AWSServiceFlow: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Flujo de Servicios Vidanta AI
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Proceso completo desde la captación de leads hasta la conversión
        </p>
      </div>

      {/* Flujo principal */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
        <div className="space-y-8">
          
          {/* Paso 1: Captación de Leads */}
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                <Users size={24} className="text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                1. Captación de Leads
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Los leads llegan desde redes sociales y son dirigidos a WhatsApp Business para el primer contacto.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">📱</span>
                    <span className="font-medium text-slate-900 dark:text-white">Redes Sociales</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Facebook, Instagram, Google Ads
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageCircle size={20} className="text-green-500" />
                    <span className="font-medium text-slate-900 dark:text-white">WhatsApp</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Primer punto de contacto
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Database size={20} className="text-blue-500" />
                    <span className="font-medium text-slate-900 dark:text-white">CRM</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Registro automático de leads
                  </p>
                </div>
              </div>
            </div>
            <ArrowRight size={24} className="text-slate-400 flex-shrink-0" />
          </div>

          {/* Paso 2: Análisis IA */}
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                <Brain size={24} className="text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                2. Análisis IA Discovery
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                La IA analiza los mensajes de WhatsApp para determinar el interés y calificar al lead automáticamente.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain size={20} className="text-purple-500" />
                    <span className="font-medium text-slate-900 dark:text-white">NLP Analysis</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Procesamiento de lenguaje natural
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity size={20} className="text-green-500" />
                    <span className="font-medium text-slate-900 dark:text-white">Scoring</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Calificación automática de leads
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Cloud size={20} className="text-blue-500" />
                    <span className="font-medium text-slate-900 dark:text-white">n8n Workflow</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Orquestación de procesos
                  </p>
                </div>
              </div>
            </div>
            <ArrowRight size={24} className="text-slate-400 flex-shrink-0" />
          </div>

          {/* Paso 3: Trigger de Llamada */}
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                <Phone size={24} className="text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                3. Activación de Llamada IA
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Cuando el lead está calificado, se activa automáticamente una llamada de VAPI para engagement directo.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">🎯</span>
                    <span className="font-medium text-slate-900 dark:text-white">Trigger Logic</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Condiciones para activar llamada
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Phone size={20} className="text-orange-500" />
                    <span className="font-medium text-slate-900 dark:text-white">VAPI Call</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Llamada de IA personalizada
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity size={20} className="text-green-500" />
                    <span className="font-medium text-slate-900 dark:text-white">Real-time</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Monitoreo en tiempo real
                  </p>
                </div>
              </div>
            </div>
            <ArrowRight size={24} className="text-slate-400 flex-shrink-0" />
          </div>

          {/* Paso 4: Escalación Humana */}
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                <Users size={24} className="text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                4. Escalación a Agente Humano
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Cuando la IA determina que se necesita intervención humana, transfiere la llamada al PBX de Cisco.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">🤖➡️👨‍💼</span>
                    <span className="font-medium text-slate-900 dark:text-white">Handoff</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Transferencia inteligente
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">🏢</span>
                    <span className="font-medium text-slate-900 dark:text-white">Cisco PBX</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Sistema telefónico corporativo
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Database size={20} className="text-blue-500" />
                    <span className="font-medium text-slate-900 dark:text-white">Context</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Historial completo del lead
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas del flujo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">85%</span>
          </div>
          <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">
            Tasa de Calificación
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Leads calificados por IA
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Phone size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">92%</span>
          </div>
          <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">
            Tasa de Conexión
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Llamadas VAPI exitosas
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Activity size={24} className="text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">3.2s</span>
          </div>
          <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">
            Tiempo de Respuesta
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Promedio de activación
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Brain size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">67%</span>
          </div>
          <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">
            Tasa de Conversión
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Lead a oportunidad
          </div>
        </div>
      </div>

      {/* Integración con sistemas */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
          Integración con Sistemas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Cloud size={32} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">n8n Workflows</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Orquestación de todos los procesos y integraciones entre sistemas
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Database size={32} className="text-green-600 dark:text-green-400" />
            </div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">CRM Integration</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sincronización automática con HubSpot, Salesforce y otros CRMs
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Activity size={32} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">Analytics</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Métricas en tiempo real y reportes detallados de rendimiento
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AWSServiceFlow;
