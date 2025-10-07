import React, { useState, useEffect, useCallback } from 'react';
import { 
  Power, 
  RotateCcw, 
  Settings, 
  Activity, 
  Database, 
  Server, 
  Cloud, 
  HardDrive,
  Network,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  Square,
  Pause,
  RefreshCw,
  Terminal,
  TrendingUp,
  Shield
} from 'lucide-react';
import { awsConsoleServiceBrowser as awsConsoleService } from '../../services/awsConsoleServiceBrowser';
import type { AWSResource, ResourceMetrics, ServiceAction, ConsoleCommand } from '../../types/aws';

interface ResourceCardProps {
  resource: AWSResource;
  metrics: ResourceMetrics | null;
  onAction: (action: ServiceAction) => Promise<void>;
  isLoading: boolean;
  detailedInfo?: any;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, metrics, onAction, isLoading, detailedInfo }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'available':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'stopped':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ECS': return <Server size={20} />;
      case 'RDS': return <Database size={20} />;
      case 'ElastiCache': return <HardDrive size={20} />;
      case 'EC2': return <Cloud size={20} />;
      case 'S3': return <HardDrive size={20} />;
      case 'VPC': return <Network size={20} />;
      case 'ALB': return <Network size={20} />;
      case 'CloudFront': return <Cloud size={20} />;
      default: return <Server size={20} />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-gray-600 dark:text-gray-400">
            {getTypeIcon(resource.type)}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{resource.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{resource.type} • {resource.region}</p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(resource.status)}`}>
          {resource.status}
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">CPU</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{metrics.cpu?.toFixed(1)}%</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Memory</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{metrics.memory?.toFixed(1)}%</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Connections</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{metrics.connections}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Cost/Day</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">${metrics.cost?.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Network Information */}
      {detailedInfo && (detailedInfo.tasks?.[0] || detailedInfo.endpoint || detailedInfo.publicIpAddress) && (
        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">Network Info</div>
          <div className="grid grid-cols-1 gap-1 text-xs">
            {detailedInfo.tasks?.[0]?.publicIp && (
              <div className="flex justify-between">
                <span className="text-blue-600 dark:text-blue-400">Public IP:</span>
                <span className="font-mono text-blue-900 dark:text-blue-100">{detailedInfo.tasks[0].publicIp}</span>
              </div>
            )}
            {detailedInfo.tasks?.[0]?.privateIp && (
              <div className="flex justify-between">
                <span className="text-blue-600 dark:text-blue-400">Private IP:</span>
                <span className="font-mono text-blue-900 dark:text-blue-100">{detailedInfo.tasks[0].privateIp}</span>
              </div>
            )}
            {detailedInfo.publicIpAddress && (
              <div className="flex justify-between">
                <span className="text-blue-600 dark:text-blue-400">Public IP:</span>
                <span className="font-mono text-blue-900 dark:text-blue-100">{detailedInfo.publicIpAddress}</span>
              </div>
            )}
            {detailedInfo.privateIpAddress && (
              <div className="flex justify-between">
                <span className="text-blue-600 dark:text-blue-400">Private IP:</span>
                <span className="font-mono text-blue-900 dark:text-blue-100">{detailedInfo.privateIpAddress}</span>
              </div>
            )}
            {detailedInfo.endpoint && (
              <div className="flex justify-between">
                <span className="text-blue-600 dark:text-blue-400">Endpoint:</span>
                <a 
                  href={detailedInfo.endpoint}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-blue-900 dark:text-blue-100 hover:underline text-xs"
                >
                  Access Service
                </a>
              </div>
            )}
            {detailedInfo.loadBalancerDNS && (
              <div className="flex justify-between">
                <span className="text-blue-600 dark:text-blue-400">Load Balancer:</span>
                <a 
                  href={`http://${detailedInfo.loadBalancerDNS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-blue-900 dark:text-blue-100 hover:underline text-xs"
                >
                  {detailedInfo.loadBalancerDNS}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex space-x-2">
        {resource.status === 'running' || resource.status === 'available' ? (
          <button
            onClick={() => onAction({ type: 'stop' })}
            disabled={isLoading}
            className="flex items-center space-x-1 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm disabled:opacity-50"
          >
            <Square size={14} />
            <span>Stop</span>
          </button>
        ) : (
          <button
            onClick={() => onAction({ type: 'start' })}
            disabled={isLoading}
            className="flex items-center space-x-1 px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm disabled:opacity-50"
          >
            <Play size={14} />
            <span>Start</span>
          </button>
        )}
        
        <button
          onClick={() => onAction({ type: 'restart' })}
          disabled={isLoading}
          className="flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm disabled:opacity-50"
        >
          <RotateCcw size={14} />
          <span>Restart</span>
        </button>

        {(resource.type === 'ECS') && (
          <button
            onClick={() => onAction({ type: 'scale', parameters: { count: (resource.metadata?.desiredCount || 1) + 1 } })}
            disabled={isLoading}
            className="flex items-center space-x-1 px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-sm disabled:opacity-50"
          >
            <TrendingUp size={14} />
            <span>Scale</span>
          </button>
        )}
      </div>
    </div>
  );
};

