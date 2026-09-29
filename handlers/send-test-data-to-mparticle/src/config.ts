import { z } from 'zod';
import { loadConfig } from '@modules/aws/appConfig';

export const MPARTICLE_CONFIG_APP = 'mparticle-acquisitions-publisher';

export const configSchema = z.object({
	mparticle: z.object({
		pod: z.string().min(1),
		key: z.string().min(1),
		secret: z.string().min(1),
	}),
});

export type AppConfig = z.infer<typeof configSchema>;

export const getAppConfig = async (): Promise<AppConfig> => {
	return loadConfig('CODE', 'support', MPARTICLE_CONFIG_APP, configSchema);
};
