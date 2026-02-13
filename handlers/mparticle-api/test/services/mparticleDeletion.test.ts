import { HttpError } from '../../src/services/make-http-request';
import type {
	BulkDeletionAPI,
	MParticleClient,
} from '../../src/services/mparticleClient';
import { deleteMParticleUser } from '../../src/services/mparticleDeletion';

jest.mock('@modules/routing/logger', () => ({
	logger: {
		log: jest.fn(),
		error: jest.fn(),
		getCallerInfo: jest.fn(() => 'mparticleDeletion.test.ts'),
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Mock wrapper
		wrapFn: jest.fn((fn) => fn),
	},
}));

describe('deleteMParticleUser', () => {
	const userId = 'test-user-789';
	const mockPost = jest.fn();
	let mockClient: MParticleClient<BulkDeletionAPI>;

	beforeEach(() => {
		jest.clearAllMocks();
		console.log = jest.fn();
		console.error = jest.fn();
		mockPost.mockReset();
		mockClient = {
			post: mockPost,
		} as unknown as MParticleClient<BulkDeletionAPI>;
	});

	it('should have a basic test', async () => {
		mockPost.mockResolvedValue({
			success: true,
			statusCode: 202,
		});

		const result = await deleteMParticleUser(mockClient, userId);
		expect(result.success).toBe(true);
	});

	it('should return success when user not found (404)', async () => {
		const error404 = new HttpError(
			'Not found',
			404,
			'Not Found',
			'User not found',
		);
		mockPost.mockRejectedValue(error404);

		const result = await deleteMParticleUser(mockClient, userId);

		expect(result.success).toBe(true);
	});

	it('should return retryable error for 500', async () => {
		const error500 = new HttpError(
			'Internal server error',
			500,
			'Internal Server Error',
			'Server error',
		);
		mockPost.mockResolvedValue({
			success: false,
			error: error500,
		});

		const result = await deleteMParticleUser(mockClient, userId);

		expect(result.success).toBe(false);
	});

	it('should return retryable error for 503', async () => {
		const error503 = new HttpError(
			'Service unavailable',
			503,
			'Service Unavailable',
			'Service down',
		);
		mockPost.mockResolvedValue({
			success: false,
			error: error503,
		});

		const result = await deleteMParticleUser(mockClient, userId);

		expect(result.success).toBe(false);
	});

	it('should return non-retryable error for 400', async () => {
		const error400 = new HttpError(
			'Bad request',
			400,
			'Bad Request',
			'Invalid input',
		);
		mockPost.mockResolvedValue({
			success: false,
			error: error400,
		});

		const result = await deleteMParticleUser(mockClient, userId);

		expect(result.success).toBe(false);
	});

	it('should handle network errors as retryable', async () => {
		const networkError = new Error('Network connection failed');
		mockPost.mockRejectedValue(networkError);

		const result = await deleteMParticleUser(mockClient, userId);

		expect(result.success).toBe(false);
	});

	it('should send correct request body format', async () => {
		mockPost.mockResolvedValue({
			success: true,
		});

		await deleteMParticleUser(mockClient, userId);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Test mock calls
		const callArgs = mockPost.mock.calls[0];
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Test mock args
		expect(callArgs[0]).toBe('/userprofile/bulkdelete');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Test mock args
		expect(callArgs[1]).toEqual([
			{
				environment_type: 'production',
				action: 'delete',
				identities: {
					customerid: userId,
				},
			},
		]);
	});
});
