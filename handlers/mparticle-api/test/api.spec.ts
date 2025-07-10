import * as fs from 'fs';
import * as path from 'path';
import type { SendMessageCommandInput } from '@aws-sdk/client-sqs';
import { SQSClient } from '@aws-sdk/client-sqs';
import { faker } from '@faker-js/faker';
import type { DataSubjectRequestState } from '../interfaces/data-subject-request-state';
import type { DataSubjectRequestSubmission } from '../interfaces/data-subject-request-submission';
import type { AppConfig } from '../src/config';
import { run } from '../src/utils/run';

jest.mock('@aws-sdk/client-sqs', () => {
	return {
		SQSClient: jest.fn().mockImplementation(() => ({
			send: jest.fn().mockResolvedValue({
				MessageId: 'mocked-message-id',
			}),
		})),
		SendMessageCommand: jest
			.fn()
			.mockImplementation((args: SendMessageCommandInput) => args),
	};
});

jest.mock('../src/config', () => ({
	getAppConfig: jest.fn().mockResolvedValue({
		inputPlatform: {
			key: faker.string.nanoid(),
			secret: faker.string.nanoid(),
		},
		workspace: {
			key: faker.string.nanoid(),
			secret: faker.string.nanoid(),
		},
		pod: 'EU1',
	} as AppConfig),
	getEnv: jest.fn(() => 'CODE'),
}));

describe('mparticle-api API tests', () => {
	// Mock fetch before each test
	beforeEach(() => {
		jest.resetModules();
		global.fetch = jest.fn();
	});

	// Clean up after each test
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('Register an event', async () => {
		const mockRegisterEventResponse = {
			ok: true,
			status: 202,
		};
		(global.fetch as jest.Mock).mockResolvedValueOnce(
			mockRegisterEventResponse,
		);

		const result = await run({
			httpMethod: 'POST',
			path: '/events',
			body: JSON.stringify({
				events: [
					{
						data: {
							custom_event_type: 'other',
							event_name: 'Test Event from mParticle API',
							timestamp_unixtime_ms: new Date().getTime(),
							session_uuid: faker.string.uuid(),
							session_start_unixtime_ms: new Date().getTime(),
							custom_attributes: {
								product_id: faker.string.numeric(),
								quantity: faker.number.int(),
							},
							location: null,
							source_message_id: faker.string.uuid(),
						},
						eventType: 'custom_event',
					},
				],
				deviceInfo: {},
				userAttributes: {},
				deletedUserAttributes: [],
				userIdentities: {
					email: faker.internet.email(),
					customer_id: faker.string.alphanumeric(),
				},
				applicationInfo: {},
				schemaVersion: 2,
				environment: 'development',
				context: {},
				ip: faker.internet.ipv4(),
			}),
		});

		expect(result).toBeDefined();
		expect(result.statusCode).toBeDefined();
		expect(result.statusCode).toEqual(201);
		expect(global.fetch).toHaveBeenCalledTimes(1);
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

		const result = await run({
			httpMethod: 'POST',
			path: '/data-subject-requests',
			body: JSON.stringify({
				regulation: 'gdpr',
				requestId,
				requestType: 'erasure',
				submittedTime,
				userId: faker.string.alphanumeric(),
				environment: 'development',
			}),
		});

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
		(global.fetch as jest.Mock).mockResolvedValueOnce(
			mockGetSubjectRequestByIdResponse,
		);

		const result = await run({
			httpMethod: 'GET',
			path: `/data-subject-requests/${requestId}`,
		});

		expect(result).toBeDefined();
		expect(result.statusCode).toBeDefined();
		expect(result.statusCode).toEqual(200);

		const body = JSON.parse(result.body) as DataSubjectRequestState;
		expect(body.requestId).toEqual(requestId);
		expect(body.requestStatus).toEqual('in-progress');
	});

	it('Handle Data Subject Request state callback', async () => {
		const requestId = '475974fa-6b42-4370-bb56-b5d845686bb5'; // Do not fake it to match the header signature
		const mockDiscoveryResponse = {
			ok: true,
			status: 200,
			json: () => ({
				processor_certificate:
					'https://static.mparticle.com/dsr/opendsr_cert.pem',
			}),
		};
		const mockGetCertificateResponse = {
			ok: true,
			status: 200,
			text: () =>
				fs.readFileSync(path.join(__dirname, 'processor-certificate.pem')),
		};
		(global.fetch as jest.Mock)
			.mockResolvedValueOnce(mockDiscoveryResponse)
			.mockResolvedValueOnce(mockGetCertificateResponse);

		const result = await run({
			httpMethod: 'POST',
			path: `/data-subject-requests/${requestId}/callback`,
			// Do not fake it to match the header signature
			body: JSON.stringify({
				controller_id: '1402',
				expected_completion_time: '2025-06-09T00:00:00Z',
				status_callback_url:
					'https://webhook.site/6dfd0447-e1f9-4a98-a391-25481898763b',
				subject_request_id: requestId,
				request_status: 'completed',
				results_url: null,
				extensions: null,
			}),
			headers: {
				'x-opendsr-processor-domain': 'opendsr.mparticle.com',
				'x-opendsr-signature':
					'q/zaWUW4dJYXo7Bu9NR0AkkwbS/lnab2cQ/6hxuhNw/8xnljzjXB3jJhUM7UTr5+KZZ5/delbtAKVNPXLAGZ7DoeWMnWwYeyq3Pzw4l5wugg3YtFLS5o0MRlGye6Vj0UH2c/T8vQ87/KNl5hYrhYqrZvNb+f+gL9eSZ80lQwMu27fVSrnh7yztNLHLP593kV9oq1QBXQqf8yRVGy7fcFieNHtgYAuKFJeDkCwx7e4ismhKNkfM8Xlt6TEdR8dAwB6TVbz3W7bk4dTUKQrAVX84js4V5Sphj+vUBT/NATel6HYlkSsOk10HLjbaM2BwQtd51rD6ex9VbtpP0G8mHDVw==',
			},
		});

		expect(result).toBeDefined();
		expect(result.statusCode).toBeDefined();
		expect(result.statusCode).toEqual(202);

		const body = JSON.parse(result.body) as {
			message: string;
			timestamp: Date;
		};
		expect(body.message).toEqual('Callback accepted and processed');
		expect(body.timestamp).toBeDefined();

		// Access the mock SQSClient instance with proper typing
		const sqsClientMock = SQSClient as unknown as jest.Mock;
		const mockResults = sqsClientMock.mock.results as Array<{
			value: { send: jest.Mock };
		}>;
		const clientInstance = mockResults[0]?.value;

		// Assert that send was called
		expect(clientInstance?.send).toHaveBeenCalled();

		// Get the argument passed to send, with explicit typing
		const sendMock = clientInstance?.send.mock;
		const firstCall = sendMock?.calls[0] as unknown[];
		const sentCommandInput = firstCall[0] as {
			QueueUrl: string;
			MessageBody: string;
		};
		expect(sentCommandInput).toMatchObject({
			QueueUrl: expect.any(String) as string,
			MessageBody: expect.any(String) as string,
		});
	});
});
