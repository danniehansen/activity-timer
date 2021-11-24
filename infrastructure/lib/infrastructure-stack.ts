import { CloudFrontAllowedMethods, CloudFrontWebDistribution, OriginAccessIdentity, OriginProtocolPolicy, SecurityPolicyProtocol } from '@aws-cdk/aws-cloudfront';
import { BlockPublicAccess, Bucket, BucketAccessControl } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { RemovalPolicy } from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import { BucketDeployment } from '@aws-cdk/aws-s3-deployment';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';

interface Props extends cdk.StackProps {
  environment: 'dev' | 'prod';
}

export class InfrastructureStack extends cdk.Stack {
  constructor (scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

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
