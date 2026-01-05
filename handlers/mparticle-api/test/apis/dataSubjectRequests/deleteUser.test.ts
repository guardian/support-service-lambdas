import { processUserDeletion } from '../../../src/apis/dataSubjectRequests/deleteUser';
import type { BrazeClient } from '../../../src/services/brazeClient';
import { deleteBrazeUser } from '../../../src/services/brazeClient';
import type { IdentityApiClient } from '../../../src/services/identityApiClient';
import type { BulkDeletionAPI, MParticleClient } from '../../../src/services/mparticleClient';
import { deleteMParticleUser } from '../../../src/services/mparticleDeletion';

// Mock the modules
jest.mock('../../../src/services/mparticleDeletion');
jest.mock('../../../src/services/brazeClient');

describe('processUserDeletion', () => {
	const mockDeleteMParticleUser = deleteMParticleUser as jest.Mock;
	const mockDeleteBrazeUser = deleteBrazeUser as jest.Mock;

	const mockMParticleClient = {} as MParticleClient<BulkDeletionAPI>;
	const mockBrazeClient = {} as BrazeClient;
	const mockIdentityApi = {
		getUser: jest.fn(),
	};
	const mockIdentityApiClient = mockIdentityApi as unknown as IdentityApiClient;
	const mockGetUser = mockIdentityApi.getUser;
	const userId = 'test-user-123';

	beforeEach(() => {
		jest.clearAllMocks();
		console.log = jest.fn();
		console.error = jest.fn();
		mockGetUser.mockReset();
		mockGetUser.mockResolvedValue({
			identityId: userId,
			brazeUuid: 'braze-uuid-123',
		});
	});

	describe('Both deletions succeed', () => {
		it('should delete from both services successfully', async () => {
			mockDeleteMParticleUser.mockResolvedValue({ success: true });
			mockDeleteBrazeUser.mockResolvedValue({ success: true });

			await processUserDeletion(
				userId,
				mockMParticleClient,
				mockBrazeClient,
				mockIdentityApiClient,
				'production',
			);

			expect(mockDeleteMParticleUser).toHaveBeenCalledWith(
				mockMParticleClient,
				userId,
				'production',
			);
			expect(mockDeleteBrazeUser).toHaveBeenCalledWith(
				mockBrazeClient,
				'braze-uuid-123',
			);
		});
	});

	describe('mParticle fails with retryable error', () => {
		it('should throw error to trigger SQS retry', async () => {
			const error = new Error('Network timeout');
			mockDeleteMParticleUser.mockResolvedValue({
				success: false,
				error,
				retryable: true,
			});
			mockDeleteBrazeUser.mockResolvedValue({ success: true });

			await expect(
				processUserDeletion(
					userId,
					mockMParticleClient,
					mockBrazeClient,
					mockIdentityApiClient,
					'production',
				),
			).rejects.toThrow('Network timeout');

			expect(mockDeleteMParticleUser).toHaveBeenCalled();
			expect(mockDeleteBrazeUser).toHaveBeenCalled();
		});
	});

	describe('Braze fails with retryable error', () => {
		it('should throw error to trigger SQS retry', async () => {
			const error = new Error('Server error');
			mockDeleteMParticleUser.mockResolvedValue({ success: true });
			mockDeleteBrazeUser.mockResolvedValue({
				success: false,
				error,
				retryable: true,
			});

			await expect(
				processUserDeletion(
					userId,
					mockMParticleClient,
					mockBrazeClient,
					mockIdentityApiClient,
					'production',
				),
			).rejects.toThrow('Server error');
		});
	});

	describe('Both fail with retryable errors', () => {
		it('should throw mParticle error first', async () => {
			const mParticleError = new Error('mParticle error');
			const brazeError = new Error('Braze error');

			mockDeleteMParticleUser.mockResolvedValue({
				success: false,
				error: mParticleError,
				retryable: true,
			});
			mockDeleteBrazeUser.mockResolvedValue({
				success: false,
				error: brazeError,
				retryable: true,
			});

			await expect(
				processUserDeletion(
					userId,
					mockMParticleClient,
					mockBrazeClient,
					mockIdentityApiClient,
					'production',
				),
			).rejects.toThrow('mParticle error');
		});
	});

	describe('Non-retryable errors', () => {
		it('should not throw if mParticle fails with non-retryable error', async () => {
			mockDeleteMParticleUser.mockResolvedValue({
				success: false,
				error: new Error('Invalid request'),
				retryable: false,
			});
			mockDeleteBrazeUser.mockResolvedValue({ success: true });

			// Should not throw - message will be removed from queue
			await processUserDeletion(
				userId,
				mockMParticleClient,
				mockBrazeClient,
				mockIdentityApiClient,
				'production',
			);

			expect(mockDeleteMParticleUser).toHaveBeenCalled();
			expect(mockDeleteBrazeUser).toHaveBeenCalled();
		});

		it('should not throw if Braze fails with non-retryable error', async () => {
			mockDeleteMParticleUser.mockResolvedValue({ success: true });
			mockDeleteBrazeUser.mockResolvedValue({
				success: false,
				error: new Error('Invalid API key'),
				retryable: false,
			});

			// Should not throw - message will be removed from queue
			await processUserDeletion(
				userId,
				mockMParticleClient,
				mockBrazeClient,
				mockIdentityApiClient,
				'production',
			);
		});
	});

	describe('Idempotency - already deleted (404)', () => {
		it('should succeed when mParticle returns 404 on retry', async () => {
			// First call deleted from mParticle, second call gets 404
			mockDeleteMParticleUser.mockResolvedValue({ success: true }); // 404 treated as success
			mockDeleteBrazeUser.mockResolvedValue({ success: true });

			await processUserDeletion(
				userId,
				mockMParticleClient,
				mockBrazeClient,
				mockIdentityApiClient,
				'production',
			);

			expect(mockDeleteMParticleUser).toHaveBeenCalled();
			expect(mockDeleteBrazeUser).toHaveBeenCalled();
		});
	});
	
	describe('Identity API integration', () => {
		it('should skip Braze deletion when brazeUuid is missing', async () => {
			mockGetUser.mockResolvedValue({ identityId: userId });
			mockDeleteMParticleUser.mockResolvedValue({ success: true });
			mockDeleteBrazeUser.mockResolvedValue({ success: true });

			await processUserDeletion(
				userId,
				mockMParticleClient,
				mockBrazeClient,
				mockIdentityApiClient,
				'production',
			);

			expect(mockDeleteMParticleUser).toHaveBeenCalled();
			expect(mockDeleteBrazeUser).not.toHaveBeenCalled();
		});

		it('should throw when Identity API returns no user', async () => {
			mockGetUser.mockResolvedValue(null);

			await expect(
				processUserDeletion(
					userId,
					mockMParticleClient,
					mockBrazeClient,
					mockIdentityApiClient,
					'production',
				),
			).rejects.toThrow('Unable to fetch Identity API data');

			expect(mockDeleteMParticleUser).not.toHaveBeenCalled();
			expect(mockDeleteBrazeUser).not.toHaveBeenCalled();
		});
	});
});
