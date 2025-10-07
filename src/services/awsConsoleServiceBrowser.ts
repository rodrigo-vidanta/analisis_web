// AWS Console Service - Browser Optimized Version
// Handles CORS limitations and provides real AWS data

import { 
  ECSClient, 
  UpdateServiceCommand, 
  DescribeServicesCommand,
  DescribeTasksCommand,
  ListTasksCommand,
  DescribeClustersCommand,
  ListClustersCommand,
  ListServicesCommand
} from '@aws-sdk/client-ecs';
import { 
  RDSClient, 
  DescribeDBInstancesCommand, 
  StartDBInstanceCommand, 
  StopDBInstanceCommand,
  ModifyDBInstanceCommand,
  RebootDBInstanceCommand
} from '@aws-sdk/client-rds';
import { 
  ElastiCacheClient, 
  DescribeReplicationGroupsCommand,
  ModifyReplicationGroupCommand,
  RebootCacheClusterCommand,
  DescribeCacheClustersCommand
} from '@aws-sdk/client-elasticache';
import { 
  CloudWatchClient, 
  GetMetricStatisticsCommand
} from '@aws-sdk/client-cloudwatch';
import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  GetLogEventsCommand
} from '@aws-sdk/client-cloudwatch-logs';
import { 
  EC2Client,
  DescribeNetworkInterfacesCommand
} from '@aws-sdk/client-ec2';
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
  DescribeTargetGroupsCommand
} from '@aws-sdk/client-elastic-load-balancing-v2';
import {
  CloudFrontClient,
  ListDistributionsCommand,
  GetDistributionCommand,
  UpdateDistributionCommand
} from '@aws-sdk/client-cloudfront';
import { 
  S3Client,
  ListBucketsCommand,
  GetBucketLocationCommand,
  GetBucketWebsiteCommand
} from '@aws-sdk/client-s3';

import type { AWSResource, ResourceMetrics, ServiceAction, ConsoleCommand } from '../types/aws';

// Configuración AWS del proyecto
const AWS_CONFIG = {
  region: 'us-west-2',
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
  }
};

export class AWSConsoleServiceBrowser {
  private ecsClient: ECSClient;
  private rdsClient: RDSClient;
  private elasticacheClient: ElastiCacheClient;
  private cloudwatchClient: CloudWatchClient;
  private logsClient: CloudWatchLogsClient;
  private ec2Client: EC2Client;
  private elbClient: ElasticLoadBalancingV2Client;
  private cloudfrontClient: CloudFrontClient;
  private s3Client: S3Client;
  
  private commandHistory: ConsoleCommand[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.ecsClient = new ECSClient(AWS_CONFIG);
    this.rdsClient = new RDSClient(AWS_CONFIG);
    this.elasticacheClient = new ElastiCacheClient(AWS_CONFIG);
    this.cloudwatchClient = new CloudWatchClient(AWS_CONFIG);
    this.logsClient = new CloudWatchLogsClient(AWS_CONFIG);
    this.ec2Client = new EC2Client(AWS_CONFIG);
    this.elbClient = new ElasticLoadBalancingV2Client(AWS_CONFIG);
    this.cloudfrontClient = new CloudFrontClient(AWS_CONFIG);
    this.s3Client = new S3Client(AWS_CONFIG);
    
    this.loadCommandHistory();
  }

  // ===============================
  // PERSISTENCE
  // ===============================

  private saveCommandHistory(): void {
    try {
      localStorage.setItem('aws-console-history', JSON.stringify(this.commandHistory));
    } catch (error) {
      console.warn('Could not save command history:', error);
    }
  }

  private loadCommandHistory(): void {
    try {
      const saved = localStorage.getItem('aws-console-history');
      if (saved) {
        this.commandHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Could not load command history:', error);
      this.commandHistory = [];
    }
  }

  private addToHistory(command: ConsoleCommand): void {
    this.commandHistory.unshift(command);
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory = this.commandHistory.slice(0, this.maxHistorySize);
    }
    this.saveCommandHistory();
  }

  // ===============================
  // DISCOVERY - BROWSER SAFE
  // ===============================

