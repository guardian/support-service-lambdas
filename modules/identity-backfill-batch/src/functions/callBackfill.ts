import {
	API_CLIENT_ID,
	API_TOKEN_PLACEHOLDER,
	DEFAULT_MAX_RETRIES,
	INITIAL_BACKOFF_MS,
} from '../constants';
import type { IApiConfig } from '../interfaces';
import type { ApiOutcome } from '../types';
import { extractIdentityId } from './extractIdentityId';
import { extractMessage } from './extractMessage';
import { sleep } from './sleep';

export async function callBackfill(
	config: IApiConfig,
	emailAddress: string,
	dryRun: boolean,
	maxRetries = DEFAULT_MAX_RETRIES,
): Promise<ApiOutcome> {
	const params = new URLSearchParams({
		apiClientId: API_CLIENT_ID,
		apiToken: API_TOKEN_PLACEHOLDER,
	});
	const url = `${config.url}?${params.toString()}`;
	const body = JSON.stringify({ emailAddress, dryRun });

	let lastError: { status: number | null; reason: string } = {
		status: null,
		reason: 'unknown',
	};

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': config.apiKey,
				},
				body,
			});
			const text = await response.text();
			const message = extractMessage(text);

			if (response.status === 200) {
				return {
					kind: 'success',
					identityId: extractIdentityId(text),
					rawBody: text,
				};
			} else if (response.status === 400 || response.status === 422) {
				return {
					kind: 'rejected',
					reason: message,
					httpStatus: response.status,
				};
			} else if (response.status >= 500) {
				lastError = { status: response.status, reason: message };
			} else {
				return {
					kind: 'error',
					reason: `unexpected http ${response.status}: ${message}`,
					httpStatus: response.status,
				};
			}
		} catch (err) {
			lastError = {
				status: null,
				reason: err instanceof Error ? err.message : String(err),
			};
		}

		if (attempt < maxRetries) {
			const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
			await sleep(backoffMs);
		}
	}

	return {
		kind: 'error',
		reason: lastError.reason,
		httpStatus: lastError.status,
	};
}
