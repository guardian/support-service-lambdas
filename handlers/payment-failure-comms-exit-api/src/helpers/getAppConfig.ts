import { loadConfig } from '@modules/aws/appConfig';
import { appConfigSchema } from '../schemas';
import type { AppConfig } from '../types';
import { getEnvironmentVariable } from './getEnvironmentVariable';

export const getAppConfig = (): Promise<AppConfig> =>
	loadConfig(
		getEnvironmentVariable('STAGE'),
		getEnvironmentVariable('STACK'),
		getEnvironmentVariable('APP'),
		appConfigSchema,
	);