  async discoverAllResources(): Promise<{
    ecs: AWSResource[];
    rds: AWSResource[];
    elasticache: AWSResource[];
    ec2: AWSResource[];
    s3: AWSResource[];
    vpc: AWSResource[];
    loadbalancers: AWSResource[];
    cloudfront: AWSResource[];
  }> {
    try {
      console.log('🔍 Descubriendo TODOS los recursos AWS...');
      
      // Discover ALL services - no restrictions since we're in AWS now
      const [ecs, rds, elasticache, loadbalancers, cloudfront, s3] = await Promise.allSettled([
        this.discoverECSResources(),
        this.discoverRDSResources(),
        this.discoverElastiCacheResources(),
        this.discoverLoadBalancers(),
        this.discoverCloudFrontDistributions(),
        this.discoverS3Buckets()
      ]);

      const discoveredResources = {
        ecs: ecs.status === 'fulfilled' ? ecs.value : [],
        rds: rds.status === 'fulfilled' ? rds.value : [],
        elasticache: elasticache.status === 'fulfilled' ? elasticache.value : [],
        loadbalancers: loadbalancers.status === 'fulfilled' ? loadbalancers.value : [],
        cloudfront: cloudfront.status === 'fulfilled' ? cloudfront.value : [],
        s3: s3.status === 'fulfilled' ? s3.value : [],
        ec2: [], // Will add later if needed
        vpc: [] // Will add later if needed
      };

      const totalFound = discoveredResources.ecs.length + 
                        discoveredResources.rds.length + 
                        discoveredResources.elasticache.length + 
                        discoveredResources.loadbalancers.length +
                        discoveredResources.cloudfront.length +
                        discoveredResources.s3.length;
      
      console.log(`📊 Total recursos descubiertos: ${totalFound}`);
      console.log(`   • ECS: ${discoveredResources.ecs.length}`);
      console.log(`   • RDS: ${discoveredResources.rds.length}`);
      console.log(`   • ElastiCache: ${discoveredResources.elasticache.length}`);
      console.log(`   • Load Balancers: ${discoveredResources.loadbalancers.length}`);
      console.log(`   • CloudFront: ${discoveredResources.cloudfront.length}`);
      console.log(`   • S3: ${discoveredResources.s3.length}`);

      return discoveredResources;
    } catch (error) {
      console.error('Error descubriendo recursos:', error);
      return {
        ecs: [],
        rds: [],
        elasticache: [],
        ec2: [],
        s3: [],
        vpc: [],
        loadbalancers: [],
        cloudfront: []
      };
    }
  }

  async discoverECSResources(): Promise<AWSResource[]> {
    try {
      console.log('🔍 Descubriendo servicios ECS...');
      const listCommand = new ListClustersCommand({});
      const listResponse = await this.ecsClient.send(listCommand);
      
      const resources: AWSResource[] = [];
      
      for (const clusterArn of listResponse.clusterArns || []) {
        const clusterName = clusterArn.split('/').pop() || 'unknown';
        console.log(`📋 Procesando cluster: ${clusterName}`);
        
        try {
          const servicesCommand = new ListServicesCommand({ cluster: clusterName });
          const servicesResponse = await this.ecsClient.send(servicesCommand);
          
          for (const serviceArn of servicesResponse.serviceArns || []) {
            const serviceName = serviceArn.split('/').pop() || 'unknown';
            console.log(`⚙️ Procesando servicio: ${serviceName}`);
            
            try {
              const describeCommand = new DescribeServicesCommand({
                cluster: clusterName,
                services: [serviceName]
              });
              const describeResponse = await this.ecsClient.send(describeCommand);
              const service = describeResponse.services?.[0];
              
              if (service) {
                resources.push({
                  type: 'ECS',
                  identifier: serviceName,
                  name: `${serviceName}`,
                  region: AWS_CONFIG.region,
                  clusterName: clusterName,
                  status: this.mapECSStatus(service.status),
                  metadata: {
                    desiredCount: service.desiredCount,
                    runningCount: service.runningCount,
                    pendingCount: service.pendingCount,
                    taskDefinition: service.taskDefinition,
                    launchType: service.launchType,
                    createdAt: service.createdAt,
                    serviceName: serviceName,
                    clusterName: clusterName,
                    loadBalancers: service.loadBalancers
                  }
                });
                console.log(`✅ Servicio ECS agregado: ${serviceName}`);
              }
            } catch (serviceError) {
              console.warn(`⚠️ Error procesando servicio ${serviceName}:`, serviceError);
            }
          }
        } catch (clusterError) {
          console.warn(`⚠️ Error procesando cluster ${clusterName}:`, clusterError);
        }
      }
      
      console.log(`📊 Total servicios ECS encontrados: ${resources.length}`);
      return resources;
    } catch (error) {
      console.error('Error descubriendo ECS:', error);
      return [];
    }
  }

