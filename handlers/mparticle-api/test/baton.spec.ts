import { faker } from '@faker-js/faker';
import { streamHttpToS3 } from '../../../modules/aws/src/s3';
import { batonRerRouter } from '../src/routers/baton';
import { HandleSarStatus } from '../src/routers/baton/handle-sar-status';
import type {
	GUID,
	InitiationReference,
} from '../src/routers/baton/types-and-schemas';
import type { AppConfig } from '../src/utils/config';
import { invokeBatonHandler } from '../src/utils/invoke-baton-handler';

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
	const mockStreamHttpToS3 = streamHttpToS3 as jest.MockedFunction<
		typeof streamHttpToS3
	>;

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
			json: () => ({
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

	it('Get Subject Access Request Status', async () => {
		const requestId: InitiationReference = faker.string.uuid() as GUID;
		const resultsUrl = 'https://localhost/sar-data-1234.zip';
		const mockGetSubjectRequestByIdResponse = {
			ok: true,
			status: 200,
			json: () => ({
				expected_completion_time: faker.date.soon(),
				subject_request_id: requestId,
				controller_id: faker.string.numeric(),
				request_status: 'completed',
				received_time: faker.date.recent(),
				results_url: resultsUrl,
			}),
		};
		(global.fetch as jest.Mock).mockResolvedValueOnce(
			mockGetSubjectRequestByIdResponse,
		);

		mockStreamHttpToS3.mockResolvedValueOnce(undefined);
		const sarResultsBucket = 'bucketName';
		const dateTimeString = '2025-08-06T18:19:42.123Z';
		const router = batonRerRouter(
			new HandleSarStatus(
				sarResultsBucket,
				'basekey/',
				() => new Date(Date.parse(dateTimeString)),
			),
		);
		const result = await router.routeRequest({
			requestType: 'SAR',
			action: 'status',
			initiationReference: requestId,
		});

		expect(result).toBeDefined();
		expect(result.requestType).toEqual('SAR');
		expect(result.action).toEqual('status');
		expect(result.status).toEqual('completed');
		expect(result.message).toBeDefined();
		if (result.requestType === 'SAR' && result.action === 'status') {
			expect(result.resultLocations).toBeDefined();
			expect(result.resultLocations).toHaveLength(1);
			if (result.resultLocations) {
				expect(result.resultLocations[0]).toBeDefined();
			}
		}
		expect(global.fetch).toHaveBeenCalledTimes(1);

		expect(mockStreamHttpToS3).toHaveBeenCalledWith(
			resultsUrl,
			sarResultsBucket,
			`basekey/${dateTimeString}-${requestId}.zip`,
		);
	});
});
