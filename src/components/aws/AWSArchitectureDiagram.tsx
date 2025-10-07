import React from 'react';
import { Cloud, Database, Server, Shield, Network, Globe, Users, Building, Phone, MessageCircle, Brain, Workflow } from 'lucide-react';

const AWSArchitectureDiagram: React.FC = () => {
  // Sistema de coordenadas - Grid de 12x8 (100px cada celda)
  const GRID_SIZE = 100;
  const DIAGRAM_WIDTH = 1200;
  const DIAGRAM_HEIGHT = 800;

  const getPosition = (gridX: number, gridY: number, width: number = 1, height: number = 1) => ({
    left: `${gridX * GRID_SIZE}px`,
    top: `${gridY * GRID_SIZE}px`,
    width: `${width * GRID_SIZE - 10}px`,
    minHeight: `${height * GRID_SIZE - 10}px`
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Arquitectura Vidanta AI Call System
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Flujo completo desde redes sociales hasta infraestructura AWS
        </p>
      </div>

      {/* Diagrama principal con grid de referencia */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 overflow-x-auto">
        <div style={{ 
          width: `${DIAGRAM_WIDTH}px`, 
          height: `${DIAGRAM_HEIGHT}px`, 
          position: 'relative',
          background: 'linear-gradient(to right, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)'
        }}>
          
          {/* Customer Journey Layer */}
          <div style={{
            ...getPosition(1, 0.5, 10, 1),
            background: '#dbeafe',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '12px',
            zIndex: 10
          }}>
            <div style={{ 
              background: '#3b82f6', 
              color: 'white', 
              padding: '6px 12px', 
              borderRadius: '4px', 
              fontSize: '12px', 
              fontWeight: '600',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Users size={16} />
              Customer Journey
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div style={{ 
                background: '#1877f2', 
                color: 'white', 
                padding: '8px', 
                borderRadius: '4px', 
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                <Users size={14} />
                Redes Sociales
              </div>
              <div style={{ 
                background: '#25d366', 
                color: 'white', 
                padding: '8px', 
                borderRadius: '4px', 
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                <MessageCircle size={14} />
                WhatsApp Business
              </div>
              <div style={{ 
                background: '#8b5cf6', 
                color: 'white', 
                padding: '8px', 
                borderRadius: '4px', 
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                <Brain size={14} />
                IA Discovery
              </div>
            </div>
          </div>

          {/* Integration Layer */}
          <div style={{
            ...getPosition(2, 2, 4, 1.5),
            background: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ 
              background: '#f59e0b', 
              color: 'white', 
              padding: '6px 12px', 
              borderRadius: '4px', 
              fontSize: '12px', 
              fontWeight: '600',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Workflow size={16} />
              Integration Layer
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ 
                background: '#8b5cf6', 
                color: 'white', 
                padding: '12px', 
                borderRadius: '6px', 
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                <Brain size={16} />
                uChat System
              </div>
              <div style={{ 
                background: '#f59e0b', 
                color: 'white', 
                padding: '12px', 
                borderRadius: '6px', 
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                <Workflow size={16} />
                n8n Workflows
              </div>
            </div>
          </div>

          {/* VAPI Layer */}
          <div style={{
            ...getPosition(7, 2, 3, 1),
            background: '#cffafe',
            border: '2px solid #06b6d4',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ 
              background: '#06b6d4', 
              color: 'white', 
              padding: '6px 12px', 
              borderRadius: '4px', 
              fontSize: '12px', 
              fontWeight: '600',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Phone size={16} />
              VAPI AI Calls
            </div>
            
            <div style={{ 
              background: '#0891b2', 
              color: 'white', 
              padding: '8px', 
              borderRadius: '4px', 
              textAlign: 'center',
              fontSize: '10px',
              fontWeight: '500'
            }}>
              Llamadas Inteligentes
            </div>
          </div>

          {/* AWS Infrastructure Layer */}
          <div style={{
            ...getPosition(1, 4.5, 10, 2),
            background: '#fed7aa',
            border: '2px solid #f97316',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{ 
              background: '#f97316', 
              color: 'white', 
              padding: '8px 12px', 
              borderRadius: '4px', 
              fontSize: '12px', 
              fontWeight: '600',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Cloud size={16} />
              AWS Infrastructure (us-west-2)
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              <div style={{ 
                background: '#8b5cf6', 
                color: 'white', 
                padding: '12px', 
                borderRadius: '6px', 
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Network size={16} />
                Application Load Balancer
              </div>
              <div style={{ 
                background: '#f97316', 
                color: 'white', 
                padding: '12px', 
                borderRadius: '6px', 
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Server size={16} />
                ECS Fargate
              </div>
              <div style={{ 
                background: '#f97316', 
                color: 'white', 
                padding: '12px', 
                borderRadius: '6px', 
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Cloud size={16} />
                CloudFront CDN
              </div>
              <div style={{ 
                background: '#10b981', 
                color: 'white', 
                padding: '12px', 
                borderRadius: '6px', 
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Globe size={16} />
                Route 53 DNS
              </div>
              <div style={{ 
                background: '#6b7280', 
                color: 'white', 
                padding: '12px', 
                borderRadius: '6px', 
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Shield size={16} />
                VPC Network
              </div>
            </div>
          </div>

          {/* Data Layer */}
          <div style={{
            ...getPosition(2, 7, 8, 1),
            background: '#e0f2fe',
            border: '2px solid #0284c7',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ 
              background: '#0284c7', 
              color: 'white', 
              padding: '6px 12px', 
              borderRadius: '4px', 
              fontSize: '12px', 
              fontWeight: '600',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Database size={16} />
              Data Layer
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
              <div style={{ 
                background: '#1e40af', 
                color: 'white', 
                padding: '12px', 
                borderRadius: '6px', 
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Database size={16} />
                PostgreSQL RDS
                <div style={{ fontSize: '8px', opacity: 0.8 }}>db.r6g.large</div>
              </div>
              <div style={{ 
                background: '#dc2626', 
                color: 'white', 
                padding: '12px', 
                borderRadius: '6px', 
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Database size={16} />
                ElastiCache Redis
                <div style={{ fontSize: '8px', opacity: 0.8 }}>cache.r6g.large</div>
              </div>
              <div style={{ 
                background: '#0284c7', 
                color: 'white', 
                padding: '12px', 
                borderRadius: '6px', 
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Cloud size={16} />
                S3 Storage
                <div style={{ fontSize: '8px', opacity: 0.8 }}>vidanta-ai-assets</div>
              </div>
              <div style={{ 
                background: '#7c3aed', 
                color: 'white', 
                padding: '12px', 
                borderRadius: '6px', 
                textAlign: 'center',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Server size={16} />
                CloudWatch
                <div style={{ fontSize: '8px', opacity: 0.8 }}>Monitoring</div>
              </div>
            </div>
          </div>

          {/* Líneas de conexión del flujo real */}
          <svg style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            pointerEvents: 'none', 
            zIndex: 1 
          }}>
            {/* Customer Journey Flow */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
              </marker>
            </defs>
            
            {/* Redes Sociales → WhatsApp → IA Discovery */}
            <path 
              d="M 200 100 Q 300 80 400 100" 
              stroke="#1877f2" 
              strokeWidth="3" 
              fill="none" 
              markerEnd="url(#arrowhead)"
            />
            <path 
              d="M 500 100 Q 600 80 700 100" 
              stroke="#25d366" 
              strokeWidth="3" 
              fill="none" 
              markerEnd="url(#arrowhead)"
            />
            
            {/* Customer Journey → Integration */}
            <path 
              d="M 350 150 Q 350 180 300 220" 
              stroke="#8b5cf6" 
              strokeWidth="2" 
              fill="none" 
              markerEnd="url(#arrowhead)"
            />
            <path 
              d="M 650 150 Q 650 180 500 220" 
              stroke="#8b5cf6" 
              strokeWidth="2" 
              fill="none" 
              markerEnd="url(#arrowhead)"
            />
            
            {/* Integration → VAPI */}
            <path 
              d="M 500 270 Q 600 250 750 250" 
              stroke="#f59e0b" 
              strokeWidth="3" 
              fill="none" 
              markerEnd="url(#arrowhead)"
            />
            
            {/* VAPI → AWS Infrastructure */}
            <path 
              d="M 750 300 Q 750 350 600 450" 
              stroke="#06b6d4" 
              strokeWidth="4" 
              fill="none" 
              markerEnd="url(#arrowhead)"
            />
            
            {/* AWS Infrastructure → Data Layer */}
            <path 
              d="M 400 550 L 400 650" 
              stroke="#f97316" 
              strokeWidth="2" 
              fill="none" 
              markerEnd="url(#arrowhead)"
            />
            <path 
              d="M 600 550 L 600 650" 
              stroke="#f97316" 
              strokeWidth="2" 
              fill="none" 
              markerEnd="url(#arrowhead)"
            />
            <path 
              d="M 800 550 L 800 650" 
              stroke="#f97316" 
              strokeWidth="2" 
              fill="none" 
              markerEnd="url(#arrowhead)"
            />
          </svg>

          {/* Labels de flujo */}
          <div style={{
            position: 'absolute',
            top: '60px',
            left: '250px',
            background: '#1877f2',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '9px',
            fontWeight: '500'
          }}>
            Leads
          </div>
          
          <div style={{
            position: 'absolute',
            top: '60px',
            left: '550px',
            background: '#25d366',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '9px',
            fontWeight: '500'
          }}>
            Mensajes
          </div>
          
          <div style={{
            position: 'absolute',
            top: '230px',
            left: '550px',
            background: '#f59e0b',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '9px',
            fontWeight: '500'
          }}>
            Workflows
          </div>
          
          <div style={{
            position: 'absolute',
            top: '320px',
            left: '680px',
            background: '#06b6d4',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '9px',
            fontWeight: '500'
          }}>
            Trigger Calls
          </div>
          
          <div style={{
            position: 'absolute',
            top: '580px',
            left: '350px',
            background: '#f97316',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '9px',
            fontWeight: '500'
          }}>
            Queries
          </div>
          
          <div style={{
            position: 'absolute',
            top: '580px',
            left: '550px',
            background: '#dc2626',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '9px',
            fontWeight: '500'
          }}>
            Cache
          </div>
          
          <div style={{
            position: 'absolute',
            top: '580px',
            left: '750px',
            background: '#0284c7',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '9px',
            fontWeight: '500'
          }}>
            Files
          </div>
        </div>
      </div>

      {/* Información técnica real */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Customer Journey</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">Captación y análisis</p>
            </div>
          </div>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <li>• <strong>Facebook, Instagram, Google Ads</strong> - Generación de leads</li>
            <li>• <strong>WhatsApp Business</strong> - Primer contacto</li>
            <li>• <strong>IA Discovery</strong> - Análisis de intención</li>
          </ul>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Workflow size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">Integration</h3>
              <p className="text-sm text-orange-700 dark:text-orange-300">Procesamiento y orquestación</p>
            </div>
          </div>
          <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-2">
            <li>• <strong>uChat System</strong> - Gestión de conversaciones</li>
            <li>• <strong>n8n Workflows</strong> - Orquestación de procesos</li>
            <li>• <strong>VAPI Integration</strong> - Activación de llamadas</li>
          </ul>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-red-500 rounded-lg">
              <Cloud size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100">AWS Infrastructure</h3>
              <p className="text-sm text-red-700 dark:text-red-300">Infraestructura en us-west-2</p>
            </div>
          </div>
          <ul className="text-sm text-red-800 dark:text-red-200 space-y-2">
            <li>• <strong>ECS Fargate</strong> - n8n-production</li>
            <li>• <strong>RDS PostgreSQL</strong> - db.r6g.large Multi-AZ</li>
            <li>• <strong>ElastiCache Redis</strong> - cache.r6g.large</li>
            <li>• <strong>S3 + CloudFront</strong> - Assets y CDN</li>
            <li>• <strong>Route 53</strong> - ai.vidanta.com</li>
          </ul>
        </div>
      </div>

      {/* Métricas reales del proyecto */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Especificaciones Técnicas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">us-west-2</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Región AWS</div>
            <div className="text-xs text-slate-500 dark:text-slate-500">Oregon - Optimizada VAPI</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">&lt;50ms</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Latencia VAPI</div>
            <div className="text-xs text-slate-500 dark:text-slate-500">Tiempo de respuesta objetivo</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">99.9%</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">SLA Disponibilidad</div>
            <div className="text-xs text-slate-500 dark:text-slate-500">Acuerdo de nivel de servicio</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">68%</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Reducción de Costos</div>
            <div className="text-xs text-slate-500 dark:text-slate-500">vs Railway actual</div>
          </div>
        </div>
      </div>

      {/* Información de recursos reales */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Recursos AWS Configurados
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">Infraestructura Principal</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
              <li>• <strong>VPC:</strong> vpc-05eb3d8651aff5257 (10.0.0.0/16)</li>
              <li>• <strong>ECS Cluster:</strong> n8n-production (2 tareas)</li>
              <li>• <strong>RDS:</strong> n8n-postgres.c9memqg6633m.us-west-2.rds.amazonaws.com</li>
              <li>• <strong>Redis:</strong> n8n-redis.7w6q9d.ng.0001.usw2.cache.amazonaws.com</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">Configuración VAPI</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
              <li>• <strong>Región:</strong> us-west-2 (Oregon)</li>
              <li>• <strong>Latencia objetivo:</strong> &lt;50ms</li>
              <li>• <strong>DNS:</strong> ai.vidanta.com</li>
              <li>• <strong>Zona:</strong> Z05991931MBGUXOLH9HO2</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AWSArchitectureDiagram;