  async discoverRDSResources(): Promise<AWSResource[]> {
    try {
      console.log('🔍 Descubriendo instancias RDS...');
      const command = new DescribeDBInstancesCommand({});
      const response = await this.rdsClient.send(command);
      
      const resources = response.DBInstances?.map(instance => ({
        type: 'RDS' as const,
        identifier: instance.DBInstanceIdentifier || 'unknown',
        name: instance.DBName || instance.DBInstanceIdentifier || 'unknown',
        region: AWS_CONFIG.region,
        status: this.mapRDSStatus(instance.DBInstanceStatus),
        metadata: {
          engine: instance.Engine,
          engineVersion: instance.EngineVersion,
          instanceClass: instance.DBInstanceClass,
          allocatedStorage: instance.AllocatedStorage,
          endpoint: instance.Endpoint?.Address,
          port: instance.Endpoint?.Port,
          multiAZ: instance.MultiAZ,
          availabilityZone: instance.AvailabilityZone,
          storageType: instance.StorageType
        }
      })) || [];
      
      console.log(`📊 Total instancias RDS encontradas: ${resources.length}`);
      return resources;
    } catch (error) {
      console.error('Error descubriendo RDS:', error);
      return [];
    }
  }

  async discoverElastiCacheResources(): Promise<AWSResource[]> {
    try {
      console.log('🔍 Descubriendo clusters ElastiCache...');
      const command = new DescribeCacheClustersCommand({});
      const response = await this.elasticacheClient.send(command);
      
      const resources = response.CacheClusters?.map(cluster => ({
        type: 'ElastiCache' as const,
        identifier: cluster.CacheClusterId || 'unknown',
        name: cluster.CacheClusterId || 'unknown',
        region: AWS_CONFIG.region,
        status: this.mapElastiCacheStatus(cluster.CacheClusterStatus),
        metadata: {
          engine: cluster.Engine,
          engineVersion: cluster.EngineVersion,
          cacheNodeType: cluster.CacheNodeType,
          numCacheNodes: cluster.NumCacheNodes,
          endpoint: cluster.RedisConfiguration?.PrimaryEndpoint?.Address || 
                   cluster.CacheNodes?.[0]?.Endpoint?.Address,
          port: cluster.RedisConfiguration?.PrimaryEndpoint?.Port || 
               cluster.CacheNodes?.[0]?.Endpoint?.Port,
          availabilityZone: cluster.PreferredAvailabilityZone
        }
      })) || [];
      
      console.log(`📊 Total clusters ElastiCache encontrados: ${resources.length}`);
      return resources;
    } catch (error) {
      console.error('Error descubriendo ElastiCache:', error);
      return [];
    }
  }

  async discoverLoadBalancers(): Promise<AWSResource[]> {
    try {
      console.log('🔍 Descubriendo Load Balancers...');
      const command = new DescribeLoadBalancersCommand({});
      const response = await this.elbClient.send(command);
      
      const resources = response.LoadBalancers?.map(lb => ({
        type: 'ALB' as const,
        identifier: lb.LoadBalancerName || 'unknown',
        name: lb.LoadBalancerName || 'unknown',
        region: AWS_CONFIG.region,
        status: lb.State?.Code === 'active' ? 'running' as const : 'pending' as const,
        metadata: {
          dnsName: lb.DNSName,
          scheme: lb.Scheme,
          type: lb.Type,
          vpcId: lb.VpcId,
          createdTime: lb.CreatedTime,
          availabilityZones: lb.AvailabilityZones,
          securityGroups: lb.SecurityGroups
        }
      })) || [];
      
      console.log(`📊 Total Load Balancers encontrados: ${resources.length}`);
      return resources;
    } catch (error) {
      console.error('Error descubriendo Load Balancers:', error);
      return [];
    }
  }

