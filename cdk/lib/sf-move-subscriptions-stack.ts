import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway'
import { Code } from '@aws-cdk/aws-lambda'
import * as lambda from '@aws-cdk/aws-lambda'
import * as iam from '@aws-cdk/aws-iam'
import { Duration, Tag, Fn } from '@aws-cdk/core'
import * as s3 from '@aws-cdk/aws-s3'
import { ApiKeySourceType } from '@aws-cdk/aws-apigateway';
import { Effect, AnyPrincipal } from '@aws-cdk/aws-iam';

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

    const officeIpRangeParameter = new cdk.CfnParameter(this, 'officeIpRange', {
      type: 'String',
      description: 'officeIpRange',
    })

    const salesForceIpRangesParameter = new cdk.CfnParameter(this, 'salesForceIpRanges', {
      type: 'CommaDelimitedList',
      description: 'salesForceIpRanges',
    })

    const allWhitelistedIps = Fn.split(',',
      Fn.join(",", salesForceIpRangesParameter.valueAsList) + ',' +
      officeIpRangeParameter.valueAsString)

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
        actions: ['ssm:GetParametersByPath'],
        resources: [`arn:aws:ssm:${region}:${account}:parameter/${stageParameter.valueAsString}/${stackName}/${appName}`],
      }))

      role.addToPolicy(new iam.PolicyStatement({
        actions: ['kms:Decrypt'],
        resources: [`arn:aws:kms:${region}:${account}:alias/aws/ssm`],
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
          runtime: lambda.Runtime.JAVA_8_CORRETTO,
          memorySize: 1536,
          timeout: Duration.seconds(300),
          code: Code.bucket(
            deployBucket,
            `membership/${stageParameter.valueAsString}/sf-move-subscriptions-api/sf-move-subscriptions-api.jar`
          ),
          handler: 'com.gu.sf.move.subscriptions.api.Handler::handle',
          role: fnRole,
          environment: {
            'App': appName,
            'Stage': stageParameter.valueAsString,
            'Stack': stackName
          }
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

      const apiResourcePolicy = new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: ['execute-api:Invoke'],
            principals: [new AnyPrincipal()],
            resources: ['execute-api:/*/*/*'],
          }),
          new iam.PolicyStatement({
            effect: Effect.DENY,
            principals: [new AnyPrincipal()],
            actions: ['execute-api:Invoke'],
            resources: ['execute-api:/*/*/*'],
            conditions: {
              'NotIpAddress': {
                "aws:SourceIp": allWhitelistedIps
              }
            }
          })
        ]
      })

      const api = new apigateway.LambdaRestApi(
        this,
        appName,
        {
          restApiName: `${appName}-${stageParameter.valueAsString}`,
          proxy: false,
          apiKeySourceType: ApiKeySourceType.HEADER,
          handler: fn,
          description: `API for for moving subscriptions in Salesforce in ${stageParameter.valueAsString} env`,
          deployOptions: {
            stageName: apiStageName,
          },
          policy: apiResourcePolicy,
        })

      api.root.addMethod('ANY', new apigateway.LambdaIntegration(fn), { apiKeyRequired: true })
      api.root.addProxy({ defaultMethodOptions: { apiKeyRequired: true } })

      Tag.add(api, 'App', appName)
      Tag.add(api, 'Stage', stageParameter.valueAsString)
      Tag.add(api, 'Stack', stackName)

      const apiKey = new apigateway.ApiKey(
        this,
        'sfMoveSubscriptionsApiKey',
        {
          apiKeyName: `${appName}-key-${stageParameter.valueAsString}`,
          resources: [api]
        }
      )

      const usagePlan = new apigateway.UsagePlan(
        this,
        'sfMoveSubscriptionsApiUsagePlan', {
        name: `${appName}-usage-plan-${stageParameter.valueAsString}`,
        apiKey: apiKey,
      })

      usagePlan.addApiStage({
        stage: api.deploymentStage,
      })

      return api
    }

    const sfMoveSubscriptionsFnRole = createSfMoveSubscriptionsFnRole()

    const sfMoveSubscriptionsLambda = createSfMoveSubscriptionsLambda(sfMoveSubscriptionsFnRole)

    createSfMoveSubscriptionsApi(sfMoveSubscriptionsLambda)
  }
}
