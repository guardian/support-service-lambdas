import { faker } from '@faker-js/faker';
import type {
	DataSubjectAPI,
	MParticleClient,
} from '../src/apis/mparticleClient';
import { mparticleDataSubjectBaseURL } from '../src/apis/mparticleClient';
import type { SRS3Client } from '../src/apis/srs3Client';
import { handleSarStatus } from '../src/routers/baton/handle-sar-status';
import type {
	GUID,
	InitiationReference,
} from '../src/routers/baton/types-and-schemas';
import type { AppConfig } from '../src/utils/config';
import { invokeBatonHandler } from './invoke-baton-handler';

jest.mock('../../../modules/aws/src/s3');

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
		pod: 'EU1',
	} as AppConfig),
	getEnv: jest.fn(() => 'CODE'),
}));

describe('mparticle-api Baton tests', () => {
	beforeEach(() => {
		jest.resetModules();
		global.fetch = jest.fn();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('Initiate Right to Erasure Request', async () => {
		const requestId = faker.string.uuid();
		const submittedTime = new Date();
		const mockSetUserAttributesResponse = {
			ok: true,
			status: 202,
			text: () => '',
		};
		const mockCreateDataSubjectRequestResponse = {
			ok: true,
			statusCode: 202,
			text: () =>
				JSON.stringify({
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
		const result = await invokeBatonHandler({
			requestType: 'RER',
			action: 'initiate',
			subjectId: userId,
			dataProvider: 'mparticlerer',
		});

		expect(result).toBeDefined();
		expect(result.requestType).toEqual('RER');
		expect(result.action).toEqual('initiate');
		expect(result.status).toEqual('pending');
		if (result.action == 'initiate') {
			expect(result.initiationReference).toEqual(requestId);
		}
		expect(result.message).toBeDefined();
		expect(global.fetch).toHaveBeenCalledTimes(2);
	});

	it('Get Right to Erasure Request Status', async () => {
		const requestId: InitiationReference = faker.string.uuid() as GUID;
		const mockGetSubjectRequestByIdResponse = {
			ok: true,
			status: 200,
			text: () =>
				JSON.stringify({
					expected_completion_time: faker.date.soon(),
					subject_request_id: requestId,
					controller_id: faker.string.numeric(),
					request_status: 'in_progress',
					received_time: faker.date.recent(),
					group_id: null,
					api_version: '3.0',
					results_url: null,
					extensions: null,
				}),
		};
		(global.fetch as jest.Mock).mockResolvedValueOnce(
			mockGetSubjectRequestByIdResponse,
		);

		const result = await invokeBatonHandler({
			requestType: 'RER',
			action: 'status',
			initiationReference: requestId,
		});

		expect(result).toBeDefined();
		expect(result.requestType).toEqual('RER');
		expect(result.action).toEqual('status');
		expect(result.status).toEqual('pending');
		expect(result.message).toBeDefined();
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('Initiate Subject Access Request', async () => {
		const requestId = faker.string.uuid();
		const submittedTime = new Date();
		const mockCreateDataSubjectRequestResponse = {
			ok: true,
			statusCode: 201,
			text: () =>
				JSON.stringify({
					expected_completion_time: faker.date.soon(),
					received_time: submittedTime,
					subject_request_id: requestId,
					controller_id: faker.string.numeric(),
				}),
		};
		(global.fetch as jest.Mock).mockResolvedValueOnce(
			mockCreateDataSubjectRequestResponse,
		);

		const userId = faker.string.alphanumeric();
		const result = await invokeBatonHandler({
			requestType: 'SAR',
			action: 'initiate',
			subjectId: userId,
			dataProvider: 'mparticlesar',
		});

		expect(result).toBeDefined();
		expect(result.requestType).toEqual('SAR');
		expect(result.action).toEqual('initiate');
		expect(result.status).toEqual('pending');
		if (result.action === 'initiate') {
			expect(result.initiationReference).toEqual(requestId);
		}
		expect(result.message).toBeDefined();
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('should get the status of a SAR including downloading the result', async () => {
		const requestId: InitiationReference = faker.string.uuid() as GUID;
		const zipRelativePath = '/sar-data-1234.zip';
		const resultsUrl = mparticleDataSubjectBaseURL + zipRelativePath;
		const testZipData = '1234TestZipData';
		const mockGetSubjectRequestByIdResponse = {
			success: true,
			data: {
				expected_completion_time: faker.date.soon(),
				subject_request_id: requestId,
				controller_id: faker.string.numeric(),
				request_status: 'completed',
				received_time: faker.date.recent(),
				results_url: resultsUrl,
			},
		};

		const mockDataSubjectClient: MParticleClient<DataSubjectAPI> = {
			clientType: 'dataSubject',
			get: jest.fn().mockImplementation((path: string) => {
				console.log('Mock get called with path:', path);
				expect(path).toBe('/requests/' + requestId);
				return Promise.resolve(mockGetSubjectRequestByIdResponse);
			}),
			post: jest.fn().mockRejectedValue(new Error('Mock error')),
			getStream: jest.fn().mockImplementation((path: string) => {
				console.log('Mock getStream called with path:', path);
				expect(path).toBe(zipRelativePath);
				const stream = new ReadableStream({
					start(controller) {
						controller.enqueue(new TextEncoder().encode(testZipData));
						controller.close();
					},
				});
				return Promise.resolve(stream);
			}),
		};

		const mockS3Client: SRS3Client = {
			write: jest.fn().mockResolvedValue(`s3://myBucket123/${requestId}`),
		};

		const result = await handleSarStatus(
			mockDataSubjectClient,
			mockS3Client,
			requestId,
		);

		const { message, ...resultWithoutMessage } = result;
		expect(resultWithoutMessage).toEqual({
			requestType: 'SAR',
			action: 'status',
			status: 'completed',
			resultLocations: ['s3://myBucket123/' + requestId],
		});

		// check the critical side effect was called
		expect(mockS3Client.write).toHaveBeenCalledWith(
			requestId,
			expect.any(ReadableStream),
		);

		// check what was written to S3 is correct
		const writeCalls = (mockS3Client.write as jest.Mock).mock.calls as Array<
			[string, ReadableStream]
		>;

		const actualStreamContent = await getStreamContent(writeCalls[0]![1]);
		expect(actualStreamContent).toBe(testZipData);
	});
});

async function getStreamContent(streamArg: ReadableStream) {
	return new TextDecoder().decode(
		(await streamArg.getReader().read()).value! as Uint8Array,
	);
}
