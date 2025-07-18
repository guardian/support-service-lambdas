import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { awsConfig } from '@modules/aws/config';
import { getAllAlarmsInAlarm } from '../src/cloudwatch';

//should be able to extract the alarms from AWS if you have membership credentials
getAllAlarmsInAlarm({ defaultClient: new CloudWatchClient(awsConfig) }).then(
	console.log,
);
