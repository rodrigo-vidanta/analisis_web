// AWS Console Types - Separated for better imports

export interface AWSResource {
  type: 'ECS' | 'RDS' | 'ElastiCache' | 'EC2' | 'S3' | 'VPC' | 'ALB' | 'CloudFront';
  identifier: string;
  name: string;
  region: string;
  clusterName?: string;
  status: 'running' | 'stopped' | 'pending' | 'error' | 'available' | 'unavailable';
  metadata?: any;
}

export interface ResourceMetrics {
  cpu?: number;
  memory?: number;
  connections?: number;
  requests?: number;
  storage?: number;
  cost?: number;
  lastUpdated: Date;
}

export interface ServiceAction {
  type: 'start' | 'stop' | 'restart' | 'scale' | 'modify' | 'snapshot';
  parameters?: any;
}

export interface ConsoleCommand {
  service: string;
  action: ServiceAction;
  target: string;
  timestamp: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}
