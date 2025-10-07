import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Database,
  Server,
  Network
} from 'lucide-react';

interface MigrationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  estimatedTime?: string;
  dependencies?: string[];
}

const AWSMigrationController: React.FC = () => {
  const [migrationSteps] = useState<MigrationStep[]>([
    {
      id: 'vpc-setup',
      name: 'VPC Configuration',
      description: 'Configure VPC with subnets and security groups',
      status: 'completed',
      progress: 100,
      estimatedTime: '5 minutes'
    },
    {
      id: 'rds-setup',
      name: 'RDS PostgreSQL',
      description: 'Deploy and configure PostgreSQL database',
      status: 'completed',
      progress: 100,
      estimatedTime: '15 minutes'
    },
    {
      id: 'ecs-cluster',
      name: 'ECS Cluster',
      description: 'Create ECS Fargate cluster for n8n',
      status: 'completed',
      progress: 100,
      estimatedTime: '10 minutes'
    },
    {
      id: 'n8n-deployment',
      name: 'n8n Deployment',
      description: 'Deploy n8n service with proper configuration',
      status: 'running',
      progress: 75,
      estimatedTime: '20 minutes'
    },
    {
      id: 'elasticache',
      name: 'ElastiCache Redis',
      description: 'Setup Redis cache for n8n queue management',
      status: 'pending',
      progress: 0,
      estimatedTime: '10 minutes',
      dependencies: ['n8n-deployment']
    },
    {
      id: 'load-balancer',
      name: 'Application Load Balancer',
      description: 'Configure ALB for high availability',
      status: 'pending',
      progress: 0,
      estimatedTime: '15 minutes',
      dependencies: ['n8n-deployment']
    },
    {
      id: 'domain-setup',
      name: 'Domain Configuration',
      description: 'Configure ai.vidanta.com with SSL certificates',
      status: 'pending',
      progress: 0,
      estimatedTime: '30 minutes',
      dependencies: ['load-balancer']
    },
    {
      id: 'monitoring',
      name: 'CloudWatch Monitoring',
      description: 'Setup monitoring, alerts and dashboards',
      status: 'pending',
      progress: 0,
      estimatedTime: '10 minutes',
      dependencies: ['domain-setup']
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'running':
        return <Clock size={20} className="text-blue-600 animate-pulse" />;
      case 'failed':
        return <AlertCircle size={20} className="text-red-600" />;
      default:
        return <Clock size={20} className="text-gray-400" />;
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600';
      case 'running': return 'bg-blue-600';
      case 'failed': return 'bg-red-600';
      default: return 'bg-gray-300';
    }
  };

  const completedSteps = migrationSteps.filter(step => step.status === 'completed').length;
  const totalSteps = migrationSteps.length;
  const overallProgress = (completedSteps / totalSteps) * 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Migration Controller</h1>
          <p className="text-gray-600 dark:text-gray-400">Railway to AWS migration progress</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {completedSteps}/{totalSteps} steps completed
          </div>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white ${
              isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
            <span>{isRunning ? 'Pause Migration' : 'Resume Migration'}</span>
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Overall Progress</h2>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {overallProgress.toFixed(0)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-600 to-green-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-gray-700 dark:text-gray-300">
              {completedSteps} Completed
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock size={16} className="text-blue-600" />
            <span className="text-gray-700 dark:text-gray-300">
              {migrationSteps.filter(s => s.status === 'running').length} In Progress
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertCircle size={16} className="text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">
              {migrationSteps.filter(s => s.status === 'pending').length} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Migration Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Migration Steps</h2>
        </div>
        
        <div className="p-4">
          <div className="space-y-4">
            {migrationSteps.map((step, index) => (
              <div key={step.id} className="relative">
                {/* Connection line to next step */}
                {index < migrationSteps.length - 1 && (
                  <div className="absolute left-10 top-12 w-0.5 h-8 bg-gray-300 dark:bg-gray-600" />
                )}
                
                <div className="flex items-start space-x-4">
                  {/* Status icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(step.status)}
                  </div>
                  
                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {step.name}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {step.estimatedTime}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {step.description}
                    </p>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(step.status)}`}
                        style={{ width: `${step.progress}%` }}
                      />
                    </div>
                    
                    {/* Dependencies */}
                    {step.dependencies && step.dependencies.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Depends on: {step.dependencies.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current Infrastructure Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Railway (Source) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-purple-500 rounded-full" />
            <h3 className="font-medium text-gray-900 dark:text-white">Railway (Source)</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">n8n Service</span>
              <span className="text-green-600">Active</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">PostgreSQL</span>
              <span className="text-green-600">Active</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Redis</span>
              <span className="text-green-600">Active</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Region</span>
              <span className="text-gray-900 dark:text-white">us-east4</span>
            </div>
          </div>
        </div>

        {/* Migration Flow */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-center">
          <div className="text-center">
            <ArrowRight size={32} className="mx-auto text-blue-600 mb-2" />
            <div className="text-sm text-gray-600 dark:text-gray-400">Migrating to</div>
            <div className="text-lg font-medium text-gray-900 dark:text-white">AWS</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">us-west-2</div>
          </div>
        </div>

        {/* AWS (Target) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-orange-500 rounded-full" />
            <h3 className="font-medium text-gray-900 dark:text-white">AWS (Target)</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">ECS Fargate</span>
              <span className="text-blue-600">Deploying</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">RDS PostgreSQL</span>
              <span className="text-green-600">Ready</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">ElastiCache</span>
              <span className="text-gray-400">Pending</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Region</span>
              <span className="text-gray-900 dark:text-white">us-west-2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Migration Benefits */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Migration Benefits</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">68%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cost Reduction</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">&lt;50ms</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">VAPI Latency</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">99.9%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Uptime SLA</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">Auto</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Scaling</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AWSMigrationController;