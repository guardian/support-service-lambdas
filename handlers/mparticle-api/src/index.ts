import { createRoute, Router } from '@modules/routing/router';
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

const routerHandler = <TPath, TBody>(fn: (event: APIGatewayProxyEvent, parsed: { path: TPath; body: TBody }) => Promise<APIGatewayProxyResult>) =>
    async (event: APIGatewayProxyEvent, parsed: { path: TPath; body: TBody }): Promise<APIGatewayProxyResult> => {
        try {
            return await fn(event, parsed);
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
    createRoute<unknown, DataSubjectRequestForm>({
        httpMethod: 'POST',
        path: '/data-subject-requests',
        handler: routerHandler(async (event, parsed) => {
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
                        "dsr_erasure_date": parsed.body.submittedTime
                    },
                    userIdentities: {
                        "customer_id": parsed.body.userId
                    },
                    environment: parsed.body.environment
                });
            } catch (error) {
                console.warn("It was not possible to set the User Attribute to remove user from audiences or from event forwarding during the waiting period.", error)
            }

            // Request for Erasure
            const domain = event.headers['host'] ?? 'code.dev-theguardian.com'; // e.g., "abc123.lambda-url.region.on.aws" or API Gateway domain
            const protocol = event.headers['x-forwarded-proto'] ?? 'https';
            const lambdaDomainUrl = `${protocol}://${domain}`;
            const requestForErasureResult = await submitDataSubjectRequest(parsed.body, lambdaDomainUrl)

            return {
                statusCode: 201,
                body: JSON.stringify(requestForErasureResult),
            };
        }),
        parser: {
            body: z.object({
                regulation: z.enum(['gdpr', 'ccpa']),
                requestId: z.string().uuid(),
                requestType: z.enum(['access', 'portability', 'erasure']),
                submittedTime: z.string().datetime(),
                userId: z.string(),
                environment: z.enum(['production', 'development']),
            })
        }
    }),
    createRoute<{ requestId: string; }, unknown>({
        httpMethod: 'GET',
        path: '/data-subject-requests/{requestId}',
        handler: routerHandler(async (event, parsed) => {
            return {
                statusCode: 200,
                body: JSON.stringify(await getStatusOfDataSubjectRequest(parsed.path.requestId))
            };
        }),
        parser: {
            path: z.object({
                requestId: z.string().uuid(),
            })
        }
    }),
    createRoute<{ requestId: string; }, DataSubjectRequestCallback>({
        httpMethod: 'POST',
        path: '/data-subject-requests/{requestId}/callback',
        handler: routerHandler(async (event, parsed) => {
            const callbackValidationResult = await validateDataSubjectRequestCallback(event.headers['x-opendsr-processor-domain'], event.headers['x-opendsr-signature'], event.body);
            if (!callbackValidationResult) {
                return {
                    statusCode: 401,
                    body: 'Data Subject Request Callback validation failed.',
                };
            }

            return {
                statusCode: 202,
                body: JSON.stringify(await processDataSubjectRequestCallback(parsed.path.requestId, parsed.body))
            };
        }),
        parser: {
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
                extensions: z.record(z.object({
                    domain: z.string(),
                    name: z.string(),
                    status: z.enum(['pending', 'skipped', 'sent', 'failed']),
                    status_message: z.string()
                })).nullable(),
                group_id: z.string().nullable().optional()
            })
        }
    }),
    createRoute<unknown, EventBatch>({
        httpMethod: 'POST',
        path: '/events',
        handler: routerHandler(async (event, parsed) => {
            return {
                statusCode: 201,
                body: JSON.stringify(await uploadAnEventBatch(parsed.body)),
            };
        }),
        parser: {
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
                environment: z.enum(['production', 'development']),
                context: z.record(z.string(), z.unknown()),
                ip: z.string(),
            })
        }
    })
]);

export const handler: Handler = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    return router.routeRequest(event);
};
