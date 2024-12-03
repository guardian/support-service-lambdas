import { ValidationError } from '@modules/errors';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
	ExpiredTokenError,
	InvalidScopesError,
	InvalidTokenError,
	OktaTokenHelper,
} from '@modules/identity/identity';

export type AuthenticatedApiGatewayEvent = APIGatewayProxyEvent & {
	type: 'AuthenticatedApiGatewayEvent';
	identityId: string;
};

export type FailedAuthenticationResponse = APIGatewayProxyResult & {
	type: 'FailedAuthenticationResponse';
};

export class IdentityApiGatewayAuthenticator {
	tokenHelper: OktaTokenHelper;
	constructor(stage: Stage, requiredScopes: string[]) {
		this.tokenHelper = new OktaTokenHelper(stage, requiredScopes);
	}

	async authenticate(
		event: APIGatewayProxyEvent,
	): Promise<AuthenticatedApiGatewayEvent | FailedAuthenticationResponse> {
		const authHeader = event.headers.Authorization;
		if (!authHeader) {
			console.log('No Authorization header provided in request', event);
			return {
				type: 'FailedAuthenticationResponse',
				statusCode: 401,
				body: JSON.stringify({ message: 'No Authorization header provided' }),
			};
		}
		try {
			const identityId = await this.tokenHelper.getIdentityId(authHeader);
			console.log(
				`Successfully authenticated user with identityId: ${identityId}`,
			);
			return {
				type: 'AuthenticatedApiGatewayEvent',
				...event,
				identityId,
			};
		} catch (error) {
			console.log('Caught exception with message: ', error);
			if (error instanceof ExpiredTokenError) {
				return {
					type: 'FailedAuthenticationResponse',
					body: 'Token has expired',
					statusCode: 401,
				};
			}
			if (error instanceof InvalidTokenError) {
				return {
					type: 'FailedAuthenticationResponse',
					body: 'Token is invalid',
					statusCode: 401,
				};
			}
			if (error instanceof InvalidScopesError) {
				return {
					type: 'FailedAuthenticationResponse',
					body: 'Token does not have the required scopes',
					statusCode: 403,
				};
			}
			if (error instanceof ValidationError) {
				return {
					type: 'FailedAuthenticationResponse',
					body: error.message,
					statusCode: 403,
				};
			}
			return {
				type: 'FailedAuthenticationResponse',
				body: 'Internal server error',
				statusCode: 500,
			};
		}
	}
}
