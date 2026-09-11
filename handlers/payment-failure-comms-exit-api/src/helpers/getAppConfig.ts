import { loadConfig } from '@modules/aws/appConfig';
import { appConfigSchema } from '../schemas/appConfigSchema';
import type { AppConfig } from '../types/appConfig';
import { getEnvironmentVariable } from './getEnvironmentVariable';

export const getAppConfig = (): Promise<AppConfig> =>
	loadConfig(
		getEnvironmentVariable('STAGE'),
		getEnvironmentVariable('STACK'),
		getEnvironmentVariable('APP'),
		appConfigSchema,
	);
