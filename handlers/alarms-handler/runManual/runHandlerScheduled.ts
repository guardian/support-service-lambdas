import { handlerWithStage } from '../src/indexScheduled';
import dayjs from 'dayjs';
import { loadAccountIds, loadConfig } from '@modules/aws/appConfig';
import { ConfigSchema } from '../src/configSchema';

// to run this, get credentials for membership/trageting/mobile
// the output will go to chat channel P&E/SR Alarms CODE
Promise.all([
	loadConfig('CODE', 'support', 'alarms-handler', ConfigSchema),
	loadAccountIds(),
])
	.then(([config, accountIds]) =>
		handlerWithStage(dayjs(), 'CODE', config, accountIds),
	)
	.then(console.log);
