import { ValidationError } from '@modules/errors';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { IdentityUserDetails } from '@modules/identity/identity';
import {
	ExpiredTokenError,
	InvalidScopesError,
	InvalidTokenError,
	OktaTokenHelper,
} from '@modules/identity/identity';

type SuccessfulAuthentication = {
	type: 'success';
	userDetails: IdentityUserDetails;
};

type FailedAuthentication = {
	type: 'failure';
	response: APIGatewayProxyResult;
};

type AuthenticationResult = SuccessfulAuthentication | FailedAuthentication;

export class IdentityApiGatewayAuthenticator {
	tokenHelper: OktaTokenHelper;
	constructor(stage: Stage, requiredScopes: string[]) {
		this.tokenHelper = new OktaTokenHelper(stage, requiredScopes);
	}

	async authenticate(
		event: APIGatewayProxyEvent,
	): Promise<AuthenticationResult> {
		const authHeader = event.headers.Authorization;
		if (!authHeader) {
			console.log('No Authorization header provided in request', event);
			return {
				type: 'failure',
				response: {
					statusCode: 401,
					body: JSON.stringify({ message: 'No Authorization header provided' }),
				},
			};
		}
		try {
			const userDetails = await this.tokenHelper.getIdentityId(authHeader);
			console.log(
				`Successfully authenticated user with identityId: ${userDetails.identityId}`,
			);
			return {
				type: 'success',
				userDetails,
			};
		} catch (error) {
			console.log('Caught exception with message: ', error);
			if (error instanceof ExpiredTokenError) {
				return {
					type: 'failure',
					response: {
						body: 'Token has expired',
						statusCode: 401,
					},
				};
			}
			if (error instanceof InvalidTokenError) {
				return {
					type: 'failure',
					response: {
						body: 'Token is invalid',
						statusCode: 401,
					},
				};
			}
			if (error instanceof InvalidScopesError) {
				return {
					type: 'failure',
					response: {
						body: 'Token does not have the required scopes',
						statusCode: 403,
					},
				};
			}
			if (error instanceof ValidationError) {
				return {
					type: 'failure',
					response: {
						body: error.message,
						statusCode: 403,
					},
				};
			}
			return {
				type: 'failure',
				response: {
					body: 'Internal server error',
					statusCode: 500,
				},
			};
		}
	}
}

export const buildAuthenticate = (
	stage: Stage,
	requiredScopes: string[],
): ((event: APIGatewayProxyEvent) => Promise<AuthenticationResult>) => {
	// We only build one of these instances, the function returned below closes
	// over the instance and uses it each time it is invoked.
	const authenticator = new IdentityApiGatewayAuthenticator(
		stage,
		requiredScopes,
	);
	console.log(
		`Created an IdentityApiGatewayAuthenticator instance. Stage: ${stage}. Scopes: ${requiredScopes.join(', ')}.`,
	);

	const authenticate = (event: APIGatewayProxyEvent) =>
		authenticator.authenticate(event);

	return authenticate;
};
