import { CloudFrontAllowedMethods, CloudFrontWebDistribution, OriginAccessIdentity, OriginProtocolPolicy, SecurityPolicyProtocol } from '@aws-cdk/aws-cloudfront';
import { BlockPublicAccess, Bucket, BucketAccessControl } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { Duration, RemovalPolicy } from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import { BucketDeployment } from '@aws-cdk/aws-s3-deployment';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import { LambdaProxyIntegration, LambdaWebSocketIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import { HttpApi, HttpMethod, WebSocketApi, WebSocketStage } from '@aws-cdk/aws-apigatewayv2';
import * as lambda from '@aws-cdk/aws-lambda';
import * as path from 'path';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

interface Props extends cdk.StackProps {
  environment: 'dev' | 'prod';
  trelloSecret: string;
}

export class InfrastructureStack extends cdk.Stack {
  constructor (scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    if (!props.env?.region) {
      throw new Error('No AWS region specified');
    }

    const table = new dynamodb.Table(this, 'dynamodb-table', {
      tableName: `${props.environment}-activity-timer-pubsub`,
      partitionKey: { name: 'connection_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    table.addGlobalSecondaryIndex({
      indexName: 'MemberIdIndex',
      partitionKey: {
        name: 'member_id',
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    const apiLambda = new lambda.Function(this, 'api-lambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.main',
      code: lambda.Code.fromAsset(path.join(__dirname, '/../../src/api/http')),
      environment: {
        ACT_TRELLO_SECRET: props.trelloSecret,
        ACT_DYNAMODB_TABLE: table.tableName,
        ACT_AWS_REGION: props.env.region
      },
      timeout: Duration.seconds(5),
      memorySize: 512
    });

    table.grantReadData(apiLambda);

    const websocketLambda = new lambda.Function(this, 'api-websocket-lambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.main',
      code: lambda.Code.fromAsset(path.join(__dirname, '/../../src/api/websocket')),
      timeout: Duration.seconds(5),
      memorySize: 512,
      environment: {
        ACT_DYNAMODB_TABLE: table.tableName,
        ACT_AWS_REGION: props.env.region
      }
    });

    table.grantReadWriteData(websocketLambda);

    const apiIntegration = new LambdaProxyIntegration({
      handler: apiLambda
    });

    const httpApi = new HttpApi(this, 'api', {
      apiName: `${props.environment}-activity-timer-api`
    });

    httpApi.addRoutes({
      path: '/webhook',
      methods: [HttpMethod.POST, HttpMethod.GET, HttpMethod.HEAD],
      integration: apiIntegration
    });

    const webSocketApi = new WebSocketApi(this, 'websocket-api', {
      apiName: `${props.environment}-activity-timer-websocket-api`,
      connectRouteOptions: { integration: new LambdaWebSocketIntegration({ handler: websocketLambda }) },
      defaultRouteOptions: { integration: new LambdaWebSocketIntegration({ handler: websocketLambda }) },
      disconnectRouteOptions: { integration: new LambdaWebSocketIntegration({ handler: websocketLambda }) }
    });

    webSocketApi.grantManageConnections(apiLambda);

    const apiStage = new WebSocketStage(this, 'websocket', {
      webSocketApi,
      stageName: props.environment,
      autoDeploy: true
    });

    const cloudfrontOAI = new OriginAccessIdentity(this, 'cloudfront-oai', {
      comment: `OAI for activity timer ${props.environment}`
    });

    const siteBucket = new Bucket(this, 'website-bucket', {
      bucketName: `${props.environment}-activity-timer-v2`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      accessControl: BucketAccessControl.PRIVATE,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    siteBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [siteBucket.arnForObjects('*')],
      principals: [new iam.CanonicalUserPrincipal(cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
    }));

    const distribution = new CloudFrontWebDistribution(this, 'website-cloudfront', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: siteBucket,
            originAccessIdentity: cloudfrontOAI
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              compress: true,
              allowedMethods: CloudFrontAllowedMethods.GET_HEAD_OPTIONS
            }
          ]
        }
      ]
    });

    new BucketDeployment(this, 'deployment-with-invalidation', {
      sources: [s3deploy.Source.asset('../dist')],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*']
    });
  }
}