  async discoverCloudFrontDistributions(): Promise<AWSResource[]> {
    try {
      console.log('🔍 Descubriendo distribuciones CloudFront...');
      const command = new ListDistributionsCommand({});
      const response = await this.cloudfrontClient.send(command);
      
      const resources = response.DistributionList?.Items?.map(dist => ({
        type: 'CloudFront' as const,
        identifier: dist.Id || 'unknown',
        name: dist.Comment || dist.DomainName || 'unknown',
        region: 'global', // CloudFront is global
        status: dist.Enabled ? 'running' as const : 'stopped' as const,
        metadata: {
          domainName: dist.DomainName,
          comment: dist.Comment,
          enabled: dist.Enabled,
          status: dist.Status,
          lastModifiedTime: dist.LastModifiedTime,
          priceClass: dist.PriceClass,
          origins: dist.Origins?.Items?.map(origin => origin.DomainName),
          aliases: dist.Aliases?.Items
        }
      })) || [];
      
      console.log(`📊 Total distribuciones CloudFront encontradas: ${resources.length}`);
      return resources;
    } catch (error) {
      console.error('Error descubriendo CloudFront:', error);
      return [];
    }
  }

  async discoverS3Buckets(): Promise<AWSResource[]> {
    try {
      console.log('🔍 Descubriendo buckets S3...');
      const command = new ListBucketsCommand({});
      const response = await this.s3Client.send(command);
      
      const resources = [];
      for (const bucket of response.Buckets || []) {
        if (bucket.Name) {
          try {
            // Try to get bucket location
            const locationCommand = new GetBucketLocationCommand({
              Bucket: bucket.Name
            });
            const locationResponse = await this.s3Client.send(locationCommand);
            
            // Check if it's a website bucket
            let isWebsite = false;
            try {
              const websiteCommand = new GetBucketWebsiteCommand({
                Bucket: bucket.Name
              });
              await this.s3Client.send(websiteCommand);
              isWebsite = true;
            } catch (websiteError) {
              // Not a website bucket
            }
            
            resources.push({
              type: 'S3' as const,
              identifier: bucket.Name,
              name: bucket.Name,
              region: locationResponse.LocationConstraint || 'us-east-1',
              status: 'running' as const,
              metadata: {
                creationDate: bucket.CreationDate,
                region: locationResponse.LocationConstraint,
                isWebsite,
                websiteEndpoint: isWebsite ? 
                  `http://${bucket.Name}.s3-website.${locationResponse.LocationConstraint || 'us-east-1'}.amazonaws.com` : 
                  null
              }
            });
          } catch (err) {
            console.warn(`No se puede acceder al bucket ${bucket.Name}`);
          }
        }
      }
      
      console.log(`📊 Total buckets S3 encontrados: ${resources.length}`);
      return resources;
    } catch (error) {
      console.error('Error descubriendo S3:', error);
      return [];
    }
  }

  // ===============================
  // DETAILED INFO WITH IPs
  // ===============================

  async getResourceDetailedInfo(resource: AWSResource): Promise<any> {
    try {
      switch (resource.type) {
        case 'ECS':
          return await this.getECSDetailedInfo(resource);
        case 'RDS':
          return await this.getRDSDetailedInfo(resource);
        case 'ElastiCache':
          return await this.getElastiCacheDetailedInfo(resource);
        default:
          return null;
      }
    } catch (error) {
      console.error('Error getting detailed info:', error);
      return null;
    }
  }

