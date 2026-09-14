import { getIfDefined } from '@modules/nullAndUndefined';

export const getEnvironmentVariable = (name: string): string =>
	getIfDefined(process.env[name], `${name} environment variable not set`);