const CommandHistoryPanel: React.FC<{ commands: ConsoleCommand[] }> = ({ commands }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} className="text-green-600" />;
      case 'failed': return <AlertTriangle size={16} className="text-red-600" />;
      case 'running': return <RefreshCw size={16} className="text-blue-600 animate-spin" />;
      default: return <Clock size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Terminal size={20} className="text-gray-600 dark:text-gray-400" />
        <h3 className="font-medium text-gray-900 dark:text-white">Command History</h3>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {commands.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No commands executed yet</p>
        ) : (
          commands.map((cmd, index) => (
            <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
              {getStatusIcon(cmd.status)}
              <div className="flex-1">
                <span className="font-medium text-gray-900 dark:text-white">
                  {cmd.service}.{cmd.action.type}
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">
                  {cmd.target}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {cmd.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AWSConsole: React.FC = () => {
  const [resources, setResources] = useState<{
    ecs: AWSResource[];
    rds: AWSResource[];
    elasticache: AWSResource[];
    ec2: AWSResource[];
    s3: AWSResource[];
    vpc: AWSResource[];
    loadbalancers: AWSResource[];
    cloudfront: AWSResource[];
  }>({
    ecs: [],
    rds: [],
    elasticache: [],
    ec2: [],
    s3: [],
    vpc: [],
    loadbalancers: [],
    cloudfront: []
  });
  
  const [metrics, setMetrics] = useState<Map<string, ResourceMetrics>>(new Map());
  const [detailedInfoMap, setDetailedInfoMap] = useState<Map<string, any>>(new Map());
  const [commands, setCommands] = useState<ConsoleCommand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  const loadResources = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Loading AWS resources...');
      const discoveredResources = await awsConsoleService.discoverAllResources();
      setResources(discoveredResources);
      
      // Load metrics and detailed info for all resources
      const allResources = [
        ...discoveredResources.ecs,
        ...discoveredResources.rds,
        ...discoveredResources.elasticache,
        ...discoveredResources.ec2,
        ...discoveredResources.loadbalancers,
        ...discoveredResources.cloudfront,
        ...discoveredResources.s3
      ];

      const newMetrics = new Map<string, ResourceMetrics>();
      const newDetailedInfo = new Map<string, any>();
      
      for (const resource of allResources) {
        try {
          // Load metrics
          const resourceMetrics = await awsConsoleService.getResourceMetrics(resource);
          newMetrics.set(resource.identifier, resourceMetrics);
          
          // Load detailed info
          const detailedInfo = await awsConsoleService.getResourceDetailedInfo(resource);
          if (detailedInfo) {
            newDetailedInfo.set(resource.identifier, detailedInfo);
          }
        } catch (error) {
          console.warn(`Error loading data for ${resource.identifier}:`, error);
        }
      }
      
      setMetrics(newMetrics);
      setDetailedInfoMap(newDetailedInfo);
      setLastRefresh(new Date());
      
      // Load system health
      const health = await awsConsoleService.getSystemHealth();
      setSystemHealth(health);
      
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshCommands = useCallback(() => {
    const history = awsConsoleService.getCommandHistory();
    setCommands(history.slice(0, 20)); // Show only top 20 most recent
  }, []);

  const handleResourceAction = async (resource: AWSResource, action: ServiceAction) => {
    setIsLoading(true);
    try {
      console.log(`Executing ${action.type} on ${resource.type} ${resource.identifier}`);
      
      switch (resource.type) {
        case 'ECS':
          await awsConsoleService.executeECSAction(resource.identifier, action, resource.clusterName);
          break;
        case 'RDS':
          await awsConsoleService.executeRDSAction(resource.identifier, action);
          break;
        case 'ElastiCache':
          await awsConsoleService.executeElastiCacheAction(resource.identifier, action);
          break;
        case 'CloudFront':
          await awsConsoleService.executeCloudFrontAction(resource.identifier, action);
          break;
        case 'S3':
          await awsConsoleService.executeS3Action(resource.identifier, action);
          break;
        case 'ALB':
          console.log(`ALB action ${action.type} on ${resource.identifier} - logged`);
          break;
        case 'EC2':
          console.log(`EC2 action ${action.type} on ${resource.identifier} - not implemented yet`);
          break;
      }
      
      // Refresh data after action
      setTimeout(() => {
        loadResources();
        refreshCommands();
      }, 2000);
      
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
    refreshCommands();
    
    // Auto-refresh every 10 seconds for faster service detection
    const interval = setInterval(() => {
      loadResources();
      refreshCommands();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [loadResources, refreshCommands]);

  const allResources = [
    ...resources.ecs,
    ...resources.rds,
    ...resources.elasticache,
    ...resources.ec2,
    ...resources.loadbalancers,
    ...resources.cloudfront,
    ...resources.s3
  ];

  const runningCount = allResources.filter(r => r.status === 'running' || r.status === 'available').length;
  const totalCount = allResources.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AWS Console</h1>
          <p className="text-gray-600 dark:text-gray-400">Real-time AWS resource management</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {lastRefresh && `Last updated: ${lastRefresh.toLocaleTimeString()}`}
          </div>
          <button
            onClick={loadResources}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2">
              <Shield size={20} className={
                systemHealth.overall === 'healthy' ? 'text-green-600' :
                systemHealth.overall === 'degraded' ? 'text-yellow-600' : 'text-red-600'
              } />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">System Health</div>
                <div className="font-medium text-gray-900 dark:text-white capitalize">
                  {systemHealth.overall}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2">
              <Activity size={20} className="text-blue-600" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Services</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {runningCount}/{totalCount} Running
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={20} className="text-orange-600" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Alerts</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {systemHealth.alerts?.length || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2">
              <DollarSign size={20} className="text-green-600" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Est. Daily Cost</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  ${Object.values(systemHealth.services || {}).reduce((sum: number, service: any) => sum + (service.cost || 0), 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resource Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* ECS Services */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <Server size={20} />
            <span>ECS Services</span>
          </h2>
          {resources.ecs.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400">
              No ECS services found
            </div>
          ) : (
            resources.ecs.map(resource => (
              <ResourceCard
                key={resource.identifier}
                resource={resource}
                metrics={metrics.get(resource.identifier) || null}
                onAction={(action) => handleResourceAction(resource, action)}
                isLoading={isLoading}
                detailedInfo={detailedInfoMap.get(resource.identifier)}
              />
            ))
          )}
        </div>

        {/* RDS Instances */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <Database size={20} />
            <span>RDS Instances</span>
          </h2>
          {resources.rds.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400">
              No RDS instances found
            </div>
          ) : (
            resources.rds.map(resource => (
              <ResourceCard
                key={resource.identifier}
                resource={resource}
                metrics={metrics.get(resource.identifier) || null}
                onAction={(action) => handleResourceAction(resource, action)}
                isLoading={isLoading}
                detailedInfo={detailedInfoMap.get(resource.identifier)}
              />
            ))
          )}
        </div>

        {/* ElastiCache */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <HardDrive size={20} />
            <span>ElastiCache</span>
          </h2>
          {resources.elasticache.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400">
              No ElastiCache clusters found
            </div>
          ) : (
            resources.elasticache.map(resource => (
              <ResourceCard
                key={resource.identifier}
                resource={resource}
                metrics={metrics.get(resource.identifier) || null}
                onAction={(action) => handleResourceAction(resource, action)}
                isLoading={isLoading}
                detailedInfo={detailedInfoMap.get(resource.identifier)}
              />
            ))
          )}
        </div>

        {/* Load Balancers */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <Network size={20} />
            <span>Load Balancers</span>
          </h2>
          {resources.loadbalancers.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400">
              No Load Balancers found
            </div>
          ) : (
            resources.loadbalancers.map(resource => (
              <ResourceCard
                key={resource.identifier}
                resource={resource}
                metrics={metrics.get(resource.identifier) || null}
                onAction={(action) => handleResourceAction(resource, action)}
                isLoading={isLoading}
                detailedInfo={detailedInfoMap.get(resource.identifier)}
              />
            ))
          )}
        </div>

        {/* CloudFront */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <Cloud size={20} />
            <span>CloudFront</span>
          </h2>
          {resources.cloudfront.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400">
              No CloudFront distributions found
            </div>
          ) : (
            resources.cloudfront.map(resource => (
              <ResourceCard
                key={resource.identifier}
                resource={resource}
                metrics={metrics.get(resource.identifier) || null}
                onAction={(action) => handleResourceAction(resource, action)}
                isLoading={isLoading}
                detailedInfo={detailedInfoMap.get(resource.identifier)}
              />
            ))
          )}
        </div>

        {/* S3 Buckets */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <HardDrive size={20} />
            <span>S3 Buckets</span>
          </h2>
          {resources.s3.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400">
              No S3 buckets found
            </div>
          ) : (
            resources.s3.map(resource => (
              <ResourceCard
                key={resource.identifier}
                resource={resource}
                metrics={metrics.get(resource.identifier) || null}
                onAction={(action) => handleResourceAction(resource, action)}
                isLoading={isLoading}
                detailedInfo={detailedInfoMap.get(resource.identifier)}
              />
            ))
          )}
        </div>
      </div>

      {/* EC2 and Other Resources */}
      {(resources.ec2.length > 0 || resources.s3.length > 0 || resources.vpc.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* EC2 Instances */}
          {resources.ec2.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Cloud size={20} />
                <span>EC2 Instances</span>
              </h2>
              {resources.ec2.map(resource => (
                <ResourceCard
                  key={resource.identifier}
                  resource={resource}
                  metrics={metrics.get(resource.identifier) || null}
                  onAction={(action) => handleResourceAction(resource, action)}
                  isLoading={isLoading}
                  detailedInfo={detailedInfoMap.get(resource.identifier)}
                />
              ))}
            </div>
          )}

          {/* S3 Buckets */}
          {resources.s3.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <HardDrive size={20} />
                <span>S3 Buckets</span>
              </h2>
              {resources.s3.map(resource => (
                <div key={resource.identifier} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center space-x-3">
                    <HardDrive size={20} className="text-gray-600 dark:text-gray-400" />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{resource.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{resource.region}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VPC */}
          {resources.vpc.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Network size={20} />
                <span>VPC Networks</span>
              </h2>
              {resources.vpc.map(resource => (
                <div key={resource.identifier} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center space-x-3">
                    <Network size={20} className="text-gray-600 dark:text-gray-400" />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{resource.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {resource.metadata?.cidrBlock} • {resource.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Command History */}
      <CommandHistoryPanel commands={commands} />

      {/* System Alerts and Recommendations */}
      {systemHealth && (systemHealth.alerts?.length > 0 || systemHealth.recommendations?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alerts */}
          {systemHealth.alerts?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700 p-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle size={20} className="text-red-600" />
                <h3 className="font-medium text-gray-900 dark:text-white">Active Alerts</h3>
              </div>
              <div className="space-y-2">
                {systemHealth.alerts.map((alert: string, index: number) => (
                  <div key={index} className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded p-2">
                    {alert}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {systemHealth.recommendations?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 p-4">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp size={20} className="text-blue-600" />
                <h3 className="font-medium text-gray-900 dark:text-white">Recommendations</h3>
              </div>
              <div className="space-y-2">
                {systemHealth.recommendations.map((rec: string, index: number) => (
                  <div key={index} className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                    {rec}
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

export default AWSConsole;