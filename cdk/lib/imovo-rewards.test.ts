import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ImovoRewards } from './imovo-rewards';

describe('The stripe disputes webhook API stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new ImovoRewards(app, 'CODE');
		const prodStack = new ImovoRewards(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});

	describe('CloudWatch Alarms', () => {
		let app: App;
		let stack: ImovoRewards;
		let template: Template;

		beforeEach(() => {
			app = new App();
			stack = new ImovoRewards(app, 'PROD');
			template = Template.fromStack(stack);
		});

		it('should create Consumer Lambda Error alarm', () => {
			template.hasResourceProperties('AWS::CloudWatch::Alarm', {
				MetricName: 'Errors',
				Namespace: 'AWS/Lambda',
				Statistic: 'Sum',
				Threshold: 3,
				ComparisonOperator: 'GreaterThanOrEqualToThreshold',
				EvaluationPeriods: 1,
			});
		});

		it('should create Producer API Gateway 5XX alarm', () => {
			template.hasResourceProperties('AWS::CloudWatch::Alarm', {
				MetricName: '5XXError',
				Namespace: 'AWS/ApiGateway',
				Statistic: 'Sum',
				Threshold: 1,
				ComparisonOperator: 'GreaterThanOrEqualToThreshold',
			});
		});

		it('should create Producer API Gateway 4XX alarm', () => {
			template.hasResourceProperties('AWS::CloudWatch::Alarm', {
				AlarmName: 'PROD imovo-rewards - Producer API high 4XX error rate',
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
					'PROD imovo-rewards - SQS messages taking too long to process',
				MetricName: 'ApproximateAgeOfOldestMessage',
				Namespace: 'AWS/SQS',
				Threshold: 5 * 60,
				ComparisonOperator: 'GreaterThanThreshold',
			});
		});

		it('should create DLQ alarm with correct properties', () => {
			template.hasResourceProperties('AWS::CloudWatch::Alarm', {
				MetricName: 'ApproximateNumberOfMessagesVisible',
				Namespace: 'AWS/SQS',
				Threshold: 0,
				ComparisonOperator: 'GreaterThanThreshold',
			});
		});

		it('should have alarms pointing to correct SNS topic', () => {
			template.hasResourceProperties('AWS::CloudWatch::Alarm', {
				AlarmActions: [
					Match.objectLike({
						'Fn::Join': Match.arrayWith([
							'',
							Match.arrayWith([
								Match.stringLikeRegexp('alarms-handler-topic-PROD'),
							]),
						]),
					}),
				],
			});
		});
	});
});
