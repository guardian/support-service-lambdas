import type { Lazy } from '@modules/lazy';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { CognitoClient } from './cognitoClient';
import { app, getAppBaseUrl } from './getAppBaseUrl';

export const cookieName = 'GU_STAFF_AUTH';

export function oAuth2CallbackHandler(
	services: Lazy<{ stage: Stage; cognitoClient: CognitoClient }>,
) {
	return async (event: APIGatewayProxyEvent) => {
		// note - this state has potentially come from an untrusted source
		// however if they redirect elsewhere, the cookie won't be set
		const untrustedRelativePath = event.queryStringParameters?.state;
		if (!event.queryStringParameters?.code) {
			return (await services.get()).cognitoClient.createCognitoRedirect(
				untrustedRelativePath,
			)('no code in url params');
		}
		logger.log(
			'got a code, need to check it with cogito and set a cookie',
			event.queryStringParameters.code,
		);
		const result = await (
			await services.get()
		).cognitoClient.getToken(event.queryStringParameters.code);
		const auth = result.id_token; // currently use id_token because we're not using scopes

		const ourBaseUrl = getAppBaseUrl((await services.get()).stage, app);
		const Location = untrustedRelativePath
			? ourBaseUrl + '/' + untrustedRelativePath
			: undefined;
		const sendWithGetRequestsOnly = `SameSite=Lax`;
		const hideFromClientSide = `HttpOnly`;
		const setCookie = [
			`${cookieName}=${auth}`,
			'Secure',
			hideFromClientSide,
			sendWithGetRequestsOnly,
			'Path=/',
		];
		return {
			statusCode: Location ? 302 : 200,
			headers: {
				...(Location ? { Location } : {}),
				'Cache-Control': 'no-cache, private',
				'Set-Cookie': setCookie.join('; '),
			},
			body:
				'Successfully logged in - ' +
				(Location ?? 'no onwards redirect url in the state'),
		} satisfies APIGatewayProxyResult;
	};
}
