import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway'
import { Code } from '@aws-cdk/aws-lambda'
import * as lambda from '@aws-cdk/aws-lambda'
import * as iam from '@aws-cdk/aws-iam'
import { Duration, Tag } from '@aws-cdk/core'
import * as s3 from '@aws-cdk/aws-s3'

export class SfMoveSubscriptionsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const context = cdk.Stack.of(this)
    const account = context.account
    const region = context.region

    const stageParameter = new cdk.CfnParameter(this, 'stage', {
      type: 'String',
      description: 'Stage',
    })

    const logGroupNamePrefixParameter = new cdk.CfnParameter(this, 'stage', {
      type: 'String',
      description: 'LogGroupNamePrefix',
    })

    const appName = 'sf-move-subscritions'
    const stackName = 'membership'
    const deployBucket = s3.Bucket.fromBucketName(
      this,
      'deployBucket',
      'support-service-lambdas-dist',
    )

    // role
    const createSfMoveSubscriptionsFnRole = () => {
      const role = new iam.Role(this, 'sfMoveSubscriptionsFnRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
      })
  
      role.addToPolicy(new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${stageParameter.valueAsString}/sfExportAuth-${stageParameter.valueAsString}*.json`],
      }))
  
      role.addToPolicy(new iam.PolicyStatement({
        actions: ['logs:CreateLogGroup'],
        resources: [`arn:aws:logs:${region}:${account}:*`],
      }))
  
      role.addToPolicy(new iam.PolicyStatement({
        actions: [
          'logs:CreateLogStream',
          'logs:PutLogEvents'
        ],
        resources: [`arn:aws:logs:${region}:${account}:log-group:/aws/lambda/${appName}-${stageParameter.valueAsString}:*`],
      }))
  
      Tag.add(role, 'App', `${appName}-lambda-role`)
      Tag.add(role, 'Stage', stageParameter.valueAsString)
      Tag.add(role, 'Stack', stackName)

      return role
    }

    const sfMoveSubscriptionsFnRole = createSfMoveSubscriptionsFnRole()

    // Lambda
    const createSfMoveSubscriptionsLambda = () => {
      const fn = new lambda.Function(
        this,
        'sfMoveSubscriptionsLambda',
        {
          functionName: `${appName}-${stageParameter.valueAsString}`,
          runtime: lambda.Runtime.JAVA_8,
          memorySize: 192,
          timeout: Duration.seconds(300),
          code: Code.bucket(
            deployBucket,
            `membership/${stageParameter.valueAsString}/sf-move-subscriptions/sf-move-subscriptions.jar`
          ),
          handler: 'com.gu.sfMoveSubscriptions.Handler::apply',
          role: sfMoveSubscriptionsFnRole,
        },
      )
  
      Tag.add(fn, 'App', appName)
      Tag.add(fn, 'Stage', stageParameter.valueAsString)
      Tag.add(fn, 'Stack', stackName)

      return fn
    }

    const sfMoveSubscriptionsLambda = createSfMoveSubscriptionsLambda()

    // api gateway
    const apiGatewayName = `${appName}-api`
    const apiGateway = new apigateway.LambdaRestApi(
      this,
      apiGatewayName,
      {
        restApiName: `${apiGatewayName}-${stageParameter.valueAsString}`,
        proxy: true,
        handler: sfMoveSubscriptionsLambda,
        description: `API for admin tools image projection lambda in ${stageParameter.valueAsString} env`,
        deployOptions: {
          stageName: 'code'
        }
      })

    Tag.add(apiGateway, 'App', appName)
    Tag.add(apiGateway, 'Stage', stageParameter.valueAsString)
    Tag.add(apiGateway, 'Stack', stackName)

  }
}
