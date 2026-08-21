import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Context,
} from 'aws-lambda';
import { mapPartition, mapValues, zipAll } from '@modules/arrayFunctions';
import { getCallerInfo } from '@modules/logger/getCallerInfo';
import { logger } from '@modules/logger/logger';
import { objectEntries } from '@modules/objectFunctions';
import { buildErrorResponse } from '@modules/routing/apiGatewayResponses';

export type HttpMethod =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'DELETE'
	| 'PATCH'
	| 'OPTIONS'
	| 'HEAD';

/**
 * The remaining time for the request, bounded by both API Gateway and Lambda.
 */
export type RequestContext = {
	getRemainingTimeInMillis: () => number;
};

/**
 * API Gateway REST integrations have a 29 second limit.
 * https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-execution-service-limits-table.html
 */
const maximumApiGatewayRequestDurationInMilliseconds = 29_000;
const apiGatewayResponseMarginInMilliseconds = 1_000;

export type Handler<E, TPath, TBody> = (
	event: E,
	path: TPath,
	body: TBody,
	context?: RequestContext,
) => Promise<APIGatewayProxyResult>;

export type Route<TPath, TBody> = {
	httpMethod: HttpMethod;
	path: string;
	handler: Handler<APIGatewayProxyEvent, TPath, TBody>;
};

export const NotFoundResponse = {
	body: 'Not Found',
	statusCode: 404,
};

/**
 * if routeParts ends with a greedy `+`, batch together the last eventsParts accordingly
 */
export function zipRouteWithEventPath(
	routeParts: string[],
	eventParts: string[],
) {
	const lastRoutePart: string | undefined = routeParts[routeParts.length - 1];
	const routeIsGreedy = lastRoutePart?.endsWith('+}');
	let adjustedEventParts;
	let adjustedRouteParts;
	if (lastRoutePart && routeIsGreedy && routeParts.length < eventParts.length) {
		const excessParts = eventParts.slice(routeParts.length - 1);
		const joinedGreedyValue = excessParts.join('/');
		adjustedEventParts = [
			...eventParts.slice(0, routeParts.length - 1),
			joinedGreedyValue,
		];
		const adjustedLastRoutePart = lastRoutePart.replace(/\+}/, '}');
		adjustedRouteParts = [
			...routeParts.slice(0, routeParts.length - 1),
			adjustedLastRoutePart,
		];
	} else if (routeParts.length === eventParts.length) {
		adjustedEventParts = eventParts;
		adjustedRouteParts = routeParts;
	} else {
		return undefined;
	}
	return zipAll(adjustedRouteParts, adjustedEventParts, '', '');
}

function matchPath(
	routePath: string,
	eventPath: string,
): { params: Record<string, string> } | undefined {
	const routeParts = routePath.split('/').filter(Boolean);
	const eventParts = eventPath.split('/').filter(Boolean);

	const routeEventPairs = zipRouteWithEventPath(routeParts, eventParts);
	if (routeEventPairs === undefined) {
		return undefined;
	}

	const [matchers, literals] = mapPartition(
		routeEventPairs,
		([routePart, eventPart]) => {
			const maybeParamName = routePart.match(/^\{(.*)}$/)?.[1];
			return maybeParamName
				? ([maybeParamName, eventPart] as const)
				: undefined;
		},
	);
	if (literals.some(([routePart, eventPart]) => routePart !== eventPart)) {
		return undefined;
	}
	return { params: Object.fromEntries(matchers) };
}

export function Router(
	routes: ReadonlyArray<Route<Record<string, string>, string | null>>,
) {
	const callerInfo = getCallerInfo();
	const httpRouter = async (
		event: APIGatewayProxyEvent,
		context?: Context,
	): Promise<APIGatewayProxyResult> => {
		const requestDeadline =
			Date.now() +
			maximumApiGatewayRequestDurationInMilliseconds -
			apiGatewayResponseMarginInMilliseconds;
		const requestContext: RequestContext = {
			getRemainingTimeInMillis: () =>
				Math.min(
					requestDeadline - Date.now(),
					context?.getRemainingTimeInMillis() ?? Number.POSITIVE_INFINITY,
				),
		};
		try {
			for (const route of routes) {
				const matchResult = matchPath(route.path, event.path);
				if (
					route.httpMethod.toUpperCase() === event.httpMethod.toUpperCase() &&
					matchResult
				) {
					const eventWithParams = {
						...event,
						pathParameters: {
							...mapValues(event.pathParameters ?? {}, (v) => v ?? ''),
							...matchResult.params,
						},
					};

					return await route.handler(
						eventWithParams,
						eventWithParams.pathParameters,
						eventWithParams.body,
						requestContext,
					);
				}
			}
			logger.log(`No route found for ${event.httpMethod} ${event.path}`);
			return NotFoundResponse;
		} catch (error) {
			return buildErrorResponse(error);
		}
	};

	return logger.withContext(
		logger.wrapFn(
			httpRouter,
			undefined,
			callerInfo,
			([
				{
					httpMethod,
					path,
					pathParameters,
					queryStringParameters,
					body,
					headers,
				},
			]) => ({
				logOnEntryAndExit: `${httpMethod} ${path}`,
				logOnEntryOnly: [
					{
						pathParameters,
						body,
						queryStringParameters,
						headers: objectEntries(headers).filter(
							([key]) =>
								!key.startsWith('CloudFront-') && !key.startsWith('X-Amz-'),
						),
					},
				],
			}),
		),
		undefined,
		true,
	);
}
