# Infrastructure
Activity timer has all of it's infrastructure written in CDK & deployed to AWS. This enables you to replicate the exact same infrastructure on your own AWS account that Activity timer uses as well.

## Prerequisites
1. App secret from https://trello.com/app-key
2. An AWS account with security credentials generated.
3. A valid build from `yarn dev` - see [development](development.md) for more info.

## Introduction
CDK is a infrastructure-as-code framework. All infrastructure is located under ./infrastructure folder.

CDK wraps AWS CloudFormation. So when deploying your CDK stack it is actually constructing CloudFormation markup & deploying this in AWS. CloudFormation will then take care of instansiating the required resources & mutate existing infrastructure to migrate it over to the new state.

## Installation

First you need to install our dependencies.

```
cd infrastructure && yarn install
```

Next up you need to configure your AWS credentials so that CDK can ddeploy the resources in the cloud. You can either do this manually or through the AWS cli: `aws configure`

Now you're able to deploy the infrastructure. This is done using:

```
ACT_ENV=dev TRELLO_SECRET=... yarn cdk deploy
```

After this HTTP API for the webhook, Websocket API for communicating live events, dynamoDB for persistent storage, CloudFront distribution & S3 for vite build.

## Environment variables
**ACT_ENV**: Activity timer environment. Can be either `dev` or `prod`.

**TRELLO_SECRET**: OAuth 1 secret from https://trello.com/app-key