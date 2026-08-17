import { z } from 'zod';
import { loadConfig } from '@modules/aws/appConfig';
import type { Stage } from '@modules/stage';
import { APP, STACK } from './constants';

/**
 * Read from `/<STAGE>/support/scrub-non-tokenised-payment-methods/`, the
 * standard config path. GuCDK grants the lambda read access to it for free, so
 * there is no policy to write, and zod fails the run loudly if anything is
 * missing rather than letting an undefined through to the GCP client.
 */
const configSchema = z.object({
	gcpCredentialsConfig: z.string().min(1),
});

export type AppConfig = z.infer<typeof configSchema>;

export const getAppConfig = (stage: Stage): Promise<AppConfig> =>
	loadConfig(stage, STACK, APP, configSchema);
