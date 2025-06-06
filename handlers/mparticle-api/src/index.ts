import { Router } from '@modules/routing/router';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { z } from 'zod';
import type { DataSubjectRequestCallback } from '../interfaces/data-subject-request-callback';
import type { DataSubjectRequestForm } from '../interfaces/data-subject-request-form';
import type { EventBatch } from '../interfaces/event-batch';
import { getStatusOfDataSubjectRequest, processDataSubjectRequestCallback, submitDataSubjectRequest } from './apis/data-subject-requests';
import { uploadAnEventBatch } from './apis/events';
import { HttpError } from './http';
import { validateDataSubjectRequestCallback } from './utils/validate-data-subject-request-callback';

const routerHandler = (fn: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>) =>
	async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
		try {
			return await fn(event);
		} catch (err) {
			if (err instanceof HttpError) {
				console.error(`Http Error: ${err.statusCode} ${err.statusText}`, err.body);
				return {
					statusCode: err.statusCode,
					body: JSON.stringify(err.body)
				};
			}
			throw err;
		}
	};

const router = new Router([
	{
		httpMethod: 'POST',
		path: '/data-subject-requests',
		handler: routerHandler(async (event) => {
			let payload: unknown;
			try {
				payload = JSON.parse(event.body ?? '{}');
			} catch {
				return {
					statusCode: 400,
					body: 'Invalid JSON in request body',
				};
			}
			const payloadData = payload as DataSubjectRequestForm;

			/**
			 * If you wish to remove users from audiences or from event forwarding during the waiting period,
			 * set a user attribute and apply audience criteria and/or forwarding rules to exclude them.
			 * https://docs.mparticle.com/guides/data-subject-requests/#erasure-request-waiting-period
			 */
			try {
				await uploadAnEventBatch({
					userAttributes: {
						"dsr_erasure_requested": true,
						"dsr_erasure_status": "requested",
						"dsr_erasure_date": payloadData.submittedTime
					},
					userIdentities: {
						"customer_id": payloadData.userId
					},
					environment: "production"
				});
			} catch (error) {
				console.warn("It was not possible to set the User Attribute to remove user from audiences or from event forwarding during the waiting period.", error)
			}

			// Request for Erasure
			const domain = event.headers['host']; // e.g., "abc123.lambda-url.region.on.aws" or API Gateway domain
			const protocol = event.headers['x-forwarded-proto'] ?? 'https';
			const lambdaDomainUrl = `${protocol}://${domain}`;
			const requestForErasureResult = await submitDataSubjectRequest(payloadData, lambdaDomainUrl)

			return {
				statusCode: 201,
				body: JSON.stringify(requestForErasureResult),
			};
		}),
		validation: {
			body: z.object({
				regulation: z.enum(['gdpr', 'ccpa']),
				requestId: z.string().uuid(),
				requestType: z.enum(['access', 'portability', 'erasure']),
				submittedTime: z.date(),
				userId: z.string().email(),
			})
		}
	},
	{
		httpMethod: 'GET',
		path: '/data-subject-requests/{requestId}',
		handler: routerHandler(async (event) => {
			return {
				statusCode: 200,
				body: JSON.stringify(await getStatusOfDataSubjectRequest(event.pathParameters?.requestId ?? ''))
			};
		}),
		validation: {
			path: z.object({
				requestId: z.string().uuid(),
			})
		}
	},
	{
		httpMethod: 'POST',
		path: '/data-subject-requests/{requestId}/callback',
		handler: routerHandler(async (event) => {
			const callbackValidationResult = await validateDataSubjectRequestCallback(event.headers['x-opendsr-processor-domain'], event.headers['x-opendsr-signature'], event.body);
			if (!callbackValidationResult) {
				return {
					statusCode: 401,
					body: 'Data Subject Request Callback validation failed.',
				};
			}

			let payload: unknown;
			try {
				payload = JSON.parse(event.body ?? '{}');
			} catch {
				return {
					statusCode: 400,
					body: 'Invalid JSON in request body',
				};
			}

			return {
				statusCode: 202,
				body: JSON.stringify(await processDataSubjectRequestCallback(event.pathParameters?.requestId ?? '', payload as DataSubjectRequestCallback))
			};
		}),
		validation: {
			path: z.object({
				requestId: z.string().uuid(),
			}),
			body: z.object({
				controller_id: z.string(),
				expected_completion_time: z.string().datetime(),
				subject_request_id: z.string().uuid(),
				request_status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
				api_version: z.string().nullable().optional(),
				results_url: z.string().url().nullable(),
				extensions: z.array(z.object({
					domain: z.string(),
					name: z.string(),
					status: z.enum(['pending', 'skipped', 'sent', 'failed']),
					status_message: z.string(),
				})).nullable(),
			})
		}
	},
	{
		httpMethod: 'POST',
		path: '/events',
		handler: routerHandler(async (event) => {
			let payload: unknown;
			try {
				payload = JSON.parse(event.body ?? '{}');
			} catch {
				return {
					statusCode: 400,
					body: 'Invalid JSON in request body',
				};
			}

			return {
				statusCode: 201,
				body: JSON.stringify(await uploadAnEventBatch(payload as EventBatch)),
			};
		}),
		validation: {
			body: z.object({
				events: z.array(z.object({
					/** Custom data payload for the event */
					data: z.record(z.string(), z.unknown()),

					/** Type identifier for the event */
					eventType: z.string(),
				})),
				deviceInfo: z.record(z.string(), z.unknown()),
				userAttributes: z.record(z.string(), z.unknown()),
				deletedUserAttributes: z.array(z.string()),
				userIdentities: z.record(z.string(), z.unknown()),
				applicationInfo: z.record(z.string(), z.unknown()),
				schemaVersion: z.number(),
				environment: z.string(),
				context: z.record(z.string(), z.unknown()),
				ip: z.string(),
			})
		}
	},
]);

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	return router.routeRequest(event);
};
