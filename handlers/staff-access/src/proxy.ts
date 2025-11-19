import { filterKeys } from '@modules/arrayFunctions';
import type { Lazy } from '@modules/lazy';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { CognitoClient } from './cognitoClient';
import { cookieName } from './oAuth2CallbackHandler';
import type { UpstreamApiTarget } from './upstreamApiClient';
import { UpstreamApiClient } from './upstreamApiClient';

function getCookies(headers: Record<string, string | undefined>) {
	const normalised = Object.fromEntries(
		Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
	);
	const rawCookies = normalised.cookie ?? '';
	const cookies: Record<string, string> = Object.fromEntries(
		rawCookies.split(';').map((c) => {
			const [name, ...rest] = c.split('=');
			const value = rest.join('=');
			return [(name ?? '').trim(), value.trim()];
		}),
	);
	return cookies;
}

const allowedHeaders = new Set(['content-type', 'content-length']);

export function proxyHandler(
	services: Lazy<{ stage: Stage; cognitoClient: CognitoClient }>,
) {
	return async (
		event: APIGatewayProxyEvent,
		parsed: { path: UpstreamApiTarget },
	): Promise<APIGatewayProxyResult> => {
		const userRequestedPath =
			parsed.path.targetApp + '/' + parsed.path.targetPath;

		const cognitoRedirect = (
			await services.get()
		).cognitoClient.createCognitoRedirect(userRequestedPath);

		const auth = getCookies(event.headers)[cookieName];

		if (auth === undefined) {
			return cognitoRedirect(
				`No ${cookieName} cookie found, redirecting to Cognito for google auth`,
			);
		}

		const upstreamClient = new UpstreamApiClient(
			(await services.get()).stage,
			parsed.path.targetApp,
			auth,
		);

		const { statusCode, headers, body } = await upstreamClient.getResource(
			parsed.path.targetPath,
		);
		if (statusCode === 401 || statusCode === 403) {
			return cognitoRedirect('auth error from upstream');
		}
		return {
			statusCode,
			headers: {
				...filterKeys(headers, allowedHeaders.has.bind(allowedHeaders)),
				'Cache-Control': headers['cache-control'] ?? 'max-age=60',
			},
			body,
		};
	};
}
