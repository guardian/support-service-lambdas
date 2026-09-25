import { z } from 'zod';
import { loadConfig } from '@modules/aws/appConfig';
import { getSSMParam } from '@modules/aws/ssm';
import { getIfDefined } from '@modules/nullAndUndefined';

// The mParticle data centre hosting our workspace. The Events API base URL is
// derived from it by @modules/mparticle/mparticleHttpClient.
export const DEFAULT_MPARTICLE_POD = 'eu1';

const publisherConfigSchema = z.object({
	mparticle: z.object({
		googleEnhancedConversionsConversionActionId: z.string().min(1),
		pod: z.string().min(1).optional().default(DEFAULT_MPARTICLE_POD),
	}),
});

export const configSchema = z.object({
	mparticle: publisherConfigSchema.shape.mparticle.extend({
		key: z.string().min(1),
		secret: z.string().min(1),
	}),
});

export type AppConfig = z.infer<typeof configSchema>;

export const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);

export const getAppConfig = async (): Promise<AppConfig> => {
	const stage = getEnv('STAGE');
	const stack = getEnv('STACK');
	const app = getEnv('APP');

	const [publisherConfig, key, secret] = await Promise.all([
		loadConfig(stage, stack, app, publisherConfigSchema),
		getSSMParam(`/${stage}/${stack}/mparticle-api/inputPlatform/key`),
		getSSMParam(`/${stage}/${stack}/mparticle-api/inputPlatform/secret`),
	]);

	return configSchema.parse({
		...publisherConfig,
		mparticle: {
			...publisherConfig.mparticle,
			key,
			secret,
		},
	});
};
