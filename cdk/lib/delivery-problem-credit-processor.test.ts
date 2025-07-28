import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DeliveryProblemCreditProcessor } from './delivery-problem-credit-processor';

describe('DeliveryProblemCreditProcessor stack', () => {
	it('creates the expected resources for PROD stage', () => {
		const app = new App();
		const stack = new DeliveryProblemCreditProcessor(app, 'DeliveryProblemCreditProcessor', {
			stack: 'support',
			stage: 'PROD',
		});

		const template = Template.fromStack(stack);

		// Check that lambda function is created
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'delivery-problem-credit-processor-PROD',
			Handler: 'com.gu.deliveryproblemcreditprocessor.Handler::handle',
			Runtime: 'java21',
			MemorySize: 1024,
			Timeout: 900,
		});

		// Check that EventBridge rule is created for PROD (scheduled execution)
		template.hasResourceProperties('AWS::Events::Rule', {
			Description:
				'Trigger processing of delivery-problem credits every 20 mins',
			ScheduleExpression: 'cron(0/20 * ? * * *)',
			State: 'ENABLED',
		});

		// Check that lambda permission is created
		template.hasResourceProperties('AWS::Lambda::Permission', {
			Action: 'lambda:InvokeFunction',
			Principal: 'events.amazonaws.com',
		});

		// Check that IAM role has correct policies for Zuora and Salesforce credentials
		template.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource: [
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/PROD/zuoraRest-PROD*.json',
						],
					},
				],
				Version: '2012-10-17',
			},
		});

		template.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource: [
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/PROD/sfAuth-PROD*.json',
						],
					},
				],
				Version: '2012-10-17',
			},
		});
	});

	it('creates the expected resources for CODE stage', () => {
		const app = new App();
		const stack = new DeliveryProblemCreditProcessor(app, 'DeliveryProblemCreditProcessor', {
			stack: 'support',
			stage: 'CODE',
		});

		const template = Template.fromStack(stack);

		// Check that lambda function is created
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'delivery-problem-credit-processor-CODE',
			Handler: 'com.gu.deliveryproblemcreditprocessor.Handler::handle',
			Runtime: 'java21',
			MemorySize: 1024,
			Timeout: 900,
		});

		// Check that NO EventBridge rule is created for CODE (no scheduling)
		template.resourceCountIs('AWS::Events::Rule', 0);

		// Check that IAM role has correct policies for CODE stage
		template.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource: [
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/CODE/zuoraRest-CODE*.json',
						],
					},
				],
				Version: '2012-10-17',
			},
		});

		template.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource: [
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/CODE/sfAuth-CODE*.json',
						],
					},
				],
				Version: '2012-10-17',
			},
		});
	});

	it('creates alarms only for PROD stage', () => {
		const app = new App();
		const codeStack = new DeliveryProblemCreditProcessor(
			app,
			'DeliveryProblemCreditProcessorCode',
			{
				stack: 'support',
				stage: 'CODE',
			},
		);

		const prodStack = new DeliveryProblemCreditProcessor(
			app,
			'DeliveryProblemCreditProcessorProd',
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
			AlarmName: 'URGENT 9-5 - PROD: Failed to process delivery-problem credits',
			ComparisonOperator: 'GreaterThanOrEqualToThreshold',
			Threshold: 3,
			EvaluationPeriods: 1,
			TreatMissingData: 'ignore',
		});
	});

	it('uses correct S3 bucket URNs for different stages', () => {
		const app = new App();
		const codeStack = new DeliveryProblemCreditProcessor(
			app,
			'DeliveryProblemCreditProcessorCode',
			{
				stack: 'support',
				stage: 'CODE',
			},
		);

		const prodStack = new DeliveryProblemCreditProcessor(
			app,
			'DeliveryProblemCreditProcessorProd',
			{
				stack: 'support',
				stage: 'PROD',
			},
		);

		const codeTemplate = Template.fromStack(codeStack);
		const prodTemplate = Template.fromStack(prodStack);

		// CODE should use CODE stage paths
		codeTemplate.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource: [
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/CODE/zuoraRest-CODE*.json',
						],
					},
				],
				Version: '2012-10-17',
			},
		});

		codeTemplate.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource: [
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/CODE/sfAuth-CODE*.json',
						],
					},
				],
				Version: '2012-10-17',
			},
		});

		// PROD should use PROD stage paths
		prodTemplate.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource: [
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/PROD/zuoraRest-PROD*.json',
						],
					},
				],
				Version: '2012-10-17',
			},
		});

		prodTemplate.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource: [
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/PROD/sfAuth-PROD*.json',
						],
					},
				],
				Version: '2012-10-17',
			},
		});
	});

	it('creates scheduled lambda for PROD but regular lambda for CODE', () => {
		const app = new App();
		const codeStack = new DeliveryProblemCreditProcessor(
			app,
			'DeliveryProblemCreditProcessorCode',
			{
				stack: 'support',
				stage: 'CODE',
			},
		);

		const prodStack = new DeliveryProblemCreditProcessor(
			app,
			'DeliveryProblemCreditProcessorProd',
			{
				stack: 'support',
				stage: 'PROD',
			},
		);

		const codeTemplate = Template.fromStack(codeStack);
		const prodTemplate = Template.fromStack(prodStack);

		// Both should have exactly one Lambda function
		codeTemplate.resourceCountIs('AWS::Lambda::Function', 1);
		prodTemplate.resourceCountIs('AWS::Lambda::Function', 1);

		// Only PROD should have EventBridge rule for scheduling
		codeTemplate.resourceCountIs('AWS::Events::Rule', 0);
		prodTemplate.resourceCountIs('AWS::Events::Rule', 1);

		// Only PROD should have EventBridge targets
		codeTemplate.resourceCountIs('AWS::Events::Target', 0);
		prodTemplate.resourceCountIs('AWS::Events::Target', 1);
	});
});
