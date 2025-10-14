import { handlerWithStage } from '../src/indexScheduled';
import dayjs from 'dayjs';
import { loadLazyConfig } from '@modules/aws/appConfig';
import { ConfigSchema } from '../src/configSchema';

// to run this, get credentials for membership/targeting/mobile
// the output will go to chat channel P&E/SR Alarms CODE
loadLazyConfig(ConfigSchema)({
	stage: 'CODE',
	stack: 'support',
	app: 'alarms-handler',
})
	.then(async ({ stage, appConfig, accountIds }) =>
		handlerWithStage(
			dayjs(),
			stage,
			await appConfig.get(),
			await accountIds.get(),
		),
	)
	.then(console.log);
