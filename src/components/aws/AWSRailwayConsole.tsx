import React, { useState, useEffect } from 'react';
import { 
  X, Settings, Code, Eye, FileText, Terminal, 
  GitBranch, Database, Server, Globe, Shield,
  Network, Zap, HardDrive, ArrowRight, Play,
  Square, RotateCcw, Download, Upload, Plus,
  Trash2, CheckCircle, AlertCircle, Clock
} from 'lucide-react';
import { awsConsoleServiceProduction as awsConsoleService } from '../../services/awsConsoleServiceProduction';
import type { AWSResource } from '../../types/aws';

// Tipos para la agrupación de servicios
interface ServiceGroup {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  services: AWSResource[];
}

interface ServiceSliderProps {
  service: AWSResource | null;
  isOpen: boolean;
  onClose: () => void;
}

// Componente del slider lateral para configuración
const ServiceSlider: React.FC<ServiceSliderProps> = ({ service, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('deployments');
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  if (!service) return null;

  // Pestañas específicas según el tipo de servicio
  const getTabsForService = (serviceType: string) => {
    const commonTabs = [
      { id: 'deployments', label: 'Deployments', icon: Upload },
      { id: 'variables', label: 'Variables', icon: Code },
      { id: 'metrics', label: 'Metrics', icon: Eye },
      { id: 'settings', label: 'Settings', icon: Settings }
    ];

    switch (serviceType) {
      case 'ECS':
        return [
          ...commonTabs,
          { id: 'networking', label: 'Networking', icon: Network },
          { id: 'logs', label: 'Logs', icon: FileText }
        ];
      case 'RDS':
        return [
          { id: 'overview', label: 'Overview', icon: Database },
          { id: 'backups', label: 'Backups', icon: HardDrive },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'metrics', label: 'Metrics', icon: Eye },
          { id: 'settings', label: 'Settings', icon: Settings }
        ];
      case 'CloudFront':
        return [
          { id: 'distributions', label: 'Distributions', icon: Globe },
          { id: 'origins', label: 'Origins', icon: Server },
          { id: 'caching', label: 'Caching', icon: Zap },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'settings', label: 'Settings', icon: Settings }
        ];
      case 'S3':
        return [
          { id: 'buckets', label: 'Buckets', icon: HardDrive },
          { id: 'permissions', label: 'Permissions', icon: Shield },
          { id: 'hosting', label: 'Hosting', icon: Globe },
          { id: 'settings', label: 'Settings', icon: Settings }
        ];
      default:
        return commonTabs;
    }
  };

  const tabs = getTabsForService(service.type);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'deployments':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Deployments
              </h3>
              <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus size={16} />
                Deploy
              </button>
            </div>
            
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <CheckCircle className="text-green-500" size={20} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        Deploy #{i}
                      </span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        SUCCESS
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      main branch • 2 minutes ago
                    </p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Eye size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'variables':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Environment Variables
              </h3>
              <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus size={16} />
                Add Variable
              </button>
            </div>
            
            <div className="space-y-3">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{key}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">••••••••</div>
                  </div>
                  <button className="text-red-500 hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              {Object.keys(envVars).length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No environment variables configured
                </div>
              )}
            </div>
          </div>
        );
        
      case 'metrics':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Service Metrics
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">CPU Usage</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">45%</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Memory</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">2.1GB</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Requests</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">1.2K/min</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">99.9%</div>
              </div>
            </div>
          </div>
        );
        
      case 'settings':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Service Settings
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service Name
                </label>
                <input
                  type="text"
                  value={service.name}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  readOnly
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Region
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option>us-west-2</option>
                  <option>us-east-1</option>
                  <option>eu-west-1</option>
                </select>
              </div>

              {/* Git/CI-CD Configuration */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch className="text-blue-600 dark:text-blue-400" size={20} />
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    Git Integration & Auto-Deploy
                  </h4>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Repository
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="username/repository"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        defaultValue="rodrigo-vidanta/analisis_web"
                      />
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        Connect
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Branch
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                      <option>main</option>
                      <option>develop</option>
                      <option>staging</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        Auto-Deploy
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Deploy automatically when code is pushed
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="pt-2">
                    <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                      Setup CI/CD Pipeline
                    </button>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      This will create CodePipeline + CodeBuild for automatic deployments
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                  Danger Zone
                </h4>
                <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Delete Service
                </button>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Content for {activeTab} tab
          </div>
        );
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Slider */}
      <div className={`fixed right-0 top-0 h-full w-2/3 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                service.status === 'running' ? 'bg-green-500' : 
                service.status === 'stopped' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {service.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {service.type} • {service.status}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex overflow-x-auto px-6">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </>
  );
};

// Componente principal de la consola tipo Railway
const AWSRailwayConsole: React.FC = () => {
  const [resources, setResources] = useState<AWSResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<AWSResource | null>(null);
  const [sliderOpen, setSliderOpen] = useState(false);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      setLoading(true);
      const allResources = await awsConsoleService.discoverAllResources();
      setResources(allResources);
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar servicios por funcionalidad
  const groupServices = (): ServiceGroup[] => {
    const groups: ServiceGroup[] = [
      {
        id: 'compute',
        name: 'Compute Services',
        description: 'Application hosting and container services',
        icon: Server,
        color: 'blue',
        services: resources.filter(r => r.type === 'ECS')
      },
      {
        id: 'database',
        name: 'Database Services', 
        description: 'Managed database and caching services',
        icon: Database,
        color: 'green',
        services: resources.filter(r => ['RDS', 'ElastiCache'].includes(r.type))
      },
      {
        id: 'networking',
        name: 'Networking & CDN',
        description: 'Load balancers, CDN, and networking services',
        icon: Network,
        color: 'purple',
        services: resources.filter(r => ['ALB', 'CloudFront'].includes(r.type))
      },
      {
        id: 'storage',
        name: 'Storage Services',
        description: 'Object storage and file systems',
        icon: HardDrive,
        color: 'orange',
        services: resources.filter(r => r.type === 'S3')
      }
    ];

    return groups.filter(group => group.services.length > 0);
  };

  const handleServiceClick = (service: AWSResource) => {
    setSelectedService(service);
    setSliderOpen(true);
  };

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Infrastructure Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your AWS services in Railway-style interface
          </p>
        </div>
        <button
          onClick={loadResources}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RotateCcw size={16} />
          Refresh
        </button>
      </div>

      {/* Service Groups */}
      <div className="space-y-8">
        {groupServices().map(group => {
          const Icon = group.icon;
          return (
            <div key={group.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-${group.color}-100 dark:bg-${group.color}-900 rounded-lg`}>
                  <Icon className={`text-${group.color}-600 dark:text-${group.color}-400`} size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {group.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {group.description}
                  </p>
                </div>
              </div>

              {/* Services Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.services.map(service => (
                  <div
                    key={service.identifier}
                    onClick={() => handleServiceClick(service)}
                    className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:shadow-md transition-all hover:border-blue-300 dark:hover:border-blue-600"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getServiceStatusColor(service.status)}`} />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {service.name}
                        </span>
                      </div>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                        {service.type}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Status</span>
                        <span className={`font-medium ${
                          service.status === 'running' ? 'text-green-600 dark:text-green-400' :
                          service.status === 'stopped' ? 'text-red-600 dark:text-red-400' :
                          'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {service.status}
                        </span>
                      </div>
                      
                      {service.metadata?.region && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Region</span>
                          <span className="text-gray-900 dark:text-white">{service.metadata.region}</span>
                        </div>
                      )}
                      
                      {service.metadata?.lastDeployment && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Last Deploy</span>
                          <span className="text-gray-900 dark:text-white">
                            {new Date(service.metadata.lastDeployment).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Clock size={14} />
                          <span>Last week via Docker Image</span>
                        </div>
                        <ArrowRight size={16} className="text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Service Configuration Slider */}
      <ServiceSlider
        service={selectedService}
        isOpen={sliderOpen}
        onClose={() => setSliderOpen(false)}
      />
    </div>
  );
};

export default AWSRailwayConsole;
