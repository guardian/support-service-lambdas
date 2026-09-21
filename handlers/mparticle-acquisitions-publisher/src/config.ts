import { z } from 'zod';
import { loadConfig } from '@modules/aws/appConfig';
import { getSSMParam } from '@modules/aws/ssm';
import { getIfDefined } from '@modules/nullAndUndefined';

export const DEFAULT_MPARTICLE_ENDPOINT =
	'https://s2s.eu1.mparticle.com/v2/events';

const publisherConfigSchema = z.object({
	mparticle: z.object({
		googleEnhancedConversionsConversionActionId: z.string().min(1),
		endpoint: z.string().url().optional().default(DEFAULT_MPARTICLE_ENDPOINT),
	}),
});

export const configSchema = z.object({
	mparticle: publisherConfigSchema.shape.mparticle.extend({
		apiKey: z.string().min(1),
		apiSecret: z.string().min(1),
	}),
});

export type AppConfig = z.infer<typeof configSchema>;

export const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);

export const getAppConfig = async (): Promise<AppConfig> => {
	const stage = getEnv('STAGE');
	const stack = getEnv('STACK');
	const app = getEnv('APP');

	const [publisherConfig, apiKey, apiSecret] = await Promise.all([
		loadConfig(stage, stack, app, publisherConfigSchema),
		getSSMParam(`/${stage}/${stack}/mparticle-api/inputPlatform/key`),
		getSSMParam(`/${stage}/${stack}/mparticle-api/inputPlatform/secret`),
	]);

	return configSchema.parse({
		...publisherConfig,
		mparticle: {
			...publisherConfig.mparticle,
			apiKey,
			apiSecret,
		},
	});
};