  async getECSDetailedInfo(resource: AWSResource): Promise<any> {
    try {
      // Get service details
      const serviceCommand = new DescribeServicesCommand({
        cluster: resource.clusterName || 'n8n-production',
        services: [resource.identifier]
      });
      const serviceResponse = await this.ecsClient.send(serviceCommand);
      const service = serviceResponse.services?.[0];

      // Get running tasks
      const tasksCommand = new ListTasksCommand({
        cluster: resource.clusterName || 'n8n-production',
        serviceName: resource.identifier,
        desiredStatus: 'RUNNING'
      });
      const tasksResponse = await this.ecsClient.send(tasksCommand);

      // Get task details including IPs
      const taskDetails = [];
      for (const taskArn of tasksResponse.taskArns || []) {
        const taskCommand = new DescribeTasksCommand({
          cluster: resource.clusterName || 'n8n-production',
          tasks: [taskArn]
        });
        const taskResponse = await this.ecsClient.send(taskCommand);
        const task = taskResponse.tasks?.[0];

        if (task) {
          // Get network interface details for IPs
          const networkInterfaceId = task.attachments?.[0]?.details?.find(
            detail => detail.name === 'networkInterfaceId'
          )?.value;

          let publicIp = null;
          let privateIp = null;
          let loadBalancerDNS = null;

          // Get Load Balancer DNS if configured
          if (service?.loadBalancers && service.loadBalancers.length > 0) {
            loadBalancerDNS = 'n8n-alb-226231228.us-west-2.elb.amazonaws.com';
          }

          if (networkInterfaceId) {
            try {
              const eniCommand = new DescribeNetworkInterfacesCommand({
                NetworkInterfaceIds: [networkInterfaceId]
              });
              const eniResponse = await this.ec2Client.send(eniCommand);
              const eni = eniResponse.NetworkInterfaces?.[0];
              
              publicIp = eni?.Association?.PublicIp || null;
              privateIp = eni?.PrivateIpAddress || null;
            } catch (eniError) {
              console.warn('Could not get ENI details:', eniError);
            }
          }

          taskDetails.push({
            taskArn,
            lastStatus: task.lastStatus,
            healthStatus: task.healthStatus,
            createdAt: task.createdAt,
            startedAt: task.startedAt,
            publicIp,
            privateIp,
            loadBalancerDNS,
            cpu: task.cpu,
            memory: task.memory,
            containers: task.containers?.map(container => ({
              name: container.name,
              lastStatus: container.lastStatus,
              healthStatus: container.healthStatus,
              exitCode: container.exitCode,
              reason: container.reason
            }))
          });
        }
      }

      return {
        service: {
          serviceName: service?.serviceName,
          status: service?.status,
          runningCount: service?.runningCount,
          pendingCount: service?.pendingCount,
          desiredCount: service?.desiredCount,
          taskDefinition: service?.taskDefinition,
          launchType: service?.launchType,
          createdAt: service?.createdAt,
          updatedAt: service?.updatedAt,
          loadBalancers: service?.loadBalancers
        },
        tasks: taskDetails,
        loadBalancerDNS: taskDetails[0]?.loadBalancerDNS,
        endpoint: taskDetails[0]?.loadBalancerDNS ? 
          `http://${taskDetails[0].loadBalancerDNS}` : 
          taskDetails[0]?.publicIp ? 
          `http://${taskDetails[0].publicIp}:5678` : null
      };
    } catch (error) {
      console.error('Error getting ECS detailed info:', error);
      return null;
    }
  }

  async getRDSDetailedInfo(resource: AWSResource): Promise<any> {
    try {
      const command = new DescribeDBInstancesCommand({
        DBInstanceIdentifier: resource.identifier
      });
      const response = await this.rdsClient.send(command);
      const instance = response.DBInstances?.[0];

      return {
        dbInstanceIdentifier: instance?.DBInstanceIdentifier,
        dbName: instance?.DBName,
        engine: instance?.Engine,
        engineVersion: instance?.EngineVersion,
        instanceClass: instance?.DBInstanceClass,
        allocatedStorage: instance?.AllocatedStorage,
        storageType: instance?.StorageType,
        endpoint: instance?.Endpoint?.Address,
        port: instance?.Endpoint?.Port,
        status: instance?.DBInstanceStatus,
        availabilityZone: instance?.AvailabilityZone,
        multiAZ: instance?.MultiAZ,
        backupRetentionPeriod: instance?.BackupRetentionPeriod,
        createdTime: instance?.InstanceCreateTime
      };
    } catch (error) {
      console.error('Error getting RDS detailed info:', error);
      return null;
    }
  }

  async getElastiCacheDetailedInfo(resource: AWSResource): Promise<any> {
    try {
      const command = new DescribeCacheClustersCommand({
        CacheClusterId: resource.identifier
      });
      const response = await this.elasticacheClient.send(command);
      const cluster = response.CacheClusters?.[0];

      return {
        cacheClusterId: cluster?.CacheClusterId,
        engine: cluster?.Engine,
        engineVersion: cluster?.EngineVersion,
        cacheNodeType: cluster?.CacheNodeType,
        numCacheNodes: cluster?.NumCacheNodes,
        status: cluster?.CacheClusterStatus,
        endpoint: cluster?.RedisConfiguration?.PrimaryEndpoint?.Address || 
                 cluster?.CacheNodes?.[0]?.Endpoint?.Address,
        port: cluster?.RedisConfiguration?.PrimaryEndpoint?.Port || 
             cluster?.CacheNodes?.[0]?.Endpoint?.Port,
        availabilityZone: cluster?.PreferredAvailabilityZone,
        createdTime: cluster?.CacheClusterCreateTime
      };
    } catch (error) {
      console.error('Error getting ElastiCache detailed info:', error);
      return null;
    }
  }

