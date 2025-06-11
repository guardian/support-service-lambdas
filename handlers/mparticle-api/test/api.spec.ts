import type {
    APIGatewayProxyEvent,
    APIGatewayProxyEventHeaders,
    Callback,
    Context
} from 'aws-lambda';
import { handler } from '../src/index';

describe('mparticle-api API tests', () => {
    const originalEnv = process.env;

    // Mock fetch before each test
    beforeEach(() => {
        jest.resetModules();
        global.fetch = jest.fn();
        process.env = {
            ...originalEnv,
            Stage: "CODE",
            MPARTICLE_WORKSPACE_KEY: 'MPARTICLE_WORKSPACE_KEY',
            MPARTICLE_WORKSPACE_SECRET: 'MPARTICLE_WORKSPACE_SECRET',
            MPARTICLE_INPUT_PLATFORM_KEY: 'MPARTICLE_INPUT_PLATFORM_KEY',
            MPARTICLE_INPUT_PLATFORM_SECRET: 'MPARTICLE_INPUT_PLATFORM_SECRET'
        };
        jest.spyOn(console, 'info').mockImplementation(() => { });
    });

    // Clean up after each test
    afterEach(() => {
        jest.restoreAllMocks();
        process.env = originalEnv;
    });

    const run = async ({
        httpMethod,
        path,
        body,
        headers
    }: {
        httpMethod: 'GET' | 'POST';
        path: string;
        body?: string;
        headers?: APIGatewayProxyEventHeaders;
    }): Promise<{
        statusCode: number;
        body: string;
    }> => {
        const result: unknown = await handler({
            httpMethod,
            path,
            body,
            headers: headers ?? {},
        } as APIGatewayProxyEvent, {} as Context, (() => { }) as Callback<unknown>);
        return result as { statusCode: number; body: string };
    };

    it('Register an event', async () => {
        const mockRegisterEventResponse = {
            ok: true,
            status: 201,
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockRegisterEventResponse);

        const result = await run({
            httpMethod: 'POST',
            path: '/events',
            body: JSON.stringify({
                events: [
                    {
                        data: {
                            "custom_event_type": "other",
                            "event_name": "Test Event from mParticle API",
                            "timestamp_unixtime_ms": new Date().getTime(),
                            "session_uuid": "CAEDD89B-3B57-479D-A764-A96C3584E10D",
                            "session_start_unixtime_ms": new Date().getTime(),
                            "custom_attributes": {
                                "product_id": "128115",
                                "quantity": 1,
                                "color": "",
                                "size": ""
                            },
                            "location": null,
                            "source_message_id": "81b9a749-a5c7-4823-afb6-9f50d47e0b27"
                        },
                        eventType: "custom_event"
                    }
                ],
                deviceInfo: {},
                userAttributes: {},
                deletedUserAttributes: [],
                userIdentities: {
                    "email": "andre.silva.mindera+1@theguardian.co.uk",
                    "customer_id": "mindera123+1"
                },
                applicationInfo: {},
                schemaVersion: 2,
                environment: "development",
                context: {},
                ip: "172.217.12.142"
            })
        })

        expect(result).toBeDefined();
        expect(result.statusCode).toBeDefined();
        expect(result.statusCode).toEqual(201);
    });

    it('Create Data Subject Requests', async () => {
        const mockSetUserAttributesResponse = {
            ok: true,
            status: 201,
        };
        const mockCreateDataSubjectRequestResponse = {
            ok: true,
            statusCode: 201,
            body: '{"expectedCompletionTime":"2025-06-30T00:00:00.000Z","receivedTime":"2025-06-11T14:54:14.581Z","requestId":"07410e1d-88d2-4c4f-a904-843a913bd488","controllerId":"1402"}'
        };
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce(mockSetUserAttributesResponse)
            .mockResolvedValueOnce(mockCreateDataSubjectRequestResponse);

        const result = await run({
            httpMethod: 'POST',
            path: '/data-subject-requests',
            body: JSON.stringify({
                regulation: "gdpr",
                requestId: "07410e1d-88d2-4c4f-a904-843a913bd488",
                requestType: "erasure",
                submittedTime: new Date(),
                userId: "mindera123+2",
                environment: "development",
            })
        })

        expect(result).toBeDefined();
        expect(result.statusCode).toBeDefined();
        expect(result.statusCode).toEqual(201);
        // TODO: Check match by request Id
    });

    it('Get Data Subject Request by Id', async () => {
        const mockGetSubjectRequestByIdResponse = {
            ok: true,
            status: 200,
            body: '{"expectedCompletionTime":"2025-06-30T00:00:00.000Z","requestId":"07410e1d-88d2-4c4f-a904-843a913bd488","controllerId":"1402","requestStatus":"pending","resultsUrl":null}'
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockGetSubjectRequestByIdResponse);

        const result = await run({
            httpMethod: 'GET',
            path: '/data-subject-requests/07410e1d-88d2-4c4f-a904-843a913bd488',
        })

        expect(result).toBeDefined();
        expect(result.statusCode).toBeDefined();
        expect(result.statusCode).toEqual(200);
        // TODO: Check match by request Id
        // TODO: Check match by request status
    });

    it('Handle Data Subject Request state callback', async () => {
        // TODO: Mock Discovery Call
        // TODO: Mock Certificate Download
        // TODO: Mock Queue message placement
        const mockRegisterEventResponse = {
            ok: true,
            status: 202,
            body: JSON.stringify({
                message: 'Callback accepted and processed',
                timestamp: new Date().toISOString()
            })
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockRegisterEventResponse);

        const result = await run({
            httpMethod: 'POST',
            path: '/events',
            body: JSON.stringify({
                "controller_id": "1402",
                "expected_completion_time": "2025-06-09T00:00:00Z",
                "status_callback_url": "https://webhook.site/6dfd0447-e1f9-4a98-a391-25481898763b",
                "subject_request_id": "475974fa-6b42-4370-bb56-b5d845686bb5",
                "request_status": "completed",
                "results_url": null,
                "extensions": null
            }),
            headers:
            {
                "x-opendsr-processor-domain": "opendsr.mparticle.com",
                "x-opendsr-signature": "q/zaWUW4dJYXo7Bu9NR0AkkwbS/lnab2cQ/6hxuhNw/8xnljzjXB3jJhUM7UTr5+KZZ5/delbtAKVNPXLAGZ7DoeWMnWwYeyq3Pzw4l5wugg3YtFLS5o0MRlGye6Vj0UH2c/T8vQ87/KNl5hYrhYqrZvNb+f+gL9eSZ80lQwMu27fVSrnh7yztNLHLP593kV9oq1QBXQqf8yRVGy7fcFieNHtgYAuKFJeDkCwx7e4ismhKNkfM8Xlt6TEdR8dAwB6TVbz3W7bk4dTUKQrAVX84js4V5Sphj+vUBT/NATel6HYlkSsOk10HLjbaM2BwQtd51rD6ex9VbtpP0G8mHDVw==",
            }
        })

        expect(result).toBeDefined();
        expect(result.statusCode).toBeDefined();
        expect(result.statusCode).toEqual(202);
        // TODO: Check match for body message
    });
});