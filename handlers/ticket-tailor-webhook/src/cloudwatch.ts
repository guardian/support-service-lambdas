import { CloudWatchClient, Dimension, PutMetricDataCommand, PutMetricDataCommandInput } from '@aws-sdk/client-cloudwatch';
import { stageFromEnvironment, Stage } from '@modules/stage';
import * as process from "process";

export async function putMetric(metricName: string): Promise<void> {
    console.log('putting metric... metricName:',metricName);

    const stage: Stage = stageFromEnvironment();
    const cloudwatch = new CloudWatchClient({ region: process.env.AWSREGION });

    const dimensions: Dimension[] = [{
        Name:"Stage",
        Value:process.env.STAGE
    }];

    const params: PutMetricDataCommandInput = {
        Namespace: `ticket-tailor-webhook-${stage}`,
        MetricData: [
            {
                MetricName: metricName,
                Value: 1,
                Unit: 'Count',
                Dimensions: dimensions
            },
        ],

    };

    const command = new PutMetricDataCommand(params);

    await cloudwatch.send(command);
}