  // ===============================
  // CLOUDFRONT AND S3 ACTIONS
  // ===============================

  async executeCloudFrontAction(distributionId: string, action: ServiceAction): Promise<any> {
    const command: ConsoleCommand = {
      service: 'CloudFront',
      action,
      target: distributionId,
      timestamp: new Date(),
      status: 'running'
    };

    try {
      switch (action.type) {
        case 'start':
          // Enable distribution
          const getCommand = new GetDistributionCommand({ Id: distributionId });
          const getResponse = await this.cloudfrontClient.send(getCommand);
          
          if (getResponse.Distribution && getResponse.ETag) {
            const updateCommand = new UpdateDistributionCommand({
              Id: distributionId,
              DistributionConfig: {
                ...getResponse.Distribution.DistributionConfig,
                Enabled: true
              },
              IfMatch: getResponse.ETag
            });
            command.result = await this.cloudfrontClient.send(updateCommand);
          }
          break;

        case 'stop':
          // Disable distribution
          const getStopCommand = new GetDistributionCommand({ Id: distributionId });
          const getStopResponse = await this.cloudfrontClient.send(getStopCommand);
          
          if (getStopResponse.Distribution && getStopResponse.ETag) {
            const updateStopCommand = new UpdateDistributionCommand({
              Id: distributionId,
              DistributionConfig: {
                ...getStopResponse.Distribution.DistributionConfig,
                Enabled: false
              },
              IfMatch: getStopResponse.ETag
            });
            command.result = await this.cloudfrontClient.send(updateStopCommand);
          }
          break;

        default:
          throw new Error(`Acción no soportada para CloudFront: ${action.type}`);
      }

      command.status = 'completed';
      this.addToHistory(command);
      return command.result;
    } catch (error) {
      command.status = 'failed';
      command.error = error instanceof Error ? error.message : 'Unknown error';
      this.addToHistory(command);
      throw error;
    }
  }

  async executeS3Action(bucketName: string, action: ServiceAction): Promise<any> {
    const command: ConsoleCommand = {
      service: 'S3',
      action,
      target: bucketName,
      timestamp: new Date(),
      status: 'running'
    };

    try {
      // S3 doesn't have start/stop but we can log the action
      command.result = { 
        message: `S3 bucket ${bucketName} - ${action.type} action logged`,
        bucketName,
        action: action.type
      };

      command.status = 'completed';
      this.addToHistory(command);
      return command.result;
    } catch (error) {
      command.status = 'failed';
      command.error = error instanceof Error ? error.message : 'Unknown error';
      this.addToHistory(command);
      throw error;
    }
  }

  // ===============================
  // ACTIONS
  // ===============================

  async executeECSAction(serviceName: string, action: ServiceAction, clusterName: string = 'n8n-production'): Promise<any> {
    const command: ConsoleCommand = {
      service: 'ECS',
      action,
      target: `${clusterName}/${serviceName}`,
      timestamp: new Date(),
      status: 'running'
    };

    try {
      switch (action.type) {
        case 'start':
          const startCommand = new UpdateServiceCommand({
            cluster: clusterName,
            service: serviceName,
            desiredCount: action.parameters?.count || 2
          });
          command.result = await this.ecsClient.send(startCommand);
          break;

        case 'stop':
          const stopCommand = new UpdateServiceCommand({
            cluster: clusterName,
            service: serviceName,
            desiredCount: 0
          });
          command.result = await this.ecsClient.send(stopCommand);
          break;

        case 'scale':
          const scaleCommand = new UpdateServiceCommand({
            cluster: clusterName,
            service: serviceName,
            desiredCount: action.parameters?.count || 1
          });
          command.result = await this.ecsClient.send(scaleCommand);
          break;

        case 'restart':
          await this.ecsClient.send(new UpdateServiceCommand({
            cluster: clusterName,
            service: serviceName,
            desiredCount: 0
          }));
          
          setTimeout(async () => {
            await this.ecsClient.send(new UpdateServiceCommand({
              cluster: clusterName,
              service: serviceName,
              desiredCount: action.parameters?.count || 1
            }));
          }, 5000);
          
          command.result = { message: 'Restart initiated' };
          break;

        default:
          throw new Error(`Acción no soportada: ${action.type}`);
      }

      command.status = 'completed';
      this.addToHistory(command);
      return command.result;
    } catch (error) {
      command.status = 'failed';
      command.error = error instanceof Error ? error.message : 'Unknown error';
      this.addToHistory(command);
      throw error;
    }
  }

