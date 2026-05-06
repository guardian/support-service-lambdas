import type { IApiConfig } from '../interfaces';
import type { Stage } from '../types';

export function loadConfig(stage: Stage): IApiConfig {
	const url = process.env[`IDENTITY_BACKFILL_URL_${stage}`];
	const apiKey = process.env[`IDENTITY_BACKFILL_API_KEY_${stage}`];
	if (!url || !apiKey) {
		throw new Error(
			`Missing env vars. Set IDENTITY_BACKFILL_URL_${stage} and IDENTITY_BACKFILL_API_KEY_${stage}.\n` +
				`See README for how to retrieve them via aws cli with the membership profile.`,
		);
	}
	return { url, apiKey };
}
