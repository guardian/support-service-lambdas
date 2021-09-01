import * as cdk from '@aws-cdk/core';
import { Code } from '@aws-cdk/aws-lambda'
import * as lambda from '@aws-cdk/aws-lambda'
import * as iam from '@aws-cdk/aws-iam'
import { Duration, Tag } from '@aws-cdk/core'
import * as s3 from '@aws-cdk/aws-s3'
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as sns from '@aws-cdk/aws-sns';
import events = require('@aws-cdk/aws-events');
import targets = require('@aws-cdk/aws-events-targets');

export class DigitalVoucherCancellationProcessorStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const context = cdk.Stack.of(this)
    const account = context.account
    const region = context.region

    const stageParameter = new cdk.CfnParameter(this, 'Stage', {
      type: 'String',
      description: 'Stage',
    })

    const appName = 'digital-voucher-cancellation-processor'
    const stackName = 'membership'

    const isProd = new cdk.CfnCondition(this, 'IsProd', {
        expression: cdk.Fn.conditionEquals(stageParameter.valueAsString, 'PROD'),
    });

    const deployBucket = s3.Bucket.fromBucketName(
      this,
      'deployBucket',
      'support-service-lambdas-dist',
    )

    // role
    const createDigitalVoucherCancellationProcessorFnRole = () => {
      const role = new iam.Role(this, 'DigitalVoucherCancellationProcessorFnRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
      })

      role.addToPolicy(new iam.PolicyStatement({
        actions: ['ssm:GetParametersByPath'],
        resources: [
          `arn:aws:ssm:${region}:${account}:parameter/${stageParameter.valueAsString}/${stackName}/support-service-lambdas-shared-salesforce`,
          `arn:aws:ssm:${region}:${account}:parameter/${stageParameter.valueAsString}/${stackName}/support-service-lambdas-shared-imovo`
        ],
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
    const createDigitalVoucherCancellationProcessorLambda = (fnRole: iam.IRole) => {
      const fn = new lambda.Function(
        this,
        'DigitalVoucherCancellationProcessorLambda',
        {
          functionName: `${appName}-${stageParameter.valueAsString}`,
          runtime: lambda.Runtime.JAVA_8_CORRETTO,
          memorySize: 1536,
          timeout: Duration.seconds(300),
          code: Code.bucket(
            deployBucket,
            `membership/${stageParameter.valueAsString}/digital-voucher-cancellation-processor/digital-voucher-cancellation-processor.jar`
          ),
          handler: 'com.gu.digital_voucher_cancellation_processor.Handler::handle',
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

    const createDigitalVoucherCancellationProcessorSchedule = (lambdaFn: lambda.Function) => {
        const schedule = new events.Rule(this, 'DigitalVoucherCancellationProcessorSchedule', {
          schedule: events.Schedule.expression('cron(0 * * * ? *)')
        });

        schedule.addTarget(new targets.LambdaFunction(digitalVoucherCancellationProcessorLambda));

        return schedule
    }

    const createErrorAlarm = (lambdaFn: lambda.Function) => {
        const alarm = new cloudwatch.Alarm(this, 'ErrorAlarm', {
            alarmName: 'URGENT 9-5 - PROD: Failed to cancel digital voucher subscriptions',
            alarmDescription: 'IMPACT: If this goes unaddressed at least one subscription that ' +
                'was supposed to be cancelled will be available for fulfilment. ' +
                'For troubleshooting, see ' +
                'https://github.com/guardian/support-service-lambdas/blob/main/handlers/digital-voucher-cancellation-processor/README.md.',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Errors',
                dimensions: {FunctionName: lambdaFn.functionName}
            }),
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            period: cdk.Duration.minutes(5),
            statistic: 'Sum',
            threshold: 1,
            evaluationPeriods: 1,
            treatMissingData: cloudwatch.TreatMissingData.MISSING
        });
        alarm.addAlarmAction({
            bind() {
                return {
                    alarmActionArn: `arn:aws:sns:${region}:${account}:fulfilment-dev`
                };
            },
        });
        return alarm;
    }

    const digitalVoucherCancellationProcessorFnRole = createDigitalVoucherCancellationProcessorFnRole()

    const digitalVoucherCancellationProcessorLambda = createDigitalVoucherCancellationProcessorLambda(digitalVoucherCancellationProcessorFnRole)

    const digitalVoucherCancellationProcessorSchedule = createDigitalVoucherCancellationProcessorSchedule(digitalVoucherCancellationProcessorLambda)

    const errorAlarm = createErrorAlarm(digitalVoucherCancellationProcessorLambda);
    errorAlarm.node.addDependency(digitalVoucherCancellationProcessorLambda);
    (errorAlarm.node.defaultChild as cloudwatch.CfnAlarm).cfnOptions.condition = isProd;
  }
}
