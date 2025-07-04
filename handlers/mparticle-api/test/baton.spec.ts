import { faker } from '@faker-js/faker';
import type { DataSubjectRequestState } from '../interfaces/data-subject-request-state';
import type { DataSubjectRequestSubmission } from '../interfaces/data-subject-request-submission';
import type { AppConfig } from '../src/utils/config';
import { invokeHttpHandler } from '../src/utils/invoke-http-handler';

jest.mock('../src/utils/config', () => ({
    getAppConfig: jest.fn().mockResolvedValue({
        inputPlatform: {
            key: faker.string.nanoid(),
            secret: faker.string.nanoid(),
        },
        workspace: {
            key: faker.string.nanoid(),
            secret: faker.string.nanoid(),
        },
        pod: 'EU1'
    } as AppConfig),
    getEnv: jest.fn(()=> "CODE")
}));

describe('mparticle-api Baton tests', () => {
    // Mock fetch before each test
    beforeEach(() => {
        jest.resetModules();
        global.fetch = jest.fn();
    });

    // Clean up after each test
    afterEach(() => {
        jest.restoreAllMocks();
    });


    it('Create Data Subject Request', async () => {
        const requestId = faker.string.uuid();
        const submittedTime = new Date();
        const mockSetUserAttributesResponse = {
            ok: true,
            status: 202,
        };
        const mockCreateDataSubjectRequestResponse = {
            ok: true,
            statusCode: 202,
            json: () => ({
                expected_completion_time: faker.date.soon(),
                received_time: submittedTime,
                subject_request_id: requestId,
                controller_id: faker.string.numeric(),
            }),
        };
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce(mockSetUserAttributesResponse)
            .mockResolvedValueOnce(mockCreateDataSubjectRequestResponse);

        const result = await invokeHttpHandler({
            httpMethod: 'POST',
            path: '/data-subject-requests',
            body: JSON.stringify({
                regulation: "gdpr",
                requestId,
                requestType: "erasure",
                submittedTime,
                userId: faker.string.alphanumeric(),
                environment: "development",
            })
        })

        expect(result).toBeDefined();
        expect(result.statusCode).toBeDefined();
        expect(result.statusCode).toEqual(201);
        expect(global.fetch).toHaveBeenCalledTimes(2);

        const body = JSON.parse(result.body) as DataSubjectRequestSubmission;
        expect(body.requestId).toEqual(requestId);
    });

    it('Get Data Subject Request by Id', async () => {
        const requestId = faker.string.uuid();
        const mockGetSubjectRequestByIdResponse = {
            ok: true,
            status: 200,
            json: () => ({
                expected_completion_time: faker.date.soon(),
                subject_request_id: requestId,
                controller_id: faker.string.numeric(),
                request_status: 'in_progress',
                received_time: faker.date.recent(),
            }),
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce(mockGetSubjectRequestByIdResponse);

        const result = await invokeHttpHandler({
            httpMethod: 'GET',
            path: `/data-subject-requests/${requestId}`,
        })

        expect(result).toBeDefined();
        expect(result.statusCode).toBeDefined();
        expect(result.statusCode).toEqual(200);

        const body = JSON.parse(result.body) as DataSubjectRequestState;
        expect(body.requestId).toEqual(requestId);
        expect(body.requestStatus).toEqual("in-progress");
    });
});