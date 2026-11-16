/*
 * OpenAPI descriptions of REST API Gateway failures, not Lambda responses.
 * Gateway-managed bodies are deliberately unspecified: they are not governed
 * by the application's JSON error schema. This documents existing infrastructure
 * behaviour; it does not configure Gateway Responses or add authentication.
 * API-key rejection is 403, not the 401 used by optional authorizers.
 * https://docs.aws.amazon.com/apigateway/latest/developerguide/supported-gateway-response-types.html
 * https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-errors.html
 */
export const apiGatewayResponses = {
	403: {
		description:
			'[API Gateway] API key rejected or access to the requested resource denied.',
	},
	413: {
		description: '[API Gateway] Request exceeds the payload limit.',
	},
	429: {
		description:
			'[API Gateway] Request throttled or a configured usage-plan quota exceeded.',
	},
	502: {
		description: '[API Gateway] Could not obtain a valid Lambda response.',
	},
	504: {
		description:
			'[API Gateway] Integration failed or timed out; the operation outcome may be uncertain.',
	},
};
