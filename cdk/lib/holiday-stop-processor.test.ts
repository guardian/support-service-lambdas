import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { HolidayStopProcessor } from './holiday-stop-processor';

describe('HolidayStopProcessor stack', () => {
	it('creates the expected resources', () => {
		const app = new App();
		const stack = new HolidayStopProcessor(app, 'HolidayStopProcessor', {
			stack: 'support',
			stage: 'TEST',
		});

		const template = Template.fromStack(stack);

		// Check that lambda function is created
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'holiday-stop-processor-TEST',
			Handler: 'com.gu.holidaystopprocessor.Handler::handle',
			Runtime: 'java21',
			MemorySize: 1232,
			Timeout: 900,
		});

		// Check that EventBridge rule is created
		template.hasResourceProperties('AWS::Events::Rule', {
			Description:
				'Trigger processing of holiday stops every 20 mins (to ensure successful processing of all batches within 24 hours)',
			ScheduleExpression: 'cron(0/20 * ? * * *)',
			State: 'ENABLED',
		});

		// Check that lambda permission is created
		template.hasResourceProperties('AWS::Lambda::Permission', {
			Action: 'lambda:InvokeFunction',
			Principal: 'events.amazonaws.com',
		});

		// Check that EventInvokeConfig is created with no retries
		template.hasResourceProperties('AWS::Lambda::EventInvokeConfig', {
			MaximumRetryAttempts: 0,
			Qualifier: '$LATEST',
		});

		// Check that IAM role has correct policies
		template.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource: [
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/TEST/zuoraRest-TEST*.json',
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/TEST/sfAuth-TEST*.json',
							'arn:aws:s3:::fulfilment-date-calculator-code/*', // TEST uses CODE config
						],
					},
				],
			},
		});
	});

	it('creates alarms only for PROD stage', () => {
		const app = new App();
		const codeStack = new HolidayStopProcessor(
			app,
			'HolidayStopProcessorCode',
			{
				stack: 'support',
				stage: 'CODE',
			},
		);

		const prodStack = new HolidayStopProcessor(
			app,
			'HolidayStopProcessorProd',
			{
				stack: 'support',
				stage: 'PROD',
			},
		);

		const codeTemplate = Template.fromStack(codeStack);
		const prodTemplate = Template.fromStack(prodStack);

		// CODE should not have alarms
		codeTemplate.resourceCountIs('AWS::CloudWatch::Alarm', 0);

		// PROD should have alarms
		prodTemplate.resourcePropertiesCountIs('AWS::CloudWatch::Alarm', {}, 1);

		// Verify the alarm configuration for PROD
		prodTemplate.hasResourceProperties('AWS::CloudWatch::Alarm', {
			AlarmName: 'URGENT 9-5 - PROD: Failed to process holiday stops',
			ComparisonOperator: 'GreaterThanOrEqualToThreshold',
			Threshold: 1,
			DatapointsToAlarm: 10,
			EvaluationPeriods: 240,
			TreatMissingData: 'notBreaching',
		});
	});

	it('uses correct S3 bucket URNs for different stages', () => {
		const app = new App();
		const codeStack = new HolidayStopProcessor(
			app,
			'HolidayStopProcessorCode',
			{
				stack: 'support',
				stage: 'CODE',
			},
		);

		const prodStack = new HolidayStopProcessor(
			app,
			'HolidayStopProcessorProd',
			{
				stack: 'support',
				stage: 'PROD',
			},
		);

		const codeTemplate = Template.fromStack(codeStack);
		const prodTemplate = Template.fromStack(prodStack);

		// CODE should use fulfilment-date-calculator-code bucket
		codeTemplate.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{
						Resource: [
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/CODE/zuoraRest-CODE*.json',
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/CODE/sfAuth-CODE*.json',
							'arn:aws:s3:::fulfilment-date-calculator-code/*',
						],
					},
				],
			},
		});

		// PROD should use fulfilment-date-calculator-prod bucket
		prodTemplate.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{
						Resource: [
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/PROD/zuoraRest-PROD*.json',
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/PROD/sfAuth-PROD*.json',
							'arn:aws:s3:::fulfilment-date-calculator-prod/*',
						],
					},
				],
			},
		});
	});
});
