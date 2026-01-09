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
export const metricNamespace = 'support-service-lambdas';

export async function putMetric(
	metricName: string,
	stage: string,
): Promise<void> {
	const cloudwatch = new CloudWatchClient({
		region: process.env.AWS_REGION ?? 'eu-west-1',
	});

	const dimensions: Dimension[] = [
		{
			Name: 'App',
			Value: process.env.APP,
		},
		{
			Name: 'Stage',
			Value: stage,
		},
	];

	const params: PutMetricDataCommandInput = {
		Namespace: metricNamespace,
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
