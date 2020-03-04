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

    const appName = 'sf-move-subscriptions-api'
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
        resources: [
          `arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${stageParameter.valueAsString}/sfAuth-${stageParameter.valueAsString}*.json`,
          `arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${stageParameter.valueAsString}/zuoraRest-${stageParameter.valueAsString}*.json`
,
        ],
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
  
      Tag.add(role, 'App', appName)
      Tag.add(role, 'Stage', stageParameter.valueAsString)
      Tag.add(role, 'Stack', stackName)

      return role
    }

    // Lambda
    const createSfMoveSubscriptionsLambda = (fnRole: iam.IRole) => {
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
            `membership/${stageParameter.valueAsString}/sf-move-subscriptions-api/sf-move-subscriptions-api.jar`
          ),
          handler: 'com.gu.sf.move.subscriptions.api.Handler::apply',
          role: fnRole,
        },
      )
  
      Tag.add(fn, 'App', appName)
      Tag.add(fn, 'Stage', stageParameter.valueAsString)
      Tag.add(fn, 'Stack', stackName)

      return fn
    }

    // api gateway
    const createSfMoveSubscriptionsApi = (fn: lambda.IFunction) => {
      const apiStageName: string = context.resolve(stageParameter.valueAsString)

      const apiGateway = new apigateway.LambdaRestApi(
        this,
        appName,
        {
          restApiName: `${appName}-${stageParameter.valueAsString}`,
          proxy: true,
          handler: fn,
          description: `API for for moving subscriptions in Salesforce in ${stageParameter.valueAsString} env`,
          deployOptions: {
            stageName: apiStageName
          }
        })
  
      Tag.add(apiGateway, 'App', appName)
      Tag.add(apiGateway, 'Stage', stageParameter.valueAsString)
      Tag.add(apiGateway, 'Stack', stackName)

      return apiGateway
    }

    const sfMoveSubscriptionsFnRole = createSfMoveSubscriptionsFnRole()

    const sfMoveSubscriptionsLambda = createSfMoveSubscriptionsLambda(sfMoveSubscriptionsFnRole)

    createSfMoveSubscriptionsApi(sfMoveSubscriptionsLambda)
  }
}
