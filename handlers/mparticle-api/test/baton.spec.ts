import { faker } from '@faker-js/faker';
import type { AppConfig } from '../src/utils/config';
import { invokeBatonRerHandler } from '../src/utils/invoke-baton-rer-handler';
import { BatonRerEventInitiateResponse } from '../src/routers/baton';

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
    getEnv: jest.fn(() => "CODE")
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


    it('Initiate Right to Erasure Request', async () => {
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

        const userId = faker.string.alphanumeric();
        const result = await invokeBatonRerHandler({
            requestType: 'RER',
            action: 'initiate',
            subjectId: userId,
            dataProvider: 'mparticlerer'
        })

        expect(result).toBeDefined();
        expect(result.requestType).toEqual("RER");
        expect(result.action).toEqual("initiate");
        expect(result.status).toEqual("pending");
        expect((result as BatonRerEventInitiateResponse).initiationReference).toEqual(requestId);
        expect(result.message).toBeDefined()
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('Get Right to Erasure Request Status', async () => {
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

        const result = await invokeBatonRerHandler({
            requestType: 'RER',
            action: "status",
            initiationReference: requestId
        });

        expect(result).toBeDefined();
        expect(result.requestType).toEqual("RER");
        expect(result.action).toEqual("status");
        expect(result.status).toEqual("pending");
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
});