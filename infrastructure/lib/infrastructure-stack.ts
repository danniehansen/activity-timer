import {
  CloudFrontAllowedMethods,
  CloudFrontWebDistribution,
  OriginAccessIdentity,
  Function,
  FunctionCode,
  FunctionEventType
} from '@aws-cdk/aws-cloudfront';
import {
  BlockPublicAccess,
  Bucket,
  BucketAccessControl
} from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { Duration, RemovalPolicy } from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import { BucketDeployment } from '@aws-cdk/aws-s3-deployment';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import {
  LambdaProxyIntegration,
  LambdaWebSocketIntegration
} from '@aws-cdk/aws-apigatewayv2-integrations';
import {
  HttpApi,
  HttpMethod,
  WebSocketApi,
  WebSocketStage
} from '@aws-cdk/aws-apigatewayv2';
import * as lambda from '@aws-cdk/aws-lambda';
import * as path from 'path';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

type PowerupEnvironment = 'dev' | 'prod';

interface Props extends cdk.StackProps {
  environment: PowerupEnvironment;
  trelloSecret: string;
}

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    if (!props.env?.region) {
      throw new Error('No AWS region specified');
    }

    const { webSocketApi } = this.constructPubSub(
      props.environment,
      props.trelloSecret,
      props.env.region
    );
    this.constructWebsite(props.environment, webSocketApi);
  }

  private constructWebsite(
    env: PowerupEnvironment,
    webSocketApi: WebSocketApi
  ) {
    const siteBucket = new Bucket(this, 'website-bucket', {
      bucketName: `${env}-activity-timer-v2`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      accessControl: BucketAccessControl.PRIVATE,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    const cloudfrontOAI = new OriginAccessIdentity(this, 'cloudfront-oai', {
      comment: `OAI for activity timer ${env}`
    });

    siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [siteBucket.arnForObjects('*')],
        principals: [
          new iam.CanonicalUserPrincipal(
            cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
          )
        ]
      })
    );

    /**
     * These content security policy headers are required by Trello.
     */
    const responseFunction = new Function(
      this,
      'website-cloudfront-viewer-response',
      {
        code: FunctionCode.fromInline(`
        function handler(event) {
          var response = event.response;
          var headers = response.headers;

          // Set HTTP security headers
          headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload'};
          headers['content-security-policy'] = { value: "default-src 'none'; font-src 'self' data:; img-src 'self' https://www.google-analytics.com/; script-src 'self' 'unsafe-inline' https://p.trellocdn.com/ https://www.googletagmanager.com/ https://www.google-analytics.com/; style-src 'self' https://p.trellocdn.com/; object-src 'none'; connect-src 'self' ${webSocketApi.apiEndpoint} *.ingest.sentry.io https://api.optro.cloud/ https://api.trello.com/"};
          headers['x-content-type-options'] = { value: 'nosniff'};

          // Return the response to viewers
          return response;
        }
      `),
        comment: 'Adds security headers',
        functionName: `${env}-activity-timer-viewer-response-func`
      }
    );

    const distribution = new CloudFrontWebDistribution(
      this,
      'website-cloudfront',
      {
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
                allowedMethods: CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
                functionAssociations: [
                  {
                    function: responseFunction,
                    eventType: FunctionEventType.VIEWER_RESPONSE
                  }
                ]
              }
            ]
          }
        ]
      }
    );

    new BucketDeployment(this, 'deployment-with-invalidation', {
      sources: [s3deploy.Source.asset('../dist')],
      destinationBucket: siteBucket,
      prune: false,
      distribution,
      distributionPaths: ['/*']
    });
  }

  private constructPubSub(
    env: PowerupEnvironment,
    trelloSecret: string,
    region: string
  ) {
    const table = new dynamodb.Table(this, 'dynamodb-table', {
      tableName: `${env}-activity-timer-pubsub`,
      partitionKey: {
        name: 'connection_id',
        type: dynamodb.AttributeType.STRING
      },
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
        ACT_TRELLO_SECRET: trelloSecret,
        ACT_DYNAMODB_TABLE: table.tableName,
        ACT_AWS_REGION: region
      },
      timeout: Duration.seconds(5),
      memorySize: 512
    });

    table.grantReadWriteData(apiLambda);

    const websocketLambda = new lambda.Function(this, 'api-websocket-lambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.main',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '/../../src/api/websocket')
      ),
      timeout: Duration.seconds(5),
      memorySize: 512,
      environment: {
        ACT_DYNAMODB_TABLE: table.tableName,
        ACT_AWS_REGION: region
      }
    });

    table.grantReadWriteData(websocketLambda);

    const apiIntegration = new LambdaProxyIntegration({
      handler: apiLambda
    });

    const httpApi = new HttpApi(this, 'api', {
      apiName: `${env}-activity-timer-api`
    });

    httpApi.addRoutes({
      path: '/webhook',
      methods: [HttpMethod.POST, HttpMethod.GET, HttpMethod.HEAD],
      integration: apiIntegration
    });

    const webSocketApi = new WebSocketApi(this, 'websocket-api', {
      apiName: `${env}-activity-timer-websocket-api`,
      connectRouteOptions: {
        integration: new LambdaWebSocketIntegration({
          handler: websocketLambda
        })
      },
      defaultRouteOptions: {
        integration: new LambdaWebSocketIntegration({
          handler: websocketLambda
        })
      },
      disconnectRouteOptions: {
        integration: new LambdaWebSocketIntegration({
          handler: websocketLambda
        })
      }
    });

    webSocketApi.grantManageConnections(apiLambda);

    const apiStage = new WebSocketStage(this, 'websocket', {
      webSocketApi,
      stageName: env,
      autoDeploy: true
    });

    return { webSocketApi, apiStage };
  }
}
