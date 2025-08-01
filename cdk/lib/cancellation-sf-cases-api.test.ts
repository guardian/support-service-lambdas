import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CancellationSfCasesApi } from './cancellation-sf-cases-api';

describe('CancellationSfCasesApi stack', () => {
	it('creates the expected resources', () => {
		const app = new App();
		const stack = new CancellationSfCasesApi(app, 'CancellationSfCasesApi', {
			stack: 'membership',
			stage: 'TEST',
		});

		const template = Template.fromStack(stack);

		// Check that lambda function is created
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'cancellation-sf-cases-api-TEST',
			Handler: 'com.gu.cancellation.sf_cases.Handler::handle',
			Runtime: 'java21',
			MemorySize: 1536,
			Timeout: 300,
			Architectures: ['arm64'],
		});

		// Check that API Gateway REST API is created
		template.hasResourceProperties('AWS::ApiGateway::RestApi', {
			Name: 'membership-TEST-cancellation-sf-cases-api',
		});

		// Check that API Gateway methods are created with API key requirements
		template.hasResourceProperties('AWS::ApiGateway::Method', {
			ApiKeyRequired: true,
			AuthorizationType: 'NONE',
			HttpMethod: 'GET',
		});

		template.hasResourceProperties('AWS::ApiGateway::Method', {
			ApiKeyRequired: true,
			AuthorizationType: 'NONE',
			HttpMethod: 'POST',
		});

		// Check that API key is created
		template.hasResourceProperties('AWS::ApiGateway::ApiKey', {
			Name: 'cancellation-sf-cases-api-key-TEST',
			Description: 'Used by manage-frontend',
			Enabled: true,
		});

		// Check that usage plan is created
		template.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
			UsagePlanName: 'cancellation-sf-cases-api',
		});

		// Check that usage plan key is created
		template.hasResourceProperties('AWS::ApiGateway::UsagePlanKey', {
			KeyType: 'API_KEY',
		});

		// Check that IAM role has correct S3 policies
		template.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{
						Effect: 'Allow',
						Action: ['s3:GetObject*', 's3:GetBucket*', 's3:List*'],
					},
					{
						Effect: 'Allow',
						Action: 'ssm:GetParametersByPath',
					},
					{
						Effect: 'Allow',
						Action: ['ssm:GetParameters', 'ssm:GetParameter'],
					},
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource:
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/TEST/*',
					},
				],
				Version: '2012-10-17',
			},
		});
	});

	it('creates custom domain and DNS records', () => {
		const app = new App();
		const codeStack = new CancellationSfCasesApi(
			app,
			'CancellationSfCasesApiCode',
			{
				stack: 'membership',
				stage: 'CODE',
			},
		);

		const prodStack = new CancellationSfCasesApi(
			app,
			'CancellationSfCasesApiProd',
			{
				stack: 'membership',
				stage: 'PROD',
			},
		);

		const codeTemplate = Template.fromStack(codeStack);
		const prodTemplate = Template.fromStack(prodStack);

		// Check CODE domain configuration
		codeTemplate.hasResourceProperties('AWS::ApiGateway::DomainName', {
			DomainName: 'cancellation-sf-cases-code.support.guardianapis.com',
			EndpointConfiguration: {
				Types: ['REGIONAL'],
			},
		});

		codeTemplate.hasResourceProperties('AWS::Route53::RecordSet', {
			Name: 'cancellation-sf-cases-code.support.guardianapis.com',
			Type: 'CNAME',
			HostedZoneName: 'support.guardianapis.com.',
			TTL: '120',
		});

		// Check PROD domain configuration
		prodTemplate.hasResourceProperties('AWS::ApiGateway::DomainName', {
			DomainName: 'cancellation-sf-cases.support.guardianapis.com',
			EndpointConfiguration: {
				Types: ['REGIONAL'],
			},
		});

		prodTemplate.hasResourceProperties('AWS::Route53::RecordSet', {
			Name: 'cancellation-sf-cases.support.guardianapis.com',
			Type: 'CNAME',
			HostedZoneName: 'support.guardianapis.com.',
			TTL: '120',
		});

		// Check that base path mapping is created
		codeTemplate.hasResourceProperties('AWS::ApiGateway::BasePathMapping', {});
		prodTemplate.hasResourceProperties('AWS::ApiGateway::BasePathMapping', {});
	});

	it('creates alarms only for PROD stage', () => {
		const app = new App();
		const codeStack = new CancellationSfCasesApi(
			app,
			'CancellationSfCasesApiCode',
			{
				stack: 'membership',
				stage: 'CODE',
			},
		);

		const prodStack = new CancellationSfCasesApi(
			app,
			'CancellationSfCasesApiProd',
			{
				stack: 'membership',
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
			AlarmName: '5XX from cancellation-sf-cases-api-PROD',
			ComparisonOperator: 'GreaterThanOrEqualToThreshold',
			Threshold: 1,
			EvaluationPeriods: 1,
			TreatMissingData: 'notBreaching',
			MetricName: '5XXError',
			Namespace: 'AWS/ApiGateway',
			Statistic: 'Sum',
		});
	});

	it('creates correct number of API Gateway methods for all HTTP verbs', () => {
		const app = new App();
		const stack = new CancellationSfCasesApi(app, 'CancellationSfCasesApi', {
			stack: 'membership',
			stage: 'TEST',
		});

		const template = Template.fromStack(stack);

		// Should have methods for both root (/) and proxy (/{proxy+}) paths
		// 7 HTTP methods × 2 paths = 14 methods total
		template.resourceCountIs('AWS::ApiGateway::Method', 14);

		// Check that all HTTP methods are represented
		const httpMethods = [
			'GET',
			'POST',
			'PUT',
			'DELETE',
			'PATCH',
			'HEAD',
			'OPTIONS',
		];

		httpMethods.forEach((method) => {
			// Check method exists with API key requirement
			template.hasResourceProperties('AWS::ApiGateway::Method', {
				HttpMethod: method,
				ApiKeyRequired: true,
				AuthorizationType: 'NONE',
			});
		});
	});

	it('uses correct S3 bucket paths for different stages', () => {
		const app = new App();
		const codeStack = new CancellationSfCasesApi(
			app,
			'CancellationSfCasesApiCode',
			{
				stack: 'membership',
				stage: 'CODE',
			},
		);

		const prodStack = new CancellationSfCasesApi(
			app,
			'CancellationSfCasesApiProd',
			{
				stack: 'membership',
				stage: 'PROD',
			},
		);

		const codeTemplate = Template.fromStack(codeStack);
		const prodTemplate = Template.fromStack(prodStack);

		// CODE should use CODE-specific S3 path
		codeTemplate.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{
						Effect: 'Allow',
						Action: ['s3:GetObject*', 's3:GetBucket*', 's3:List*'],
					},
					{
						Effect: 'Allow',
						Action: 'ssm:GetParametersByPath',
					},
					{
						Effect: 'Allow',
						Action: ['ssm:GetParameters', 'ssm:GetParameter'],
					},
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource:
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/CODE/*',
					},
				],
				Version: '2012-10-17',
			},
		});

		// PROD should use PROD-specific S3 path
		prodTemplate.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{
						Effect: 'Allow',
						Action: ['s3:GetObject*', 's3:GetBucket*', 's3:List*'],
					},
					{
						Effect: 'Allow',
						Action: 'ssm:GetParametersByPath',
					},
					{
						Effect: 'Allow',
						Action: ['ssm:GetParameters', 'ssm:GetParameter'],
					},
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource:
							'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/PROD/*',
					},
				],
				Version: '2012-10-17',
			},
		});
	});

	it('creates API Gateway deployment and stage', () => {
		const app = new App();
		const stack = new CancellationSfCasesApi(app, 'CancellationSfCasesApi', {
			stack: 'membership',
			stage: 'TEST',
		});

		const template = Template.fromStack(stack);

		// Check that API Gateway deployment is created
		template.hasResourceProperties('AWS::ApiGateway::Deployment', {});

		// Check that API Gateway stage is created
		template.hasResourceProperties('AWS::ApiGateway::Stage', {
			StageName: 'prod',
		});
	});

	it('configures lambda with correct environment variables', () => {
		const app = new App();
		const stack = new CancellationSfCasesApi(app, 'CancellationSfCasesApi', {
			stack: 'membership',
			stage: 'TEST',
		});

		const template = Template.fromStack(stack);

		// Check that lambda has correct environment variables
		template.hasResourceProperties('AWS::Lambda::Function', {
			Environment: {
				Variables: {
					Stage: 'TEST',
					STACK: 'membership',
					STAGE: 'TEST',
					APP: 'cancellation-sf-cases-api',
				},
			},
		});
	});
});
