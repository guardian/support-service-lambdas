import {
	failureExistsOnInvoiceProcessingAttempt,
	handler,
	invoiceHasAtLeastOneProcessingFailure,
} from '../../src/handlers/detectFailures';
import type { DetectFailuresInput, ProcessedInvoice } from '../../src/types';

jest.mock('@modules/validation/index', () => ({
	validateInput: jest.fn(<T>(input: T): T => input),
}));

describe('detectFailures handler', () => {
	describe('invoiceHasAtLeastOneProcessingFailure', () => {
		it('should return true when applyCreditToAccountBalanceAttempt fails', () => {
			const invoice: ProcessedInvoice = {
				invoiceId: 'INV-001',
				accountId: 'ACC-001',
				invoiceNumber: 'INV-001',
				invoiceBalance: 100,
				applyCreditToAccountBalanceAttempt: {
					Success: false,
					error: 'Credit application failed',
				},
				checkForActiveSubAttempt: {
					Success: true,
					hasActiveSub: true,
				},
				checkForActivePaymentMethodAttempt: {
					Success: true,
					hasActivePaymentMethod: true,
					activePaymentMethods: [],
				},
			};

			const result = invoiceHasAtLeastOneProcessingFailure(invoice);

			expect(result).toBe(true);
		});

		it('should return true when checkForActiveSubAttempt fails', () => {
			const invoice: ProcessedInvoice = {
				invoiceId: 'INV-001',
				accountId: 'ACC-001',
				invoiceNumber: 'INV-001',
				invoiceBalance: 100,
				applyCreditToAccountBalanceAttempt: {
					Success: true,
				},
				checkForActiveSubAttempt: {
					Success: false,
					error: 'Active sub check failed',
				},
				checkForActivePaymentMethodAttempt: {
					Success: true,
					hasActivePaymentMethod: true,
					activePaymentMethods: [],
				},
			};

			const result = invoiceHasAtLeastOneProcessingFailure(invoice);

			expect(result).toBe(true);
		});

		it('should return true when checkForActivePaymentMethodAttempt fails', () => {
			const invoice: ProcessedInvoice = {
				invoiceId: 'INV-001',
				accountId: 'ACC-001',
				invoiceNumber: 'INV-001',
				invoiceBalance: 100,
				applyCreditToAccountBalanceAttempt: {
					Success: true,
				},
				checkForActiveSubAttempt: {
					Success: true,
					hasActiveSub: true,
				},
				checkForActivePaymentMethodAttempt: {
					Success: false,
					error: 'Payment method check failed',
				},
			};

			const result = invoiceHasAtLeastOneProcessingFailure(invoice);

			expect(result).toBe(true);
		});

		it('should return true when checkForActiveSubAttempt is undefined', () => {
			const invoice: ProcessedInvoice = {
				invoiceId: 'INV-001',
				accountId: 'ACC-001',
				invoiceNumber: 'INV-001',
				invoiceBalance: 100,
				applyCreditToAccountBalanceAttempt: {
					Success: true,
				},
				// checkForActiveSubAttempt is undefined
				checkForActivePaymentMethodAttempt: {
					Success: true,
					hasActivePaymentMethod: true,
					activePaymentMethods: [],
				},
			};

			const result = invoiceHasAtLeastOneProcessingFailure(invoice);

			expect(result).toBe(true);
		});

		it('should return true when checkForActivePaymentMethodAttempt is undefined', () => {
			const invoice: ProcessedInvoice = {
				invoiceId: 'INV-001',
				accountId: 'ACC-001',
				invoiceNumber: 'INV-001',
				invoiceBalance: 100,
				applyCreditToAccountBalanceAttempt: {
					Success: true,
				},
				checkForActiveSubAttempt: {
					Success: true,
					hasActiveSub: true,
				},
				// checkForActivePaymentMethodAttempt is undefined
			};

			const result = invoiceHasAtLeastOneProcessingFailure(invoice);

			expect(result).toBe(true);
		});

		it('should return false when all attempts succeed', () => {
			const invoice: ProcessedInvoice = {
				invoiceId: 'INV-001',
				accountId: 'ACC-001',
				invoiceNumber: 'INV-001',
				invoiceBalance: 100,
				applyCreditToAccountBalanceAttempt: {
					Success: true,
				},
				checkForActiveSubAttempt: {
					Success: true,
					hasActiveSub: true,
				},
				checkForActivePaymentMethodAttempt: {
					Success: true,
					hasActivePaymentMethod: true,
					activePaymentMethods: [],
				},
			};

			const result = invoiceHasAtLeastOneProcessingFailure(invoice);

			expect(result).toBe(false);
		});

		it('should return true when multiple attempts fail', () => {
			const invoice: ProcessedInvoice = {
				invoiceId: 'INV-001',
				accountId: 'ACC-001',
				invoiceNumber: 'INV-001',
				invoiceBalance: 100,
				applyCreditToAccountBalanceAttempt: {
					Success: false,
					error: 'Credit application failed',
				},
				checkForActiveSubAttempt: {
					Success: false,
					error: 'Active sub check failed',
				},
				checkForActivePaymentMethodAttempt: {
					Success: false,
					error: 'Payment method check failed',
				},
			};

			const result = invoiceHasAtLeastOneProcessingFailure(invoice);

			expect(result).toBe(true);
		});
	});

	describe('failureExistsOnInvoiceProcessingAttempt', () => {
		it('should return true when s3UploadAttemptStatus is error', async () => {
			const processedInvoices: ProcessedInvoice[] = [
				{
					invoiceId: 'INV-001',
					accountId: 'ACC-001',
					invoiceNumber: 'INV-001',
					invoiceBalance: 100,
					applyCreditToAccountBalanceAttempt: {
						Success: true,
					},
					checkForActiveSubAttempt: {
						Success: true,
						hasActiveSub: true,
					},
					checkForActivePaymentMethodAttempt: {
						Success: true,
						hasActivePaymentMethod: true,
						activePaymentMethods: [],
					},
				},
			];

			const result = await failureExistsOnInvoiceProcessingAttempt(
				processedInvoices,
				'error',
			);

			expect(result).toBe(true);
		});

		it('should return false when s3UploadAttemptStatus is success and all invoices succeed', async () => {
			const processedInvoices: ProcessedInvoice[] = [
				{
					invoiceId: 'INV-001',
					accountId: 'ACC-001',
					invoiceNumber: 'INV-001',
					invoiceBalance: 100,
					applyCreditToAccountBalanceAttempt: {
						Success: true,
					},
					checkForActiveSubAttempt: {
						Success: true,
						hasActiveSub: true,
					},
					checkForActivePaymentMethodAttempt: {
						Success: true,
						hasActivePaymentMethod: true,
						activePaymentMethods: [],
					},
				},
				{
					invoiceId: 'INV-002',
					accountId: 'ACC-002',
					invoiceNumber: 'INV-002',
					invoiceBalance: 200,
					applyCreditToAccountBalanceAttempt: {
						Success: true,
					},
					checkForActiveSubAttempt: {
						Success: true,
						hasActiveSub: true,
					},
					checkForActivePaymentMethodAttempt: {
						Success: true,
						hasActivePaymentMethod: true,
						activePaymentMethods: [],
					},
				},
			];

			const result = await failureExistsOnInvoiceProcessingAttempt(
				processedInvoices,
				'success',
			);

			expect(result).toBe(false);
		});

		it('should return true when s3UploadAttemptStatus is success but at least one invoice fails', async () => {
			const processedInvoices: ProcessedInvoice[] = [
				{
					invoiceId: 'INV-001',
					accountId: 'ACC-001',
					invoiceNumber: 'INV-001',
					invoiceBalance: 100,
					applyCreditToAccountBalanceAttempt: {
						Success: true,
					},
					checkForActiveSubAttempt: {
						Success: true,
						hasActiveSub: true,
					},
					checkForActivePaymentMethodAttempt: {
						Success: true,
						hasActivePaymentMethod: true,
						activePaymentMethods: [],
					},
				},
				{
					invoiceId: 'INV-002',
					accountId: 'ACC-002',
					invoiceNumber: 'INV-002',
					invoiceBalance: 200,
					applyCreditToAccountBalanceAttempt: {
						Success: false,
						error: 'Credit application failed',
					},
					checkForActiveSubAttempt: {
						Success: true,
						hasActiveSub: true,
					},
					checkForActivePaymentMethodAttempt: {
						Success: true,
						hasActivePaymentMethod: true,
						activePaymentMethods: [],
					},
				},
			];

			const result = await failureExistsOnInvoiceProcessingAttempt(
				processedInvoices,
				'success',
			);

			expect(result).toBe(true);
		});

		it('should return false when processedInvoices is empty and s3UploadAttemptStatus is success', async () => {
			const processedInvoices: ProcessedInvoice[] = [];

			const result = await failureExistsOnInvoiceProcessingAttempt(
				processedInvoices,
				'success',
			);

			expect(result).toBe(false);
		});

		it('should return true when processedInvoices is empty but s3UploadAttemptStatus is error', async () => {
			const processedInvoices: ProcessedInvoice[] = [];

			const result = await failureExistsOnInvoiceProcessingAttempt(
				processedInvoices,
				'error',
			);

			expect(result).toBe(true);
		});
	});

	describe('handler', () => {
		it('should not throw when no failures are detected', async () => {
			const event: DetectFailuresInput = {
				invoicesCount: 1,
				invoices: [
					{
						invoiceId: 'INV-001',
						accountId: 'ACC-001',
						invoiceNumber: 'INV-001',
						invoiceBalance: 100,
					},
				],
				processedInvoices: [
					{
						invoiceId: 'INV-001',
						accountId: 'ACC-001',
						invoiceNumber: 'INV-001',
						invoiceBalance: 100,
						applyCreditToAccountBalanceAttempt: {
							Success: true,
						},
						checkForActiveSubAttempt: {
							Success: true,
							hasActiveSub: true,
						},
						checkForActivePaymentMethodAttempt: {
							Success: true,
							hasActivePaymentMethod: true,
							activePaymentMethods: [],
						},
					},
				],
				s3UploadAttemptStatus: 'success',
				filePath: 'test-file-path',
			};

			const result = await handler(event);
			expect(result).toEqual({});
		});

		it('should throw error when failures are detected', async () => {
			const event: DetectFailuresInput = {
				invoicesCount: 1,
				invoices: [
					{
						invoiceId: 'INV-001',
						accountId: 'ACC-001',
						invoiceNumber: 'INV-001',
						invoiceBalance: 100,
					},
				],
				processedInvoices: [
					{
						invoiceId: 'INV-001',
						accountId: 'ACC-001',
						invoiceNumber: 'INV-001',
						invoiceBalance: 100,
						applyCreditToAccountBalanceAttempt: {
							Success: false,
							error: 'Credit application failed',
						},
						checkForActiveSubAttempt: {
							Success: true,
							hasActiveSub: true,
						},
						checkForActivePaymentMethodAttempt: {
							Success: true,
							hasActivePaymentMethod: true,
							activePaymentMethods: [],
						},
					},
				],
				s3UploadAttemptStatus: 'success',
				filePath: 'test-file-path',
			};

			await expect(handler(event)).rejects.toThrow(
				'Failure occurred. Check logs.',
			);
		});

		it('should throw error when s3UploadAttemptStatus is error', async () => {
			const event: DetectFailuresInput = {
				invoicesCount: 1,
				invoices: [
					{
						invoiceId: 'INV-001',
						accountId: 'ACC-001',
						invoiceNumber: 'INV-001',
						invoiceBalance: 100,
					},
				],
				processedInvoices: [
					{
						invoiceId: 'INV-001',
						accountId: 'ACC-001',
						invoiceNumber: 'INV-001',
						invoiceBalance: 100,
						applyCreditToAccountBalanceAttempt: {
							Success: true,
						},
						checkForActiveSubAttempt: {
							Success: true,
							hasActiveSub: true,
						},
						checkForActivePaymentMethodAttempt: {
							Success: true,
							hasActivePaymentMethod: true,
							activePaymentMethods: [],
						},
					},
				],
				s3UploadAttemptStatus: 'error',
				filePath: 'test-file-path',
			};

			await expect(handler(event)).rejects.toThrow(
				'Failure occurred. Check logs.',
			);
		});
	});
});
