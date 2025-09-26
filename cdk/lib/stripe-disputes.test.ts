import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from './constants';
import { StripeDisputes } from './stripe-disputes';

describe('The stripe disputes webhook API stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new StripeDisputes(app, 'stripe-disputes-CODE', {
			stack: 'membership',
			stage: 'CODE',
			domainName: `stripe-disputes.code.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});
		const prodStack = new StripeDisputes(app, 'stripe-disputes-PROD', {
			stack: 'membership',
			stage: 'PROD',
			domainName: `stripe-disputes.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});

	describe('CloudWatch Alarms', () => {
		let app: App;
		let stack: StripeDisputes;
		let template: Template;

		beforeEach(() => {
			app = new App();
			stack = new StripeDisputes(app, 'stripe-disputes-TEST', {
				stack: 'membership',
				stage: 'TEST',
				domainName: `stripe-disputes.test.${supportApisDomain}`,
				hostedZoneId: supportHostedZoneId,
				certificateId: supportCertificateId,
			});
			template = Template.fromStack(stack);
		});

		it('should create Consumer Lambda Error alarm', () => {
			template.hasResourceProperties('AWS::CloudWatch::Alarm', {
				AlarmName: 'TEST stripe-disputes - Consumer Lambda high error rate',
				MetricName: 'Errors',
				Namespace: 'AWS/Lambda',
				Statistic: 'Sum',
				Threshold: 3,
				ComparisonOperator: 'GreaterThanOrEqualToThreshold',
				EvaluationPeriods: 1,
			});
		});

		it('should create Consumer Lambda Timeout alarm', () => {
			template.hasResourceProperties('AWS::CloudWatch::Alarm', {
				AlarmName: 'TEST stripe-disputes - Consumer Lambda near timeout',
				MetricName: 'Duration',
				Namespace: 'AWS/Lambda',
				Statistic: 'Maximum',
				Threshold: 290000,
				ComparisonOperator: 'GreaterThanThreshold',
			});
		});

		it('should create Producer API Gateway 5XX alarm', () => {
			template.hasResourceProperties('AWS::CloudWatch::Alarm', {
				AlarmName: 'TEST stripe-disputes - Producer API 5XX errors',
				MetricName: '5XXError',
				Namespace: 'AWS/ApiGateway',
				Statistic: 'Sum',
				Threshold: 1,
				ComparisonOperator: 'GreaterThanOrEqualToThreshold',
			});
		});

		it('should create Producer API Gateway 4XX alarm', () => {
			template.hasResourceProperties('AWS::CloudWatch::Alarm', {
				AlarmName: 'TEST stripe-disputes - Producer API high 4XX error rate',
				MetricName: '4XXError',
				Namespace: 'AWS/ApiGateway',
				Statistic: 'Sum',
				Threshold: 10,
				ComparisonOperator: 'GreaterThanThreshold',
			});
		});

		it('should create SQS Message Age alarm', () => {
			template.hasResourceProperties('AWS::CloudWatch::Alarm', {
				AlarmName:
					'TEST stripe-disputes - SQS messages taking too long to process',
				MetricName: 'ApproximateAgeOfOldestMessage',
				Namespace: 'AWS/SQS',
				Threshold: 300000,
				ComparisonOperator: 'GreaterThanThreshold',
			});
		});

		it('should create Consumer Lambda Throttle alarm', () => {
			template.hasResourceProperties('AWS::CloudWatch::Alarm', {
				AlarmName: 'TEST stripe-disputes - Consumer Lambda throttled',
				MetricName: 'Throttles',
				Namespace: 'AWS/Lambda',
				Statistic: 'Sum',
				Threshold: 1,
				ComparisonOperator: 'GreaterThanOrEqualToThreshold',
			});
		});

		it('should create DLQ alarm with correct properties', () => {
			template.hasResourceProperties('AWS::CloudWatch::Alarm', {
				AlarmName: 'TEST stripe-disputes - Failed to process dispute webhook',
				MetricName: 'ApproximateNumberOfMessagesVisible',
				Namespace: 'AWS/SQS',
				Threshold: 1,
				ComparisonOperator: 'GreaterThanOrEqualToThreshold',
			});
		});

		it('should have alarms pointing to correct SNS topic', () => {
			template.hasResourceProperties('AWS::CloudWatch::Alarm', {
				AlarmActions: [
					Match.objectLike({
						'Fn::Join': Match.arrayWith([
							'',
							Match.arrayWith([
								Match.stringLikeRegexp('alarms-handler-topic-TEST'),
							]),
						]),
					}),
				],
			});
		});
	});
});
