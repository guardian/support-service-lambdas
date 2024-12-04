import type { APIGatewayProxyEvent } from 'aws-lambda';

export const buildProxyEvent = (
	authHeader: string | undefined,
): APIGatewayProxyEvent => {
	const headers = authHeader !== undefined ? { Authorization: authHeader } : {};
	return {
		headers,
		body: '',
		httpMethod: 'GET',
		path: '/test',
		pathParameters: null,
		queryStringParameters: null,
		isBase64Encoded: false,
		multiValueHeaders: { null: undefined },
		multiValueQueryStringParameters: null,
		stageVariables: null,
		resource: '',
		requestContext: {
			resourceId: '',
			resourcePath: '',
			httpMethod: '',
			extendedRequestId: '',
			requestTime: '',
			accountId: '',
			apiId: '',
			authorizer: null,
			protocol: '',
			stage: '',
			path: '',
			requestId: '',
			requestTimeEpoch: 0,
			identity: {
				cognitoIdentityPoolId: '',
				accountId: '',
				cognitoIdentityId: '',
				caller: '',
				sourceIp: '',
				principalOrgId: '',
				accessKey: '',
				cognitoAuthenticationType: '',
				cognitoAuthenticationProvider: '',
				userArn: '',
				userAgent: '',
				user: '',
				apiKey: '',
				apiKeyId: '',
				clientCert: null,
			},
		},
	};
};
