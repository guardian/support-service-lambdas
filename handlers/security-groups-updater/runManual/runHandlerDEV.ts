import dayjs from 'dayjs';
import { loadConfig } from '@modules/aws/appConfig';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { ConfigSchema } from '../src/configSchema';
import { handlerWithStage } from '../src/index';

// To run this locally you'll need CODE AWS credentials for the membership
// profile (e.g. via janus). This calls the real Fastly API and the real
// EC2 API against whichever security groups are configured for CODE, so
// make sure the CODE SSM config only references CODE/test security groups.
loadConfig('CODE', 'support', 'security-groups-updater', ConfigSchema)
	.then((config) => {
		const env: HandlerEnv<ConfigSchema> = {
			stage: 'CODE',
			now: () => dayjs(),
			config,
		};
		return handlerWithStage(undefined, env);
	})
	.then(() => console.log('done'))
	.catch(console.error);
