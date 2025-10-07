import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Send, 
  Copy, 
  Download, 
  Upload, 
  Settings, 
  Code, 
  FileText,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Eye,
  Edit,
  Plus,
  Trash2,
  Globe,
  Wifi,
  Database,
  Server
} from 'lucide-react';
import { awsConsoleServiceBrowser as awsConsoleService } from '../../services/awsConsoleServiceBrowser';
import type { AWSResource, ServiceAction, ConsoleCommand } from '../../types/aws';

interface CommandInput {
  service: string;
  action: string;
  target: string;
  parameters: any;
}

interface ConfigurationPanelProps {
  resource: AWSResource;
  onUpdate: (config: any) => Promise<void>;
  detailedInfo: any;
}

interface LogViewerProps {
  resource: AWSResource;
  logType: 'deployment' | 'runtime';
}

const LogViewer: React.FC<LogViewerProps> = ({ resource, logType }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const resourceLogs = await awsConsoleService.getResourceLogs(resource, logType, 50);
      setLogs(resourceLogs);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [resource.identifier, logType, autoRefresh]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-black rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
        <div className="flex items-center space-x-2">
          <FileText size={16} className="text-blue-400" />
          <span className="text-sm font-medium text-white">
            {logType === 'deployment' ? 'Deployment Logs' : 'Runtime Logs'} - {resource.name}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-600"
            />
            <span className="text-xs text-gray-300">Auto</span>
          </label>
          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="text-gray-400 hover:text-white text-sm"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      <div 
        ref={logsRef}
        className="h-80 p-4 overflow-y-auto bg-black text-green-400 font-mono text-xs"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">
            {isLoading ? 'Loading logs...' : 'No logs available'}
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1">
              <span className="text-gray-500">
                [{log.timestamp.toLocaleTimeString()}]
              </span>
              <span className="text-green-300 ml-2">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const EnvironmentVariablesEditor: React.FC<{ resource: AWSResource; onSave: (envVars: any) => void }> = ({ resource, onSave }) => {
  const [envVars, setEnvVars] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    if (resource.type === 'ECS') {
      loadEnvironmentVariables();
    }
  }, [resource.identifier]);

  const loadEnvironmentVariables = async () => {
    setIsLoading(true);
    try {
      const vars = await awsConsoleService.getECSEnvironmentVariables(resource.identifier, resource.clusterName);
      setEnvVars(vars);
    } catch (error) {
      console.error('Error loading environment variables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addEnvironmentVariable = () => {
    if (newKey && newValue) {
      setEnvVars(prev => ({ ...prev, [newKey]: newValue }));
      setNewKey('');
      setNewValue('');
    }
  };

  const removeEnvironmentVariable = (key: string) => {
    setEnvVars(prev => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await awsConsoleService.updateECSEnvironmentVariables(resource.identifier, envVars, resource.clusterName);
      onSave(envVars);
    } catch (error) {
      console.error('Error saving environment variables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (resource.type !== 'ECS') {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Environment variables only available for ECS services
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 dark:text-white">Environment Variables</h3>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50"
        >
          <Save size={14} />
          <span>{isLoading ? 'Saving...' : 'Save'}</span>
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="flex items-center space-x-2">
            <input
              type="text"
              value={key}
              onChange={(e) => {
                const newKey = e.target.value;
                setEnvVars(prev => {
                  const { [key]: oldValue, ...rest } = prev;
                  return { ...rest, [newKey]: value };
                });
              }}
              className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Key"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => setEnvVars(prev => ({ ...prev, [key]: e.target.value }))}
              className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Value"
            />
            <button
              onClick={() => removeEnvironmentVariable(key)}
              className="p-1 text-red-600 hover:text-red-700"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="New key"
          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="New value"
          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <button
          onClick={addEnvironmentVariable}
          disabled={!newKey || !newValue}
          className="flex items-center space-x-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
        >
          <Plus size={14} />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
};

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ resource, onUpdate, detailedInfo }) => {
  const [config, setConfig] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('config');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(config);
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderConfigFields = () => {
    switch (resource.type) {
      case 'ECS':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Desired Count
              </label>
              <input
                type="number"
                value={config.desiredCount || resource.metadata?.desiredCount || 1}
                onChange={(e) => setConfig({...config, desiredCount: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="0"
                max="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CPU (vCPU)
              </label>
              <select
                value={config.cpu || '2048'}
                onChange={(e) => setConfig({...config, cpu: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="256">0.25 vCPU</option>
                <option value="512">0.5 vCPU</option>
                <option value="1024">1 vCPU</option>
                <option value="2048">2 vCPU</option>
                <option value="4096">4 vCPU</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Memory (MB)
              </label>
              <select
                value={config.memory || '4096'}
                onChange={(e) => setConfig({...config, memory: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="512">512 MB</option>
                <option value="1024">1 GB</option>
                <option value="2048">2 GB</option>
                <option value="4096">4 GB</option>
                <option value="8192">8 GB</option>
              </select>
            </div>
          </div>
        );
      
      case 'RDS':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Instance Class
              </label>
              <select
                value={config.instanceClass || resource.metadata?.instanceClass || 'db.t3.micro'}
                onChange={(e) => setConfig({...config, instanceClass: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="db.t3.micro">db.t3.micro</option>
                <option value="db.t3.small">db.t3.small</option>
                <option value="db.t3.medium">db.t3.medium</option>
                <option value="db.t3.large">db.t3.large</option>
                <option value="db.r6g.large">db.r6g.large</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Allocated Storage (GB)
              </label>
              <input
                type="number"
                value={config.storage || resource.metadata?.allocatedStorage || 100}
                onChange={(e) => setConfig({...config, storage: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="20"
                max="1000"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="multiaz"
                checked={config.multiAZ || resource.metadata?.multiAZ || false}
                onChange={(e) => setConfig({...config, multiAZ: e.target.checked})}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="multiaz" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Multi-AZ Deployment
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="applyimmediately"
                checked={config.applyImmediately || false}
                onChange={(e) => setConfig({...config, applyImmediately: e.target.checked})}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="applyimmediately" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Apply Immediately
              </label>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No configuration options available for this resource type.
          </div>
        );
    }
  };

  const tabs = [
    { id: 'config', label: 'Configuration', icon: Settings },
    { id: 'env', label: 'Environment', icon: Code },
    { id: 'details', label: 'Details', icon: Eye },
    { id: 'logs-runtime', label: 'Runtime Logs', icon: FileText },
    { id: 'logs-deploy', label: 'Deploy Logs', icon: Terminal }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 px-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'config' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Service Configuration</h3>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
            {renderConfigFields()}
          </div>
        )}

        {activeTab === 'env' && (
          <EnvironmentVariablesEditor 
            resource={resource} 
            onSave={(envVars) => console.log('Environment variables saved:', envVars)}
          />
        )}

        {activeTab === 'details' && detailedInfo && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Detailed Information</h3>
            
            {/* Network Information */}
            {(detailedInfo.tasks || detailedInfo.publicIpAddress || detailedInfo.endpoint) && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                  <Globe size={16} />
                  <span>Network Information</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {detailedInfo.tasks?.[0]?.publicIp && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Public IP:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{detailedInfo.tasks[0].publicIp}</span>
                    </div>
                  )}
                  {detailedInfo.tasks?.[0]?.privateIp && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Private IP:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{detailedInfo.tasks[0].privateIp}</span>
                    </div>
                  )}
                  {detailedInfo.publicIpAddress && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Public IP:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{detailedInfo.publicIpAddress}</span>
                    </div>
                  )}
                  {detailedInfo.privateIpAddress && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Private IP:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{detailedInfo.privateIpAddress}</span>
                    </div>
                  )}
                  {detailedInfo.endpoint && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Endpoint:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{detailedInfo.endpoint}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Service Details */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                <Server size={16} />
                <span>Service Details</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {Object.entries(detailedInfo).map(([key, value]) => {
                  if (typeof value === 'object' || key === 'tasks') return null;
                  return (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="font-mono text-gray-900 dark:text-white text-right">
                        {value?.toString() || 'N/A'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tasks Details (for ECS) */}
            {detailedInfo.tasks && detailedInfo.tasks.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Running Tasks</h4>
                <div className="space-y-3">
                  {detailedInfo.tasks.map((task: any, index: number) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>
                          <span className="text-gray-900 dark:text-white">{task.lastStatus}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Health:</span>
                          <span className="text-gray-900 dark:text-white">{task.healthStatus || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">CPU:</span>
                          <span className="text-gray-900 dark:text-white">{task.cpu}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                          <span className="text-gray-900 dark:text-white">{task.memory} MB</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs-runtime' && (
          <LogViewer resource={resource} logType="runtime" />
        )}

        {activeTab === 'logs-deploy' && (
          <LogViewer resource={resource} logType="deployment" />
        )}
      </div>
    </div>
  );
};

const TerminalInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const addOutput = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '[ERROR]' : type === 'success' ? '[SUCCESS]' : '[INFO]';
    setOutput(prev => [...prev, `${timestamp} ${prefix} ${text}`]);
  };

  const executeCommand = async () => {
    if (!input.trim()) return;
    
    setIsExecuting(true);
    addOutput(`> ${input}`, 'info');
    
    try {
      // Parse command
      const parts = input.trim().split(' ');
      const service = parts[0]?.toUpperCase();
      const action = parts[1]?.toLowerCase();
      const target = parts[2];
      
      if (!service || !action || !target) {
        addOutput('Usage: SERVICE ACTION TARGET [parameters]', 'error');
        addOutput('Example: ECS start n8n-service', 'info');
        setInput('');
        setIsExecuting(false);
        return;
      }

      let result;
      const actionObj: ServiceAction = { type: action as any };

      // Add parameters if provided
      if (parts.length > 3) {
        const params: any = {};
        for (let i = 3; i < parts.length; i += 2) {
          if (parts[i + 1]) {
            params[parts[i]] = isNaN(Number(parts[i + 1])) ? parts[i + 1] : Number(parts[i + 1]);
          }
        }
        actionObj.parameters = params;
      }

      switch (service) {
        case 'ECS':
          result = await awsConsoleService.executeECSAction(target, actionObj);
          break;
        case 'RDS':
          result = await awsConsoleService.executeRDSAction(target, actionObj);
          break;
        case 'ELASTICACHE':
          result = await awsConsoleService.executeElastiCacheAction(target, actionObj);
          break;
        case 'EC2':
          result = await awsConsoleService.executeEC2Action(target, actionObj);
          break;
        default:
          addOutput(`Unknown service: ${service}`, 'error');
          setInput('');
          setIsExecuting(false);
          return;
      }

      addOutput(`Command executed successfully`, 'success');
      if (result && typeof result === 'object') {
        addOutput(`Response: ${JSON.stringify(result, null, 2)}`, 'info');
      }
      
    } catch (error) {
      addOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setInput('');
      setIsExecuting(false);
    }
  };

  const clearTerminal = () => {
    setOutput([]);
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="bg-black rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
        <div className="flex items-center space-x-2">
          <Terminal size={16} className="text-green-400" />
          <span className="text-sm font-medium text-white">AWS CLI Terminal</span>
        </div>
        <button
          onClick={clearTerminal}
          className="text-gray-400 hover:text-white text-sm"
        >
          Clear
        </button>
      </div>
      
      <div 
        ref={terminalRef}
        className="h-60 p-4 overflow-y-auto bg-black text-green-400 font-mono text-sm"
      >
        {output.length === 0 ? (
          <div className="text-gray-500">
            AWS Console Terminal - Enter commands below
            <br />
            Examples:
            <br />
            • ECS start n8n-service
            <br />
            • RDS stop n8n-postgres
            <br />
            • ECS scale n8n-service count 3
          </div>
        ) : (
          output.map((line, index) => (
            <div key={index} className={
              line.includes('[ERROR]') ? 'text-red-400' :
              line.includes('[SUCCESS]') ? 'text-green-400' : 'text-green-300'
            }>
              {line}
            </div>
          ))
        )}
        {isExecuting && (
          <div className="text-yellow-400 animate-pulse">Executing command...</div>
        )}
      </div>
      
      <div className="bg-gray-900 p-3">
        <div className="flex items-center space-x-2">
          <span className="text-green-400 font-mono">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
            placeholder="Enter AWS command..."
            className="flex-1 bg-transparent text-green-400 font-mono text-sm outline-none"
            disabled={isExecuting}
          />
          <button
            onClick={executeCommand}
            disabled={isExecuting || !input.trim()}
            className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
          >
            <Send size={14} />
            <span>Run</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const AWSAdvancedConsole: React.FC = () => {
  const [selectedResource, setSelectedResource] = useState<AWSResource | null>(null);
  const [resources, setResources] = useState<AWSResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [commandHistory, setCommandHistory] = useState<ConsoleCommand[]>([]);
  const [detailedInfo, setDetailedInfo] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadResources = async () => {
    setIsLoading(true);
    try {
      const discovered = await awsConsoleService.discoverAllResources();
      const allResources = [
        ...discovered.ecs,
        ...discovered.rds,
        ...discovered.elasticache,
        ...discovered.ec2,
        ...(discovered.loadbalancers || [])
      ];
      setResources(allResources);
      
      const history = awsConsoleService.getCommandHistory();
      setCommandHistory(history);
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDetailedInfo = async (resource: AWSResource) => {
    setLoadingDetails(true);
    try {
      const info = await awsConsoleService.getResourceDetailedInfo(resource);
      setDetailedInfo(info);
    } catch (error) {
      console.error('Error loading detailed info:', error);
      setDetailedInfo(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleResourceSelect = (resource: AWSResource) => {
    setSelectedResource(resource);
    loadDetailedInfo(resource);
  };

  const handleConfigurationUpdate = async (config: any) => {
    if (!selectedResource) return;
    
    try {
      const action: ServiceAction = {
        type: 'modify',
        parameters: config
      };
      
      switch (selectedResource.type) {
        case 'ECS':
          await awsConsoleService.executeECSAction(selectedResource.identifier, action, selectedResource.clusterName);
          break;
        case 'RDS':
          await awsConsoleService.executeRDSAction(selectedResource.identifier, action);
          break;
      }
      
      // Refresh resources and detailed info
      loadResources();
      if (selectedResource) {
        loadDetailedInfo(selectedResource);
      }
    } catch (error) {
      console.error('Error updating configuration:', error);
    }
  };

  const exportConfiguration = () => {
    const config = {
      timestamp: new Date().toISOString(),
      resources: resources.map(r => ({
        type: r.type,
        identifier: r.identifier,
        name: r.name,
        status: r.status,
        metadata: r.metadata
      })),
      commandHistory: commandHistory.slice(0, 50) // Last 50 commands
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aws-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadResources();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Advanced AWS Console</h1>
          <p className="text-gray-600 dark:text-gray-400">Direct AWS SDK integration with real-time control</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportConfiguration}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            <Download size={16} />
            <span>Export Config</span>
          </button>
          <button
            onClick={loadResources}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            <RotateCcw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Resources List */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Resources</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {resources.length} resources discovered
              </p>
            </div>
            
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RotateCcw size={24} className="animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Loading resources...</span>
                </div>
              ) : resources.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No AWS resources found
                </div>
              ) : (
                <div className="space-y-3">
                  {resources.map(resource => (
                    <div
                      key={resource.identifier}
                      onClick={() => handleResourceSelect(resource)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedResource?.identifier === resource.identifier
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            resource.status === 'running' || resource.status === 'available' ? 'bg-green-500' :
                            resource.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{resource.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {resource.type} • {resource.identifier}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {resource.status}
                        </div>
                      </div>
                      
                      {resource.metadata && (
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                          {resource.type === 'ECS' && (
                            <span>Tasks: {resource.metadata.runningCount}/{resource.metadata.desiredCount}</span>
                          )}
                          {resource.type === 'RDS' && (
                            <span>{resource.metadata.engine} • {resource.metadata.instanceClass}</span>
                          )}
                          {resource.type === 'EC2' && (
                            <span>{resource.metadata.instanceType} • {resource.metadata.publicIp || 'No public IP'}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Terminal Interface */}
          <TerminalInterface />
        </div>

        {/* Configuration Panel */}
        <div className="space-y-4">
          {selectedResource ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Resource Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className="text-gray-900 dark:text-white">{selectedResource.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Identifier:</span>
                    <span className="text-gray-900 dark:text-white font-mono text-xs">{selectedResource.identifier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    <span className={`capitalize ${
                      selectedResource.status === 'running' || selectedResource.status === 'available' 
                        ? 'text-green-600' 
                        : selectedResource.status === 'pending' 
                        ? 'text-yellow-600' 
                        : 'text-red-600'
                    }`}>
                      {selectedResource.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Region:</span>
                    <span className="text-gray-900 dark:text-white">{selectedResource.region}</span>
                  </div>
                </div>
              </div>

              {loadingDetails ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <RotateCcw size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">Loading detailed information...</p>
                </div>
              ) : (
                <ConfigurationPanel 
                  resource={selectedResource}
                  onUpdate={handleConfigurationUpdate}
                  detailedInfo={detailedInfo}
                />
              )}

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleConfigurationUpdate({ action: 'start' })}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm"
                  >
                    <Zap size={14} />
                    <span>Start</span>
                  </button>
                  <button
                    onClick={() => handleConfigurationUpdate({ action: 'stop' })}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
                  >
                    <AlertCircle size={14} />
                    <span>Stop</span>
                  </button>
                  <button
                    onClick={() => handleConfigurationUpdate({ action: 'restart' })}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm"
                  >
                    <RotateCcw size={14} />
                    <span>Restart</span>
                  </button>
                  {selectedResource.type === 'RDS' && (
                    <button
                      onClick={() => handleConfigurationUpdate({ action: 'snapshot' })}
                      className="flex items-center justify-center space-x-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-sm"
                    >
                      <Copy size={14} />
                      <span>Snapshot</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Settings size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Resource</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a resource from the list to view details and configuration options
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AWSAdvancedConsole;
