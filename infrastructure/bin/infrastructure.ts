#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { InfrastructureStack } from '../lib/infrastructure-stack';

const app = new cdk.App();

if (!process.env.ACT_ENV) {
  throw new Error('Missing ACT_ENV environment variable');
}

if (!process.env.TRELLO_SECRET) {
  throw new Error('Missing TRELLO_SECRET environment variable');
}

if (!['dev', 'prod'].includes(process.env.ACT_ENV)) {
  throw new Error('Invalid ACT_ENV environment variable');
}

switch (process.env.ACT_ENV) {
  case 'dev':
    new InfrastructureStack(app, 'dev-activity-timer', {
      env: { account: '265358888522', region: 'eu-west-1' },
      environment: 'dev',
      trelloSecret: process.env.TRELLO_SECRET
    });
    break;

  case 'prod':
    new InfrastructureStack(app, 'prod-activity-timer', {
      env: { account: '265358888522', region: 'eu-west-1' },
      environment: 'prod',
      trelloSecret: process.env.TRELLO_SECRET
    });
    break;
}
