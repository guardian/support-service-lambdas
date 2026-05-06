import { ENV_API_KEY_PREFIX, ENV_URL_PREFIX } from '../constants';
import type { IApiConfig } from '../interfaces';
import type { Stage } from '../types';

export function loadConfig(stage: Stage): IApiConfig {
	const urlKey = `${ENV_URL_PREFIX}${stage}`;
	const apiKeyKey = `${ENV_API_KEY_PREFIX}${stage}`;
	const url = process.env[urlKey];
	const apiKey = process.env[apiKeyKey];
	if (!url || !apiKey) {
		throw new Error(
			`Missing env vars. Set ${urlKey} and ${apiKeyKey}.\n` +
				`See README for how to retrieve them via aws cli with the membership profile.`,
		);
	}
	return { url, apiKey };
}
