import { processUserDeletion } from '../../../src/apis/dataSubjectRequests/deleteUser';
import type { BrazeClient } from '../../../src/services/brazeClient';
import { deleteBrazeUser } from '../../../src/services/brazeClient';
import type {
	BulkDeletionAPI,
	MParticleClient,
} from '../../../src/services/mparticleClient';
import { deleteMParticleUser } from '../../../src/services/mparticleDeletion';

// Mock the modules
jest.mock('../../../src/services/mparticleDeletion');
jest.mock('../../../src/services/brazeClient');

describe('processUserDeletion', () => {
	const mockDeleteMParticleUser = deleteMParticleUser as jest.Mock;
	const mockDeleteBrazeUser = deleteBrazeUser as jest.Mock;

	const mockMParticleClient = {} as MParticleClient<BulkDeletionAPI>;
	const mockBrazeClient = {} as BrazeClient;
	const userId = 'test-user-123';
	const brazeId = 'braze-id-123';

	beforeEach(() => {
		jest.clearAllMocks();
		console.log = jest.fn();
		console.error = jest.fn();
	});

	describe('Both deletions succeed', () => {
		it('should delete from both services successfully', async () => {
			mockDeleteMParticleUser.mockResolvedValue({ success: true });
			mockDeleteBrazeUser.mockResolvedValue({ success: true });

			await processUserDeletion(
				userId,
				brazeId,
				mockMParticleClient,
				mockBrazeClient,
				'production',
			);

			expect(mockDeleteMParticleUser).toHaveBeenCalledWith(
				mockMParticleClient,
				userId,
				'production',
			);
			expect(mockDeleteBrazeUser).toHaveBeenCalledWith(
				mockBrazeClient,
				brazeId,
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
					brazeId,
					mockMParticleClient,
					mockBrazeClient,
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
					brazeId,
					mockMParticleClient,
					mockBrazeClient,
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
					brazeId,
					mockMParticleClient,
					mockBrazeClient,
					'production',
				),
			).rejects.toThrow('mParticle error');
		});
	});

	describe('Non-retryable errors', () => {
		it('should throw if mParticle fails with non-retryable error', async () => {
			mockDeleteMParticleUser.mockResolvedValue({
				success: false,
				error: new Error('Invalid request'),
				retryable: false,
			});
			mockDeleteBrazeUser.mockResolvedValue({ success: true });

			// All errors now throw to ensure DLQ visibility for compliance
			await expect(
				processUserDeletion(
					userId,
					brazeId,
					mockMParticleClient,
					mockBrazeClient,
					'production',
				),
			).rejects.toThrow('Invalid request');

			expect(mockDeleteMParticleUser).toHaveBeenCalled();
			// Braze is still called after the 10 second delay even if mParticle fails
			expect(mockDeleteBrazeUser).toHaveBeenCalled();
		});

		it('should throw if Braze fails with non-retryable error', async () => {
			mockDeleteMParticleUser.mockResolvedValue({ success: true });
			mockDeleteBrazeUser.mockResolvedValue({
				success: false,
				error: new Error('Invalid API key'),
				retryable: false,
			});

			// All errors now throw to ensure DLQ visibility for compliance
			await expect(
				processUserDeletion(
					userId,
					brazeId,
					mockMParticleClient,
					mockBrazeClient,
					'production',
				),
			).rejects.toThrow('Invalid API key');
		});
	});

	describe('Idempotency - already deleted (404)', () => {
		it('should succeed when mParticle returns 404 on retry', async () => {
			// First call deleted from mParticle, second call gets 404
			mockDeleteMParticleUser.mockResolvedValue({ success: true }); // 404 treated as success
			mockDeleteBrazeUser.mockResolvedValue({ success: true });

			await processUserDeletion(
				userId,
				brazeId,
				mockMParticleClient,
				mockBrazeClient,
				'production',
			);

			expect(mockDeleteMParticleUser).toHaveBeenCalled();
			expect(mockDeleteBrazeUser).toHaveBeenCalled();
		});
	});

	describe('BrazeUuid handling', () => {
		it('should skip Braze deletion when brazeUuid is undefined', async () => {
			mockDeleteMParticleUser.mockResolvedValue({ success: true });
			mockDeleteBrazeUser.mockResolvedValue({ success: true });

			await processUserDeletion(
				userId,
				undefined,
				mockMParticleClient,
				mockBrazeClient,
				'production',
			);

			expect(mockDeleteMParticleUser).toHaveBeenCalled();
			expect(mockDeleteBrazeUser).not.toHaveBeenCalled();
		});

		it('should skip Braze deletion when brazeUuid is empty string', async () => {
			mockDeleteMParticleUser.mockResolvedValue({ success: true });
			mockDeleteBrazeUser.mockResolvedValue({ success: true });

			await processUserDeletion(
				userId,
				'',
				mockMParticleClient,
				mockBrazeClient,
				'production',
			);

			expect(mockDeleteMParticleUser).toHaveBeenCalled();
			expect(mockDeleteBrazeUser).not.toHaveBeenCalled();
		});

		it('should skip Braze deletion when brazeUuid is whitespace', async () => {
			mockDeleteMParticleUser.mockResolvedValue({ success: true });
			mockDeleteBrazeUser.mockResolvedValue({ success: true });

			await processUserDeletion(
				userId,
				'   ',
				mockMParticleClient,
				mockBrazeClient,
				'production',
			);

			expect(mockDeleteMParticleUser).toHaveBeenCalled();
			expect(mockDeleteBrazeUser).not.toHaveBeenCalled();
		});
	});
});
