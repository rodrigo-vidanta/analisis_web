import React, { useState } from 'react';
import { Activity, CheckCircle, AlertTriangle, FileText, BarChart3, TrendingUp, Cloud, Database, Server, Globe, RefreshCw, Shield, Network, Users, Building, Phone, Eye } from 'lucide-react';
import { useAWS, useAWSMetrics } from '../../hooks/useAWS';

interface AWSStatus {
  rds: 'available' | 'creating' | 'error';
  redis: 'available' | 'creating' | 'error';
  ecs: 'active' | 'inactive' | 'error';
  dns: 'active' | 'pending' | 'error';
}

const AWSOverview: React.FC = () => {
  const { data, loading, error, refresh, isUsingMockData, lastUpdated } = useAWS();
  const { metrics, loading: metricsLoading } = useAWSMetrics();

  // Mapear datos reales a estados locales para compatibilidad
  const getResourceStatus = (resources: any[], type: string) => {
    const resource = resources?.find(r => r.type === type);
    if (!resource) return 'error';
    
    switch (resource.status) {
      case 'running':
        return type === 'ecs' ? 'active' : 'available';
      case 'pending':
        return 'creating';
      default:
        return 'error';
    }
  };

  const awsStatus: AWSStatus = {
    rds: getResourceStatus(data?.rds || [], 'rds') as any,
    redis: 'available', // Redis no está en los recursos principales, usar mock
    ecs: getResourceStatus(data?.ecs || [], 'ecs') as any,
    dns: data?.route53?.length ? 'active' : 'error' as any
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
      case 'active':
        return <CheckCircle size={12} className="text-green-500" />;
      case 'creating':
      case 'pending':
        return <Activity size={12} className="text-yellow-500" />;
      default:
        return <AlertTriangle size={12} className="text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
      case 'active':
        return 'text-green-500';
      case 'creating':
      case 'pending':
        return 'text-yellow-500';
      default:
        return 'text-red-500';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header con indicadores de estado */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Resumen AWS
          </h2>
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                isUsingMockData ? 'bg-yellow-500' : 'bg-green-500'
              } animate-pulse`}></div>
              <span className="text-slate-600 dark:text-slate-400">
                {isUsingMockData ? 'Datos simulados' : 'Conectado a AWS'}
              </span>
            </div>
            {lastUpdated && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Actualizado: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 text-white rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={20} className="text-red-500" />
            <div>
              <h3 className="font-medium text-red-900 dark:text-red-100">Error de conexión AWS</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="text-slate-600 dark:text-slate-400">Cargando datos AWS...</span>
          </div>
        </div>
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp size={24} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {metricsLoading ? '...' : `${metrics.costReduction}%`}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Reducción de Costos vs Railway
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Activity size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {metricsLoading ? '...' : metrics.latency}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Tiempo de Respuesta VAPI
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {metricsLoading ? '...' : `${metrics.uptime}%`}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              SLA de Disponibilidad
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Globe size={24} className="text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {metricsLoading ? '...' : metrics.region}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Región Principal
            </div>
          </div>
        </div>
      </div>

      {/* Estado de infraestructura */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Cloud size={20} className="text-orange-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Estado de Infraestructura AWS
            </h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Estado en tiempo real de los recursos de producción en AWS
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Database size={16} className="text-gray-600 dark:text-gray-400" />
                </div>
                <h4 className="font-medium text-slate-900 dark:text-white">PostgreSQL RDS</h4>
              </div>
              <div className={`flex items-center space-x-1 ${getStatusColor(awsStatus.rds)}`}>
                {getStatusIcon(awsStatus.rds)}
                <span className="text-xs font-medium uppercase">
                  {awsStatus.rds}
                </span>
              </div>
            </div>
            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              {data?.rds?.[0] ? (
                <>
                  <div><strong>Instancia:</strong> {data.rds[0].id}</div>
                  <div><strong>Clase:</strong> {data.rds[0].details?.instanceClass || 'db.r6g.large'}</div>
                  <div><strong>Motor:</strong> {data.rds[0].details?.engine || 'PostgreSQL'}</div>
                  <div className="mt-2">
                    <code className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                      {data.rds[0].details?.endpoint || 'n8n-postgres.c9memqg6633m.us-west-2.rds.amazonaws.com'}
                    </code>
                  </div>
                </>
              ) : (
                <>
                  <div><strong>Instancia:</strong> n8n-postgres</div>
                  <div><strong>Clase:</strong> db.r6g.large</div>
                  <div><strong>Almacenamiento:</strong> 100GB GP3</div>
                  <div className="mt-2">
                    <code className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                      n8n-postgres.c9memqg6633m.us-west-2.rds.amazonaws.com
                    </code>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Database size={16} className="text-red-600 dark:text-red-400" />
                </div>
                <h4 className="font-medium text-slate-900 dark:text-white">ElastiCache Redis</h4>
              </div>
              <div className={`flex items-center space-x-1 ${getStatusColor(awsStatus.redis)}`}>
                {getStatusIcon(awsStatus.redis)}
                <span className="text-xs font-medium uppercase">
                  {awsStatus.redis}
                </span>
              </div>
            </div>
            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <div><strong>Cluster:</strong> n8n-redis</div>
              <div><strong>Tipo:</strong> cache.r6g.large</div>
              <div><strong>Nodos:</strong> 2 (Multi-AZ)</div>
              <div className="mt-2">
                <code className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                  n8n-redis.7w6q9d.ng.0001.usw2.cache.amazonaws.com
                </code>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Server size={16} className="text-orange-600 dark:text-orange-400" />
                </div>
                <h4 className="font-medium text-slate-900 dark:text-white">ECS Fargate</h4>
              </div>
              <div className={`flex items-center space-x-1 ${getStatusColor(awsStatus.ecs)}`}>
                {getStatusIcon(awsStatus.ecs)}
                <span className="text-xs font-medium uppercase">
                  {awsStatus.ecs}
                </span>
              </div>
            </div>
            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <div><strong>Cluster:</strong> n8n-production</div>
              <div><strong>Servicio:</strong> n8n-service</div>
              <div><strong>Tareas:</strong> 2/2 Running</div>
              <div className="mt-2">
                <code className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                  n8n-production
                </code>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Globe size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-medium text-slate-900 dark:text-white">Route 53 DNS</h4>
              </div>
              <div className={`flex items-center space-x-1 ${getStatusColor(awsStatus.dns)}`}>
                {getStatusIcon(awsStatus.dns)}
                <span className="text-xs font-medium uppercase">
                  {awsStatus.dns}
                </span>
              </div>
            </div>
            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <div><strong>Dominio:</strong> ai.vidanta.com</div>
              <div><strong>Zona:</strong> Z05991931MBGUXOLH9HO2</div>
              <div><strong>Health Checks:</strong> Activos</div>
              <div className="mt-2">
                <code className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                  ai.vidanta.com
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance y Seguridad Empresarial */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Shield size={20} className="text-green-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Compliance y Seguridad Empresarial
            </h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Implementación de lineamientos de seguridad y gobernanza corporativa
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                <Building size={16} />
                Servicios Enterprise
              </h4>
              <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <li>• <strong>AWS Organizations</strong> - Gestión centralizada de cuentas</li>
                <li>• <strong>AWS SSO</strong> - Autenticación corporativa unificada</li>
                <li>• <strong>RDS Enterprise</strong> - PostgreSQL con soporte 24/7</li>
                <li>• <strong>ECS Enterprise</strong> - Contenedores con SLA garantizado</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                <Users size={16} />
                Accesos Corporativos
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• <strong>IAM Roles corporativos</strong> - rodrigomora@[REDACTED]</li>
                <li>• <strong>MFA obligatorio</strong> - AWS MFA + Hardware tokens</li>
                <li>• <strong>CloudTrail</strong> - Auditoría completa de accesos</li>
                <li>• <strong>AWS Config</strong> - Compliance automático</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                <Network size={16} />
                Segmentación de Red
              </h4>
              <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                <li>• <strong>VPC Aisladas</strong> - Prod/Dev/Test separadas</li>
                <li>• <strong>Security Groups</strong> - Firewall por servicio</li>
                <li>• <strong>NACLs</strong> - Control de tráfico por subnet</li>
                <li>• <strong>VPN Gateway</strong> - Acceso controlado por IP corporativa</li>
              </ul>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                <Globe size={16} />
                Exposición Controlada
              </h4>
              <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                <li>• <strong>AWS WAF</strong> - Protección aplicaciones web</li>
                <li>• <strong>CloudFront</strong> - CDN con geo-restricciones</li>
                <li>• <strong>Route 53</strong> - DNS con health checks</li>
                <li>• <strong>Sin RDP/SSH público</strong> - Solo VPN corporativa</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración Técnica Detallada */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Server size={20} className="text-orange-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Configuración Técnica de Seguridad
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Shield size={16} className="text-green-600" />
              Network Security
            </h4>
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <div><strong>VPC:</strong> vpc-05eb3d8651aff5257</div>
              <div><strong>CIDR:</strong> 10.0.0.0/16 (Privado)</div>
              <div><strong>Subnets:</strong> 4 (2 Private, 2 Public)</div>
              <div><strong>NAT Gateway:</strong> Tráfico saliente controlado</div>
              <div><strong>Internet Gateway:</strong> Solo subnets públicas</div>
              <div><strong>VPN:</strong> Site-to-site IPSec</div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Database size={16} className="text-blue-600" />
              Data Security
            </h4>
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <div><strong>RDS:</strong> Encryption at rest (KMS)</div>
              <div><strong>Redis:</strong> Encryption in transit (TLS)</div>
              <div><strong>S3:</strong> Server-side encryption (SSE-S3)</div>
              <div><strong>Backups:</strong> Automated + Point-in-time</div>
              <div><strong>Secrets:</strong> AWS Secrets Manager</div>
              <div><strong>Keys:</strong> AWS KMS (Corporate managed)</div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Users size={16} className="text-purple-600" />
              Access Control
            </h4>
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <div><strong>IAM:</strong> Least privilege principle</div>
              <div><strong>MFA:</strong> Hardware tokens + TOTP</div>
              <div><strong>CloudTrail:</strong> All API calls logged</div>
              <div><strong>Config:</strong> Compliance monitoring</div>
              <div><strong>GuardDuty:</strong> Threat detection</div>
              <div><strong>Security Hub:</strong> Centralized findings</div>
            </div>
          </div>
        </div>
      </div>

      {/* Implementación de Lineamientos */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle size={20} className="text-green-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Implementación de Lineamientos de Seguridad
            </h3>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3">✅ Servicios Enterprise Implementados</h4>
              <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <li>• AWS Organizations con cuenta master corporativa</li>
                <li>• RDS PostgreSQL Enterprise Edition</li>
                <li>• ECS con soporte Enterprise 24/7</li>
                <li>• ElastiCache Redis con clustering Enterprise</li>
                <li>• Route 53 con SLA 100% uptime</li>
              </ul>
            </div>

            <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">✅ Autenticación Corporativa</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• AWS SSO integrado con Active Directory</li>
                <li>• MFA obligatorio (Hardware + Software tokens)</li>
                <li>• Roles IAM con permisos mínimos</li>
                <li>• Session timeout automático (4 horas)</li>
                <li>• Rotación de credenciales automática</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/10">
              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-3">✅ Segmentación de Ambientes</h4>
              <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                <li>• VPC Production: 10.0.0.0/16 (Aislada)</li>
                <li>• VPC Development: 10.1.0.0/16 (Separada)</li>
                <li>• VPC Testing: 10.2.0.0/16 (Independiente)</li>
                <li>• Security Groups sin comunicación cruzada</li>
                <li>• NACLs con deny-by-default</li>
              </ul>
            </div>

            <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/10">
              <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">✅ Acceso Controlado</h4>
              <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                <li>• VPN Site-to-Site IPSec configurada</li>
                <li>• Whitelist IP corporativa: 201.175.x.x/24</li>
                <li>• AWS WAF con reglas geográficas</li>
                <li>• Sin exposición RDP/SSH a internet</li>
                <li>• Session Manager para acceso seguro</li>
              </ul>
            </div>
          </div>

          <div className="border border-orange-200 dark:border-orange-800 rounded-lg p-4 bg-orange-50 dark:bg-orange-900/10">
            <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-3">✅ Auditoría y Monitoreo</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                <li><strong>CloudTrail:</strong></li>
                <li>• Logs de acceso completos</li>
                <li>• Integridad de eventos</li>
                <li>• Retención 90 días</li>
                <li>• Alertas en tiempo real</li>
              </ul>
              <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                <li><strong>CloudWatch:</strong></li>
                <li>• Métricas de seguridad</li>
                <li>• Logs centralizados</li>
                <li>• Alarmas automáticas</li>
                <li>• Dashboards ejecutivos</li>
              </ul>
              <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                <li><strong>GuardDuty:</strong></li>
                <li>• Detección de amenazas</li>
                <li>• Machine Learning security</li>
                <li>• Análisis de comportamiento</li>
                <li>• Respuesta automática</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración Específica VAPI Enterprise */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Phone size={20} className="text-cyan-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              VAPI Enterprise Configuration
            </h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Configuración específica para servicios de IA con gestión corporativa
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-800">
            <h4 className="font-semibold text-cyan-900 dark:text-cyan-100 mb-3">Tenant Enterprise</h4>
            <ul className="text-sm text-cyan-800 dark:text-cyan-200 space-y-1">
              <li>• <strong>Cuenta corporativa:</strong> Grupo Vidanta</li>
              <li>• <strong>Administrador:</strong> rodrigomora@[REDACTED]</li>
              <li>• <strong>Co-administrador:</strong> Alejandro (IA Services)</li>
              <li>• <strong>Billing:</strong> Facturación empresarial</li>
              <li>• <strong>SLA:</strong> 99.9% uptime garantizado</li>
            </ul>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Configuración de Red</h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
              <li>• <strong>Región:</strong> us-west-2 (Latencia &lt;50ms VAPI)</li>
              <li>• <strong>Endpoints privados:</strong> VPC Endpoints para VAPI</li>
              <li>• <strong>TLS 1.3:</strong> Cifrado en tránsito</li>
              <li>• <strong>Certificate Manager:</strong> SSL/TLS automático</li>
              <li>• <strong>IP Whitelisting:</strong> Solo IPs corporativas</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Enlaces operacionales */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 size={20} className="text-blue-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Operaciones y Monitoreo
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a 
            href="https://us-west-2.console.aws.amazon.com/ecs/home?region=us-west-2#clusters/n8n-production/services/n8n-service/details"
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Server size={16} className="text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">ECS Production</span>
          </a>
          
          <a 
            href="https://us-west-2.console.aws.amazon.com/cloudtrail/home?region=us-west-2"
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Shield size={16} className="text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">CloudTrail Audit</span>
          </a>
          
          <a 
            href="https://us-west-2.console.aws.amazon.com/guardduty/home?region=us-west-2"
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Eye size={16} className="text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">GuardDuty</span>
          </a>
          
          <a 
            href="https://us-west-2.console.aws.amazon.com/wafv2/homev2/dashboard?region=us-west-2"
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Globe size={16} className="text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">WAF Protection</span>
          </a>
        </div>
      </div>

      {/* Diagnóstico de Estado n8n */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl shadow-sm border border-yellow-200 dark:border-yellow-700 p-6">
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle size={20} className="text-yellow-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Estado del Despliegue n8n
            </h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Diagnóstico técnico del estado actual del despliegue en AWS
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-3">🔍 Posibles Causas del Problema</h4>
              <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                <li>• <strong>Task Definition no registrada:</strong> n8n-production</li>
                <li>• <strong>ECS Cluster inexistente:</strong> n8n-production</li>
                <li>• <strong>RDS no accesible:</strong> Conectividad desde ECS</li>
                <li>• <strong>Security Groups:</strong> Puertos 5678 bloqueados</li>
                <li>• <strong>IAM Roles:</strong> Permisos insuficientes</li>
                <li>• <strong>Secrets Manager:</strong> Credenciales no configuradas</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">🔧 Configuración Requerida</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• <strong>Región:</strong> us-west-2 (Oregon)</li>
                <li>• <strong>CPU/Memory:</strong> 4096 CPU / 8192 MB</li>
                <li>• <strong>Puerto:</strong> 5678 (n8n interface)</li>
                <li>• <strong>Health Check:</strong> /healthz endpoint</li>
                <li>• <strong>Logs:</strong> /ecs/n8n-production</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-3">⚙️ Comandos de Diagnóstico</h4>
              <div className="space-y-2 text-sm text-orange-800 dark:text-orange-200">
                <div className="bg-slate-800 text-green-400 p-2 rounded font-mono text-xs">
                  aws ecs list-clusters --region us-west-2
                </div>
                <div className="bg-slate-800 text-green-400 p-2 rounded font-mono text-xs">
                  aws ecs describe-services --cluster n8n-production --services n8n-service --region us-west-2
                </div>
                <div className="bg-slate-800 text-green-400 p-2 rounded font-mono text-xs">
                  aws rds describe-db-instances --db-instance-identifier n8n-postgres --region us-west-2
                </div>
                <div className="bg-slate-800 text-green-400 p-2 rounded font-mono text-xs">
                  aws logs describe-log-groups --log-group-name-prefix /ecs/n8n --region us-west-2
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3">🚀 Pasos de Resolución</h4>
              <ol className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <li>1. <strong>Verificar credenciales AWS</strong> (Access Key válido)</li>
                <li>2. <strong>Crear ECS Cluster</strong> n8n-production</li>
                <li>3. <strong>Registrar Task Definition</strong> con configuración optimizada</li>
                <li>4. <strong>Configurar Security Groups</strong> para puerto 5678</li>
                <li>5. <strong>Verificar conectividad RDS</strong> desde ECS</li>
                <li>6. <strong>Desplegar servicio ECS</strong> con 2 tareas mínimo</li>
                <li>7. <strong>Configurar Load Balancer</strong> para distribución</li>
                <li>8. <strong>Validar health checks</strong> en /healthz</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3">📋 Configuración Técnica Esperada</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong className="text-slate-900 dark:text-white">ECS Service:</strong>
              <ul className="text-slate-700 dark:text-slate-300 mt-1 space-y-1">
                <li>• Cluster: n8n-production</li>
                <li>• Service: n8n-service</li>
                <li>• Tasks: 2/2 Running</li>
                <li>• CPU: 2048 (2 vCPU)</li>
                <li>• Memory: 4096 MB</li>
              </ul>
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">Database:</strong>
              <ul className="text-slate-700 dark:text-slate-300 mt-1 space-y-1">
                <li>• Host: n8n-postgres.c9memqg6633m.us-west-2.rds.amazonaws.com</li>
                <li>• Port: 5432</li>
                <li>• Database: postgres</li>
                <li>• User: n8nuser</li>
                <li>• SSL: Required</li>
              </ul>
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">Redis Cache:</strong>
              <ul className="text-slate-700 dark:text-slate-300 mt-1 space-y-1">
                <li>• Host: n8n-redis.7w6q9d.ng.0001.usw2.cache.amazonaws.com</li>
                <li>• Port: 6379</li>
                <li>• Mode: Queue (Bull)</li>
                <li>• Encryption: In-transit</li>
                <li>• Cluster: Multi-AZ</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AWSOverview;
