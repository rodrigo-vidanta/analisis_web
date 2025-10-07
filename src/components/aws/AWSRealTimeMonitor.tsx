import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Network, 
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  Database,
  Server
} from 'lucide-react';
import { awsConsoleServiceProduction as awsConsoleService } from '../../services/awsConsoleServiceProduction';
import type { AWSResource, ResourceMetrics } from '../../types/aws';

interface MetricChartProps {
  data: number[];
  label: string;
  color: string;
  unit?: string;
}

const MetricChart: React.FC<MetricChartProps> = ({ data, label, color, unit = '%' }) => {
  const max = Math.max(...data, 100);
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - (value / max) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{label}</h3>
        <span className={`text-sm font-medium ${color}`}>
          {data[data.length - 1]?.toFixed(1)}{unit}
        </span>
      </div>
      
      <div className="h-16 relative">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            points={points}
            className={color}
          />
          <defs>
            <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" className={color} stopOpacity="0.3" />
              <stop offset="100%" className={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon
            fill={`url(#gradient-${label})`}
            points={`0,100 ${points} 100,100`}
          />
        </svg>
      </div>
    </div>
  );
};

interface LiveMetricsProps {
  resource: AWSResource;
}

const LiveMetrics: React.FC<LiveMetricsProps> = ({ resource }) => {
  const [metrics, setMetrics] = useState<ResourceMetrics | null>(null);
  const [metricHistory, setMetricHistory] = useState<{
    cpu: number[];
    memory: number[];
    connections: number[];
    timestamps: Date[];
  }>({
    cpu: [],
    memory: [],
    connections: [],
    timestamps: []
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const updateMetrics = async () => {
    setIsLoading(true);
    try {
      const newMetrics = await awsConsoleService.getResourceMetrics(resource);
      setMetrics(newMetrics);
      
      setMetricHistory(prev => {
        const maxPoints = 20; // Keep last 20 data points
        const newHistory = {
          cpu: [...prev.cpu, newMetrics.cpu || 0].slice(-maxPoints),
          memory: [...prev.memory, newMetrics.memory || 0].slice(-maxPoints),
          connections: [...prev.connections, newMetrics.connections || 0].slice(-maxPoints),
          timestamps: [...prev.timestamps, new Date()].slice(-maxPoints)
        };
        return newHistory;
      });
    } catch (error) {
      console.error('Error updating metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [resource.identifier]);

  if (!metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-300 dark:bg-gray-600 h-10 w-10"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Real-time metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricChart 
          data={metricHistory.cpu} 
          label="CPU Usage" 
          color="text-blue-600"
          unit="%"
        />
        <MetricChart 
          data={metricHistory.memory} 
          label="Memory Usage" 
          color="text-green-600"
          unit="%"
        />
        <MetricChart 
          data={metricHistory.connections} 
          label="Connections" 
          color="text-purple-600"
          unit=""
        />
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Est. Cost</h3>
            <span className="text-sm font-medium text-orange-600">
              ${metrics.cost?.toFixed(2)}/day
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <DollarSign size={16} className="text-orange-600" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ${(metrics.cost || 0 * 30).toFixed(2)}/month
            </span>
          </div>
        </div>
      </div>

      {/* Resource details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Resource Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Identifier:</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">{resource.identifier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Type:</span>
              <span className="text-sm text-gray-900 dark:text-white">{resource.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
              <span className={`text-sm font-medium ${
                resource.status === 'running' || resource.status === 'available' 
                  ? 'text-green-600' 
                  : resource.status === 'pending' 
                  ? 'text-yellow-600' 
                  : 'text-red-600'
              }`}>
                {resource.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Region:</span>
              <span className="text-sm text-gray-900 dark:text-white">{resource.region}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {resource.type === 'ECS' && resource.metadata && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Running Tasks:</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {resource.metadata.runningCount}/{resource.metadata.desiredCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Launch Type:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{resource.metadata.launchType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Cluster:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{resource.clusterName}</span>
                </div>
              </>
            )}
            
            {resource.type === 'RDS' && resource.metadata && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Engine:</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {resource.metadata.engine} {resource.metadata.engineVersion}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Instance Class:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{resource.metadata.instanceClass}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Storage:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{resource.metadata.allocatedStorage} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Multi-AZ:</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {resource.metadata.multiAZ ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AWSRealTimeMonitor: React.FC = () => {
  const [resources, setResources] = useState<AWSResource[]>([]);
  const [selectedResource, setSelectedResource] = useState<AWSResource | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadResources = async () => {
    setIsLoading(true);
    try {
      const discovered = await awsConsoleService.discoverAllResources();
      const allResources = [
        ...discovered.ecs,
        ...discovered.rds,
        ...discovered.elasticache,
        ...discovered.ec2
      ];
      setResources(allResources);
      
      if (!selectedResource && allResources.length > 0) {
        setSelectedResource(allResources[0]);
      }
      
      // Load system health
      const health = await awsConsoleService.getSystemHealth();
      setSystemMetrics(health);
      
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
    
    if (autoRefresh) {
      const interval = setInterval(loadResources, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'ECS': return <Server size={20} />;
      case 'RDS': return <Database size={20} />;
      case 'ElastiCache': return <HardDrive size={20} />;
      case 'EC2': return <Cpu size={20} />;
      default: return <Activity size={20} />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Real-Time Monitor</h1>
          <p className="text-gray-600 dark:text-gray-400">Live AWS infrastructure monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Auto Refresh</span>
          </label>
          <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        </div>
      </div>

      {/* System Overview */}
      {systemMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2">
              <Activity size={20} className={
                systemMetrics.overall === 'healthy' ? 'text-green-600' :
                systemMetrics.overall === 'degraded' ? 'text-yellow-600' : 'text-red-600'
              } />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">System Health</div>
                <div className="font-medium text-gray-900 dark:text-white capitalize">
                  {systemMetrics.overall}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2">
              <Server size={20} className="text-blue-600" />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Active Services</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {resources.filter(r => r.status === 'running' || r.status === 'available').length}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={20} className="text-orange-600" />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Alerts</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {systemMetrics.alerts?.length || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2">
              <DollarSign size={20} className="text-green-600" />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Daily Cost</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  ${Object.values(systemMetrics.services || {}).reduce((sum: number, service: any) => sum + (service.cost || 0), 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Resource Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-medium text-gray-900 dark:text-white">Resources</h2>
          </div>
          <div className="p-2">
            {resources.map(resource => (
              <button
                key={resource.identifier}
                onClick={() => setSelectedResource(resource)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  selectedResource?.identifier === resource.identifier
                    ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-gray-600 dark:text-gray-400">
                    {getResourceIcon(resource.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {resource.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {resource.type} • {resource.status}
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    resource.status === 'running' || resource.status === 'available' ? 'bg-green-500' :
                    resource.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Live Metrics */}
        <div className="xl:col-span-3">
          {selectedResource ? (
            <LiveMetrics resource={selectedResource} />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Activity size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Resource</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a resource to view real-time metrics and monitoring data
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Alerts and Recommendations */}
      {systemMetrics && (systemMetrics.alerts?.length > 0 || systemMetrics.recommendations?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {systemMetrics.alerts?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700 p-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle size={20} className="text-red-600" />
                <h3 className="font-medium text-gray-900 dark:text-white">Active Alerts</h3>
              </div>
              <div className="space-y-2">
                {systemMetrics.alerts.map((alert: string, index: number) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-red-700 dark:text-red-300">{alert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {systemMetrics.recommendations?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 p-4">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp size={20} className="text-blue-600" />
                <h3 className="font-medium text-gray-900 dark:text-white">Optimization</h3>
              </div>
              <div className="space-y-2">
                {systemMetrics.recommendations.map((rec: string, index: number) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <TrendingUp size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-blue-700 dark:text-blue-300">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AWSRealTimeMonitor;
