import * as process from 'process';
import type {
	Dimension,
	PutMetricDataCommandInput,
} from '@aws-sdk/client-cloudwatch';
import {
	CloudWatchClient,
	PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
import type { Stage } from '@modules/stage';
import { stageFromEnvironment } from '@modules/stage';

export async function putMetric(metricName: string): Promise<void> {
	console.log('putting metric... metricName:', metricName);

	const stage: Stage = stageFromEnvironment();
	const cloudwatch = new CloudWatchClient({
		region: process.env.AWS_REGION ?? 'eu-west-1',
	});

	const dimensions: Dimension[] = [
		{
			Name: 'Stage',
			Value: process.env.STAGE,
		},
	];

	const params: PutMetricDataCommandInput = {
		Namespace: `ticket-tailor-webhook-${stage}`,
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
