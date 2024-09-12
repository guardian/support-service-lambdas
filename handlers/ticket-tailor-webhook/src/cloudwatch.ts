import * as process from 'process';
import type {
	Dimension,
	PutMetricDataCommandInput,
} from '@aws-sdk/client-cloudwatch';
import {
	CloudWatchClient,
	PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
import { stageFromEnvironment } from '@modules/stage';

export async function putMetric(metricName: string): Promise<void> {
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
			Value: stageFromEnvironment(),
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
