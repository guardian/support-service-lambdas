import { z } from 'zod';

export type ApiOutcome =
	| { kind: 'success'; identityId: string | null; rawBody: string }
	| { kind: 'rejected'; reason: string; httpStatus: number }
	| { kind: 'error'; reason: string; httpStatus: number | null };

export type ApiConfig = {
	url: string;
	apiKey: string;
};

export async function callBackfill(
	config: ApiConfig,
	emailAddress: string,
	dryRun: boolean,
	maxRetries = 3,
): Promise<ApiOutcome> {
	const params = new URLSearchParams({
		apiClientId: 'identity-backfill-batch',
		apiToken: 'batch',
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
			const backoffMs = 500 * Math.pow(2, attempt - 1);
			await sleep(backoffMs);
		}
	}

	return {
		kind: 'error',
		reason: lastError.reason,
		httpStatus: lastError.status,
	};
}

const responseBodySchema = z.object({ message: z.string().optional() });

function extractMessage(text: string): string {
	try {
		const obj = responseBodySchema.parse(JSON.parse(text));
		return obj.message ?? text.slice(0, 300);
	} catch {
		return text.slice(0, 300);
	}
}

function extractIdentityId(body: string): string | null {
	const match = body.match(/identity\s*id[^"]*"\s*:\s*"([^"]+)"/i);
	return match?.[1] ?? null;
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
