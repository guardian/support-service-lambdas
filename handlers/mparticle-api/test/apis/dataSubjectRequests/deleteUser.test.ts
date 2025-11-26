import { processUserDeletion } from '../../../src/apis/dataSubjectRequests/deleteUser';
import type { BrazeClient } from '../../../src/services/brazeClient';
import { deleteBrazeUser } from '../../../src/services/brazeClient';
import type { MParticleClient } from '../../../src/services/mparticleClient';
import { deleteMParticleUser } from '../../../src/services/mparticleDeletion';
import { SQSService } from '../../../src/services/sqsService';
import type {
	DeletionRequestBody,
	MessageAttributes,
} from '../../../src/types/deletionMessage';

// Mock the modules
jest.mock('../../../src/services/mparticleDeletion');
jest.mock('../../../src/services/brazeClient');
jest.mock('../../../src/services/sqsService');

describe('processUserDeletion', () => {
	const mockDeleteMParticleUser = deleteMParticleUser as jest.Mock;
	const mockDeleteBrazeUser = deleteBrazeUser as jest.Mock;
	const mockSendToDLQ = jest.fn();

	const mockMParticleClient = {} as MParticleClient;
	const mockBrazeClient = {} as BrazeClient;
	const dlqUrl = 'https://sqs.eu-west-1.amazonaws.com/123456789/test-dlq';

	const body: DeletionRequestBody = {
		userId: 'test-user-123',
		email: 'test@example.com',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		console.log = jest.fn();
		console.error = jest.fn();

		// Mock SQSService constructor
		(SQSService as jest.Mock).mockImplementation(() => {
			return {
				sendToDLQ: mockSendToDLQ,
			};
		});
	});

	describe('Both deletions succeed', () => {
		it('should delete from both services and return success', async () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: false,
				brazeDeleted: false,
				attemptCount: 0,
			};

			mockDeleteMParticleUser.mockResolvedValue({ success: true });
			mockDeleteBrazeUser.mockResolvedValue({ success: true });

			const result = await processUserDeletion(
				body,
				attributes,
				mockMParticleClient,
				mockBrazeClient,
				dlqUrl,
			);

			expect(result).toEqual({
				mParticleDeleted: true,
				brazeDeleted: true,
				allSucceeded: true,
			});
			expect(mockDeleteMParticleUser).toHaveBeenCalledWith(
				mockMParticleClient,
				'test-user-123',
			);
			expect(mockDeleteBrazeUser).toHaveBeenCalledWith(
				mockBrazeClient,
				'test-user-123',
			);
			expect(mockSendToDLQ).not.toHaveBeenCalled();
		});
	});

	describe('Both already deleted (skip both)', () => {
		it('should skip both APIs and return success', async () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: true,
				brazeDeleted: true,
				attemptCount: 1,
			};

			const result = await processUserDeletion(
				body,
				attributes,
				mockMParticleClient,
				mockBrazeClient,
				dlqUrl,
			);

			expect(result).toEqual({
				mParticleDeleted: true,
				brazeDeleted: true,
				allSucceeded: true,
			});
			expect(mockDeleteMParticleUser).not.toHaveBeenCalled();
			expect(mockDeleteBrazeUser).not.toHaveBeenCalled();
			expect(mockSendToDLQ).not.toHaveBeenCalled();
		});
	});

	describe('Partial success - mParticle succeeds, Braze fails', () => {
		it('should send to DLQ with updated attributes', async () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: false,
				brazeDeleted: false,
				attemptCount: 0,
			};

			mockDeleteMParticleUser.mockResolvedValue({ success: true });
			mockDeleteBrazeUser.mockResolvedValue({
				success: false,
				error: new Error('Network timeout'),
				retryable: true,
			});

			const result = await processUserDeletion(
				body,
				attributes,
				mockMParticleClient,
				mockBrazeClient,
				dlqUrl,
			);

			expect(result).toEqual({
				mParticleDeleted: true,
				brazeDeleted: false,
				allSucceeded: false,
			});
			expect(mockSendToDLQ).toHaveBeenCalledWith(dlqUrl, body, {
				mParticleDeleted: true,
				brazeDeleted: false,
				attemptCount: 1,
			});
		});
	});

	describe('Partial success - mParticle fails, Braze succeeds', () => {
		it('should send to DLQ with updated attributes', async () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: false,
				brazeDeleted: false,
				attemptCount: 0,
			};

			mockDeleteMParticleUser.mockResolvedValue({
				success: false,
				error: new Error('API Error'),
				retryable: true,
			});
			mockDeleteBrazeUser.mockResolvedValue({ success: true });

			const result = await processUserDeletion(
				body,
				attributes,
				mockMParticleClient,
				mockBrazeClient,
				dlqUrl,
			);

			expect(result).toEqual({
				mParticleDeleted: false,
				brazeDeleted: true,
				allSucceeded: false,
			});
			expect(mockSendToDLQ).toHaveBeenCalledWith(dlqUrl, body, {
				mParticleDeleted: false,
				brazeDeleted: true,
				attemptCount: 1,
			});
		});
	});

	describe('Both fail', () => {
		it('should send to DLQ with no completions', async () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: false,
				brazeDeleted: false,
				attemptCount: 0,
			};

			mockDeleteMParticleUser.mockResolvedValue({
				success: false,
				error: new Error('mParticle Error'),
				retryable: true,
			});
			mockDeleteBrazeUser.mockResolvedValue({
				success: false,
				error: new Error('Braze Error'),
				retryable: true,
			});

			const result = await processUserDeletion(
				body,
				attributes,
				mockMParticleClient,
				mockBrazeClient,
				dlqUrl,
			);

			expect(result).toEqual({
				mParticleDeleted: false,
				brazeDeleted: false,
				allSucceeded: false,
			});
			expect(mockSendToDLQ).toHaveBeenCalledWith(dlqUrl, body, {
				mParticleDeleted: false,
				brazeDeleted: false,
				attemptCount: 1,
			});
		});
	});

	describe('mParticle already done, Braze succeeds', () => {
		it('should skip mParticle and complete Braze', async () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: true,
				brazeDeleted: false,
				attemptCount: 1,
			};

			mockDeleteBrazeUser.mockResolvedValue({ success: true });

			const result = await processUserDeletion(
				body,
				attributes,
				mockMParticleClient,
				mockBrazeClient,
				dlqUrl,
			);

			expect(result).toEqual({
				mParticleDeleted: true,
				brazeDeleted: true,
				allSucceeded: true,
			});
			expect(mockDeleteMParticleUser).not.toHaveBeenCalled();
			expect(mockDeleteBrazeUser).toHaveBeenCalledWith(
				mockBrazeClient,
				'test-user-123',
			);
			expect(mockSendToDLQ).not.toHaveBeenCalled();
		});
	});

	describe('Attempt count increments', () => {
		it('should increment attempt count on retry', async () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: true,
				brazeDeleted: false,
				attemptCount: 2,
			};

			mockDeleteBrazeUser.mockResolvedValue({
				success: false,
				error: new Error('Still failing'),
				retryable: true,
			});

			const result = await processUserDeletion(
				body,
				attributes,
				mockMParticleClient,
				mockBrazeClient,
				dlqUrl,
			);

			// Result should indicate mParticle succeeded but Braze failed
			expect(result.allSucceeded).toBe(false);
			expect(result.mParticleDeleted).toBe(true);
			expect(result.brazeDeleted).toBe(false);

			expect(mockSendToDLQ).toHaveBeenCalledWith(dlqUrl, body, {
				mParticleDeleted: true,
				brazeDeleted: false,
				attemptCount: 3,
			});
		});
	});

	describe('Braze already done, mParticle succeeds', () => {
		it('should skip Braze and complete mParticle', async () => {
			const attributes: MessageAttributes = {
				mParticleDeleted: false,
				brazeDeleted: true,
				attemptCount: 1,
			};

			mockDeleteMParticleUser.mockResolvedValue({ success: true });

			const result = await processUserDeletion(
				body,
				attributes,
				mockMParticleClient,
				mockBrazeClient,
				dlqUrl,
			);

			expect(result).toEqual({
				mParticleDeleted: true,
				brazeDeleted: true,
				allSucceeded: true,
			});
			expect(mockDeleteMParticleUser).toHaveBeenCalledWith(
				mockMParticleClient,
				'test-user-123',
			);
			expect(mockDeleteBrazeUser).not.toHaveBeenCalled();
			expect(mockSendToDLQ).not.toHaveBeenCalled();
		});
	});
});
