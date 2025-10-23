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
		const cognitoRedirect = (
			await services.get()
		).cognitoClient.createCognitoRedirect(undefined);
		if (!event.queryStringParameters?.code) {
			return cognitoRedirect('no code in url params');
		}
		logger.log(
			'got a code, need to check it with cogito and set a cookie',
			event.queryStringParameters.code,
		);
		const result = await (
			await services.get()
		).cognitoClient.getToken(event.queryStringParameters.code);
		logger.log('token response', result);
		const auth = (
			JSON.parse(result.body) as { id_token: string; access_token: string }
		).id_token; //TODO types (currently use id_token because we're not using scopes)

		// carefully redirect to original url

		const ourBaseUrl = getAppBaseUrl((await services.get()).stage, app);
		// note - this state has potentially come from an untrusted source
		const untrustedRelativePath = event.queryStringParameters.state;
		const Location = untrustedRelativePath
			? ourBaseUrl + '/' + untrustedRelativePath
			: undefined;
		return {
			statusCode: Location ? 302 : 200,
			headers: {
				...(Location ? { Location } : {}),
				'Cache-Control': 'no-cache, private',
				'Set-Cookie': cookieName + '=' + auth, // TODO set params correctly eg secure, httpOnly, expiry
			},
			body:
				'Successfully logged in - ' +
				(Location ?? 'no onwards redirect url in the state'),
		} as APIGatewayProxyResult;
	};
}
