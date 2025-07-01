import { getIfDefined } from '@modules/nullAndUndefined';
import { loadConfig } from '@modules/aws/appConfig';
import { z } from 'zod';

const appConfigSchema = z.object({
    workspace: z.object({
        key: z.string(),
        secret: z.string(),
    }),
    inputPlatform: z.object({
        key: z.string(),
        secret: z.string(),
    }),
    ophanErasureQueueUrl: z.string(),
    apiGatewayUrl: z.string(),
});
type AppConfig = z.infer<typeof appConfigSchema>;

const getEnv = (env: string): string =>
    getIfDefined(process.env[env], `${env} environment variable not set`);

let appConfig: AppConfig | undefined = undefined;
export async function getAppConfig(): Promise<AppConfig> {
    if (!appConfig) {
        const stage = getEnv('STAGE');
        const stack = getEnv('STACK');
        const app = getEnv('APP');
        appConfig = await loadConfig(stage, stack, app, appConfigSchema);
    }
    return appConfig;
}