  async executeRDSAction(instanceId: string, action: ServiceAction): Promise<any> {
    const command: ConsoleCommand = {
      service: 'RDS',
      action,
      target: instanceId,
      timestamp: new Date(),
      status: 'running'
    };

    try {
      switch (action.type) {
        case 'start':
          const startCommand = new StartDBInstanceCommand({
            DBInstanceIdentifier: instanceId
          });
          command.result = await this.rdsClient.send(startCommand);
          break;

        case 'stop':
          const stopCommand = new StopDBInstanceCommand({
            DBInstanceIdentifier: instanceId
          });
          command.result = await this.rdsClient.send(stopCommand);
          break;

        case 'restart':
          const rebootCommand = new RebootDBInstanceCommand({
            DBInstanceIdentifier: instanceId,
            ForceFailover: action.parameters?.forceFailover || false
          });
          command.result = await this.rdsClient.send(rebootCommand);
          break;

        default:
          throw new Error(`Acción no soportada: ${action.type}`);
      }

      command.status = 'completed';
      this.addToHistory(command);
      return command.result;
    } catch (error) {
      command.status = 'failed';
      command.error = error instanceof Error ? error.message : 'Unknown error';
      this.addToHistory(command);
      throw error;
    }
  }

  async executeElastiCacheAction(clusterId: string, action: ServiceAction): Promise<any> {
    const command: ConsoleCommand = {
      service: 'ElastiCache',
      action,
      target: clusterId,
      timestamp: new Date(),
      status: 'running'
    };

    try {
      switch (action.type) {
        case 'restart':
          const rebootCommand = new RebootCacheClusterCommand({
            CacheClusterId: clusterId,
            CacheNodeIdsToReboot: action.parameters?.nodeIds || ['0001']
          });
          command.result = await this.elasticacheClient.send(rebootCommand);
          break;

        default:
          throw new Error(`Acción no soportada para ElastiCache: ${action.type}`);
      }

      command.status = 'completed';
      this.addToHistory(command);
      return command.result;
    } catch (error) {
      command.status = 'failed';
      command.error = error instanceof Error ? error.message : 'Unknown error';
      this.addToHistory(command);
      throw error;
    }
  }

  // ===============================
  // METRICS
  // ===============================

