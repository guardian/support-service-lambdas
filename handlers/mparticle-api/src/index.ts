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

			const domain = event.headers['host']; // e.g., "abc123.lambda-url.region.on.aws" or API Gateway domain
			const protocol = event.headers['x-forwarded-proto'] ?? 'https';
			const lambdaDomainUrl = `${protocol}://${domain}`;

			return {
				statusCode: 201,
				body: JSON.stringify(await submitDataSubjectRequest(payload as DataSubjectRequestForm, lambdaDomainUrl)),
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
			/**
			 * Callback post made on completion of the Data Subject Request (DSR) by mParticle
			 * When a request changes status, including when a request is first created, mParticle sends a callback
			 * POST to all URLs specified in the status_callback_urls array of the request. Callbacks are queued
			 * and sent every 15 minutes.
			 * Callback requests are signed and issued over TLS. We must validate the authenticity of the request
			 * before parsing the request body.
			 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#callbacks
			 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#validating-a-callback-request
			 */

			// 1. Establish a whitelist of all processor domains that we will allow to issue callbacks.
			if (event.headers['x-opendsr-processor-domain'] !== "opendsr.mparticle.com") {
				return {
					statusCode: 401,
					body: 'Invalid Processor Domain',
				};
			}

			// 2. If the X-OpenDSR-Processor-Domain header value is in our whitelist, fetch the certificate. The
			// certificate URL is available as the value of "processor_certificate" in the /discovery response body.
			// The certificate can be cached for the lifetime of the certificate.
			// TODO

			// 3. Validate the certificate. This should be handled by a library. Certificate validation should confirm that:
			// 3.1 The certificate was issued by a trusted authority.
			// TODO

			// 3.2 The certificate was issued to the exact string given in the X-OpenDSR-Processor-Domain header value.
			// TODO
			
			// 3.3 The certificate has not expired.
			// TODO

			// 4. If the certificate is valid, use it to validate the X-OpenDSR-Signature header against the raw request
			// body. mParticle uses SHA256 RSA as a signing algorithm.
			// TODO

			// 5. Return a response with a 202 Accepted status header if all validations are successful. Return a response
			// with a 401 Unauthorized status header if the signature fails to validate or the processor domain is not
			// in your whitelist.
			// TODO

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
				group_id: z.string().nullable(),
				request_status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
				api_version: z.string(),
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
