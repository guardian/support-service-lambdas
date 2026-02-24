import { loadConfig } from '@modules/aws/appConfig';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { getEnv } from '@modules/routing/lambdaHandler';
import dayjs from 'dayjs';
import { ConfigSchema } from '../src/configSchema';
import { handlerWithStage } from '../src/indexScheduled';

// to run this, get credentials for membership/targeting/mobile
// and set TEST_WEBHOOK to your chat link
const testWebhook = getEnv('TEST_WEBHOOK');
loadConfig('CODE', 'support', 'alarms-handler', ConfigSchema)
	.then((config) => {
		const services: HandlerEnv<ConfigSchema> = {
			stage: 'PROD',
			now: () => dayjs(),
			config: {
				webhookUrls: {
					VALUE: testWebhook,
					GROWTH: testWebhook,
					SRE: testWebhook,
					PORTFOLIO: testWebhook,
					PLATFORM: testWebhook,
					ENGINE: testWebhook,
					PUZZLES: testWebhook,
				},
				accounts: config.accounts,
			},
		};
		return handlerWithStage(undefined, services);
	})
	.then(console.log)
	.catch(console.error);
