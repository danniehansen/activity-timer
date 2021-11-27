import { Template } from '@aws-cdk/assertions';
import * as cdk from '@aws-cdk/core';
import * as Infrastructure from '../lib/infrastructure-stack';

test('Deployment', () => {
  const app = new cdk.App();
  const stack = new Infrastructure.InfrastructureStack(app, 'MyTestStack', {
    environment: 'dev',
    trelloSecret: 'unknown',
    env: {
      account: 'unknown',
      region: 'eu-west-1'
    }
  });

  const template = Template.fromStack(stack);

  // Assert dynamodb table
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    TableName: 'dev-activity-timer-pubsub',
    BillingMode: 'PAY_PER_REQUEST'
  });

  // Assert that we have our Lambda functions
  template.resourceCountIs('AWS::Lambda::Function', 3);

  // Assert http API Gateway for webhook
  template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
    Name: 'dev-activity-timer-api',
    ProtocolType: 'HTTP'
  });

  // Assert websocket API Gateway
  template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
    Name: 'dev-activity-timer-websocket-api',
    ProtocolType: 'WEBSOCKET'
  });

  // Assert that we have our CloudFront instance
  template.resourceCountIs('AWS::CloudFront::Distribution', 1);
});