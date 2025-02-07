import * as process from 'process';
import type {
	Dimension,
	PutMetricDataCommandInput,
} from '@aws-sdk/client-cloudwatch';
import {
	CloudWatchClient,
	PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';

export type Stage = 'CODE' | 'DEV' | 'PROD';

const getStage = (): Stage | undefined => {
	const stage = process.env.Stage;
	if (stage === undefined) {
		throw new Error('Stage is not defined as an environment variable');
	}
	return stage as Stage;
};

export async function putMetric(metricName: string): Promise<void> {
	const stage = getStage();
	if (stage == 'DEV') {
		console.log('No metrics sent as running local test');
		return;
	}

	const cloudwatch = new CloudWatchClient({
		region: process.env.AWS_REGION ?? 'eu-west-1',
	});

	const dimensions: Dimension[] = [
		{
			Name: 'App',
			Value: process.env.App,
		},
		{
			Name: 'Stage',
			Value: stage,
		},
	];

	const params: PutMetricDataCommandInput = {
		Namespace: `support-service-lambdas`,
		MetricData: [
			{
				MetricName: metricName,
				Value: 1,
				Unit: 'Count',
				Dimensions: dimensions,
			},
		],
	};

	const command = new PutMetricDataCommand(params);

	await cloudwatch.send(command);
}
