import { getIfDefined } from '@modules/nullAndUndefined';

// todo if we change to get config from SSM, then it's easier to run in DEV
export const getConfig = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);
