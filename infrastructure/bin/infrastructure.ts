#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { InfrastructureStack } from '../lib/infrastructure-stack';

const app = new cdk.App();

if (!process.env.ACT_ENV) {
  throw new Error('Missing ACT_ENV environment variable');
}

if (!['dev', 'prod'].includes(process.env.ACT_ENV)) {
  throw new Error('Invalid ACT_ENV environment variable');
}

switch (process.env.ACT_ENV) {
case 'dev':
  new InfrastructureStack(app, 'InfrastructureStack', {
    env: { account: '265358888522', region: 'eu-west-1' },
    environment: 'dev'
  });
  break;

case 'prod':
  new InfrastructureStack(app, 'InfrastructureStack', {
    env: { account: '265358888522', region: 'eu-west-1' },
    environment: 'prod'
  });
  break;
}
