import { z } from 'zod';
import { loadConfig } from '@modules/aws/appConfig';
import { getSSMParam } from '@modules/aws/ssm';
import { getIfDefined } from '@modules/nullAndUndefined';

const publisherConfigSchema = z.object({
	mparticle: z.object({
		googleEnhancedConversionsConversionActionId: z.string().min(1),
	}),
});

export const configSchema = z.object({
	mparticle: publisherConfigSchema.shape.mparticle.extend({
		pod: z.string().min(1),
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

	const [publisherConfig, key, secret, pod] = await Promise.all([
		loadConfig(stage, stack, app, publisherConfigSchema),
		getSSMParam(`/${stage}/${stack}/mparticle-api/inputPlatform/key`),
		getSSMParam(`/${stage}/${stack}/mparticle-api/inputPlatform/secret`),
		getSSMParam(`/${stage}/${stack}/mparticle-api/pod`),
	]);

	return configSchema.parse({
		...publisherConfig,
		mparticle: {
			...publisherConfig.mparticle,
			pod,
			key,
			secret,
		},
	});
};