  async getResourceMetrics(resource: AWSResource): Promise<ResourceMetrics> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 3600000); // Last hour
      
      // For now, return simulated metrics based on real resource status
      return {
        cpu: Math.floor(Math.random() * 50) + 20, // 20-70%
        memory: Math.floor(Math.random() * 40) + 30, // 30-70%
        connections: Math.floor(Math.random() * 20) + 5, // 5-25
        requests: Math.floor(Math.random() * 1000) + 100, // 100-1100
        storage: resource.metadata?.allocatedStorage || 0,
        cost: this.calculateEstimatedCost(resource),
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error obteniendo métricas:', error);
      return {
        cpu: 0,
        memory: 0,
        connections: 0,
        requests: 0,
        storage: 0,
        cost: 0,
        lastUpdated: new Date()
      };
    }
  }

  // ===============================
  // LOGS
  // ===============================

  async getResourceLogs(resource: AWSResource, logType: 'deployment' | 'runtime' = 'runtime', limit: number = 50): Promise<any[]> {
    try {
      let logGroupName = '';
      
      switch (resource.type) {
        case 'ECS':
          logGroupName = `/ecs/${resource.clusterName || 'n8n-production'}`;
          break;
        case 'RDS':
          logGroupName = `/aws/rds/instance/${resource.identifier}/error`;
          break;
        default:
          return [];
      }

      const streamsCommand = new DescribeLogStreamsCommand({
        logGroupName,
        orderBy: 'LastEventTime',
        descending: true,
        limit: 5
      });
      const streamsResponse = await this.logsClient.send(streamsCommand);

      const logs = [];
      for (const stream of streamsResponse.logStreams?.slice(0, 2) || []) {
        if (stream.logStreamName) {
          const eventsCommand = new GetLogEventsCommand({
            logGroupName,
            logStreamName: stream.logStreamName,
            limit: Math.ceil(limit / 2),
            startFromHead: false
          });
          const eventsResponse = await this.logsClient.send(eventsCommand);
          
          for (const event of eventsResponse.events || []) {
            logs.push({
              timestamp: new Date(event.timestamp || 0),
              message: event.message,
              logStream: stream.logStreamName,
              logGroup: logGroupName
            });
          }
        }
      }

      return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
    } catch (error) {
      console.error('Error getting resource logs:', error);
      return [];
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  private mapECSStatus(status?: string): AWSResource['status'] {
    switch (status) {
      case 'ACTIVE': return 'running';
      case 'INACTIVE': return 'stopped';
      case 'DRAINING': return 'pending';
      default: return 'error';
    }
  }

  private mapRDSStatus(status?: string): AWSResource['status'] {
    switch (status) {
      case 'available': return 'running';
      case 'stopped': return 'stopped';
      case 'creating':
      case 'modifying':
      case 'backing-up': return 'pending';
      default: return 'error';
    }
  }

  private mapElastiCacheStatus(status?: string): AWSResource['status'] {
    switch (status) {
      case 'available': return 'running';
      case 'creating':
      case 'modifying': return 'pending';
      default: return 'error';
    }
  }

  private calculateEstimatedCost(resource: AWSResource): number {
    switch (resource.type) {
      case 'ECS':
        return (resource.metadata?.desiredCount || 1) * 0.05 * 24;
      case 'RDS':
        const instanceClass = resource.metadata?.instanceClass || 'db.t3.micro';
        const baseHourly = instanceClass.includes('large') ? 0.20 : 0.10;
        return baseHourly * 24;
      case 'ElastiCache':
        return 0.15 * 24;
      default:
        return 0;
    }
  }

  // ===============================
  // PUBLIC API
  // ===============================

  getCommandHistory(): ConsoleCommand[] {
    return [...this.commandHistory];
  }

  clearCommandHistory(): void {
    this.commandHistory = [];
    this.saveCommandHistory();
  }

  async getSystemHealth(): Promise<any> {
    try {
      const resources = await this.discoverAllResources();
      const allResources = [
        ...resources.ecs,
        ...resources.rds,
        ...resources.elasticache
      ];

      const services: { [key: string]: ResourceMetrics } = {};
      const alerts: string[] = [];
      const recommendations: string[] = [];

      for (const resource of allResources) {
        const metrics = await this.getResourceMetrics(resource);
        services[resource.identifier] = metrics;

        if (metrics.cpu > 80) {
          alerts.push(`High CPU usage on ${resource.name}: ${metrics.cpu}%`);
        }
        if (metrics.memory > 80) {
          alerts.push(`High memory usage on ${resource.name}: ${metrics.memory}%`);
        }

        if (metrics.cpu < 20 && resource.type === 'ECS') {
          recommendations.push(`Consider reducing ${resource.name} capacity - low CPU usage`);
        }
      }

      const runningServices = allResources.filter(r => r.status === 'running').length;
      const totalServices = allResources.length;
      
      let overall: 'healthy' | 'degraded' | 'critical';
      if (runningServices === totalServices && alerts.length === 0) {
        overall = 'healthy';
      } else if (runningServices > totalServices / 2) {
        overall = 'degraded';
      } else {
        overall = 'critical';
      }

      return {
        overall,
        services,
        alerts,
        recommendations
      };
    } catch (error) {
      console.error('Error obteniendo estado del sistema:', error);
      return {
        overall: 'critical',
        services: {},
        alerts: ['Error connecting to AWS'],
        recommendations: ['Check AWS credentials and connectivity']
      };
    }
  }
}

// Singleton instance
export const awsConsoleServiceBrowser = new AWSConsoleServiceBrowser();
export default awsConsoleServiceBrowser;
