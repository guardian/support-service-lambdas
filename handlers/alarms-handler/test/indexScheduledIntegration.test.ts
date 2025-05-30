import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { awsConfig } from '@modules/aws/config';
import { getAllAlarmsInAlarm } from '../src/cloudwatch';

/**
 * Lets you exercise the side effects locally
 *
 * @group integration
 */
it('should be able to extract the alarms from AWS if you have membership credentials', async () => {
	const alarms = await getAllAlarmsInAlarm({
		defaultClient: new CloudWatchClient(awsConfig),
	});
	console.log('alarms', alarms);
});
