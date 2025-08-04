import {
	// failureExistsOnInvoiceProcessingAttempt,
	invoiceHasAtLeastOneProcessingFailure,
} from '../../src/handlers/detectFailures';
import type { ProcessedInvoice } from '../../src/types/shared';

describe('invoiceHasAtLeastOneProcessingFailure', () => {
	it('should return false when applyCreditToAccountBalanceAttempt succeeds', () => {
		const invoice: ProcessedInvoice = {
			invoiceId: 'INV-001',
			accountId: 'ACC-001',
			invoiceNumber: 'INV-001',
			invoiceBalance: 100,
			applyCreditToAccountBalanceResult: {
				applyCreditToAccountBalanceAttempt: {
					Success: true,
				},
			},
		};
		const result = invoiceHasAtLeastOneProcessingFailure(invoice);
		expect(result).toBe(false);
	});
	// it('should return true when checkForActiveSubAttempt fails', () => {
	// 	const invoice: ProcessedInvoice = {
	// 		invoiceId: 'INV-001',
	// 		accountId: 'ACC-001',
	// 		invoiceNumber: 'INV-001',
	// 		invoiceBalance: 100,
	// 		applyCreditToAccountBalanceResult: {
	// 			applyCreditToAccountBalanceAttempt: {
	// 				Success: true,
	// 			},
	// 		},
	// 		activeSubResult: {
	// 			checkForActiveSubAttempt: {
	// 				Success: false,
	// 			},
	// 			hasActiveSubscription: undefined,
	// 			error: 'Active sub check failed',
	// 		},
	// 	};
	// 	const result = invoiceHasAtLeastOneProcessingFailure(invoice);
	// 	expect(result).toBe(true);
	// });
});

// describe('invoiceHasAtLeastOneProcessingFailure', () => {
// it('should return true when applyCreditToAccountBalanceAttempt fails', () => {
// 	const invoice: ProcessedInvoice = {
// 		invoiceId: 'INV-001',
// 		accountId: 'ACC-001',
// 		invoiceNumber: 'INV-001',
// 		invoiceBalance: 100,
// 		applyCreditToAccountBalanceResult: {
// 			applyCreditToAccountBalanceAttempt: {
// 				Success: false,
// 			},
// 			error: 'Credit application failed',
// 		},
// 	};
// 	const result = invoiceHasAtLeastOneProcessingFailure(invoice);
// 	expect(result).toBe(true);
// });
// it('should return true when checkForActiveSubAttempt fails', () => {
// 	const invoice: ProcessedInvoice = {
// 		invoiceId: 'INV-001',
// 		accountId: 'ACC-001',
// 		invoiceNumber: 'INV-001',
// 		invoiceBalance: 100,
// 		applyCreditToAccountBalanceResult: {
// 			applyCreditToAccountBalanceAttempt: {
// 				Success: true,
// 			},
// 		},
// 		activeSubResult: {
// 			checkForActiveSubAttempt: {
// 				Success: false,
// 			},
// 			hasActiveSubscription: undefined,
// 			error: 'Active sub check failed',
// 		},
// 	};
// 	const result = invoiceHasAtLeastOneProcessingFailure(invoice);
// 	expect(result).toBe(true);
// });
// it('should return true when checkForActivePaymentMethodAttempt fails', () => {
// 	const invoice: ProcessedInvoice = {
// 		invoiceId: 'INV-002',
// 		accountId: 'ACC-001',
// 		invoiceNumber: 'INV-001',
// 		invoiceBalance: 100,
// 		applyCreditToAccountBalanceResult: {
// 			applyCreditToAccountBalanceAttempt: {
// 				Success: true,
// 			},
// 		},
// 		activeSubResult: {
// 			checkForActiveSubAttempt: {
// 				Success: false,
// 				Errors: [
// 					{
// 						Message:
// 							'You cannot transfer an amount greater than the invoice balance. Please update and try again.',
// 						Code: 'INVALID_VALUE',
// 					},
// 				],
// 			},
// 			hasActiveSubscription: undefined,
// 		},
// 		activePaymentMethodResult: {
// 			checkForActivePaymentMethodAttempt: {
// 				Success: false,
// 			},
// 			error: 'Payment method check failed',
// 		},
// 	};
// 	const result = invoiceHasAtLeastOneProcessingFailure(invoice);
// 	expect(result).toBe(true);
// });
// it('should return false when all attempts succeed', () => {
// 	const invoice: ProcessedInvoice = {
// 		invoiceId: 'INV-001',
// 		accountId: 'ACC-001',
// 		invoiceNumber: 'INV-001',
// 		invoiceBalance: 100,
// 		applyCreditToAccountBalanceResult: {
// 			applyCreditToAccountBalanceAttempt: {
// 				Success: true,
// 			},
// 		},
// 		activeSubResult: {
// 			checkForActiveSubAttempt: {
// 				Success: true,
// 			},
// 			hasActiveSubscription: true,
// 		},
// 		activePaymentMethodResult: {
// 			checkForActivePaymentMethodAttempt: {
// 				Success: true,
// 			},
// 			hasActivePaymentMethod: true,
// 			activePaymentMethods: [],
// 		},
// 		refundResult: {
// 			refundAttempt: {
// 				Success: true,
// 			},
// 		},
// 	};
// 	const result = invoiceHasAtLeastOneProcessingFailure(invoice);
// 	expect(result).toBe(false);
// });
// it('should return true when invoice has no active subscription and no active payment method (even if all API calls succeed)', () => {
// 	const invoice: ProcessedInvoice = {
// 		invoiceId: 'INV-001',
// 		accountId: 'ACC-001',
// 		invoiceNumber: 'INV-001',
// 		invoiceBalance: 100,
// 		applyCreditToAccountBalanceResult: {
// 			applyCreditToAccountBalanceAttempt: {
// 				Success: true,
// 			},
// 		},
// 		activeSubResult: {
// 			checkForActiveSubAttempt: {
// 				Success: true,
// 			},
// 			hasActiveSubscription: false,
// 		},
// 		activePaymentMethodResult: {
// 			checkForActivePaymentMethodAttempt: {
// 				Success: true,
// 			},
// 			hasActivePaymentMethod: false,
// 			activePaymentMethods: [],
// 		},
// 	};
// 	const result = invoiceHasAtLeastOneProcessingFailure(invoice);
// 	expect(result).toBe(true);
// });
// it('should return false when invoice has no active subscription but has active payment method', () => {
// 	const invoice: ProcessedInvoice = {
// 		invoiceId: 'INV-001',
// 		accountId: 'ACC-001',
// 		invoiceNumber: 'INV-001',
// 		invoiceBalance: 100,
// 		applyCreditToAccountBalanceResult: {
// 			applyCreditToAccountBalanceAttempt: {
// 				Success: true,
// 			},
// 		},
// 		activeSubResult: {
// 			checkForActiveSubAttempt: {
// 				Success: true,
// 			},
// 			hasActiveSubscription: false,
// 		},
// 		activePaymentMethodResult: {
// 			checkForActivePaymentMethodAttempt: {
// 				Success: true,
// 			},
// 			hasActivePaymentMethod: true,
// 			activePaymentMethods: [],
// 		},
// 		refundResult: {
// 			refundAttempt: {
// 				Success: true,
// 			},
// 		},
// 	};
// 	const result = invoiceHasAtLeastOneProcessingFailure(invoice);
// 	expect(result).toBe(false);
// });
// it('should return false when invoice has active subscription', () => {
// 	const invoice: ProcessedInvoice = {
// 		invoiceId: 'INV-001',
// 		accountId: 'ACC-001',
// 		invoiceNumber: 'INV-001',
// 		invoiceBalance: 100,
// 		applyCreditToAccountBalanceResult: {
// 			applyCreditToAccountBalanceAttempt: {
// 				Success: true,
// 			},
// 		},
// 		activeSubResult: {
// 			checkForActiveSubAttempt: {
// 				Success: true,
// 			},
// 			hasActiveSubscription: true,
// 		},
// 	};
// 	const result = invoiceHasAtLeastOneProcessingFailure(invoice);
// 	expect(result).toBe(false);
// });
// it('should return true when refundResult fails', () => {
// 	const invoice: ProcessedInvoice = {
// 		invoiceId: 'INV-001',
// 		accountId: 'ACC-001',
// 		invoiceNumber: 'INV-001',
// 		invoiceBalance: 100,
// 		applyCreditToAccountBalanceResult: {
// 			applyCreditToAccountBalanceAttempt: {
// 				Success: true,
// 			},
// 		},
// 		activeSubResult: {
// 			checkForActiveSubAttempt: {
// 				Success: true,
// 			},
// 			hasActiveSubscription: false,
// 		},
// 		activePaymentMethodResult: {
// 			checkForActivePaymentMethodAttempt: {
// 				Success: true,
// 			},
// 			hasActivePaymentMethod: true,
// 			activePaymentMethods: [],
// 		},
// 		refundResult: {
// 			refundAttempt: {
// 				Success: false,
// 			},
// 			error: 'Refund failed',
// 		},
// 	};
// 	const result = invoiceHasAtLeastOneProcessingFailure(invoice);
// 	expect(result).toBe(true);
// });
// });

// describe('failureExistsOnInvoiceProcessingAttempt', () => {
// 	it('should return true when s3UploadAttemptStatus is error', async () => {
// 		const processedInvoices: ProcessedInvoice[] = [
// 			{
// 				invoiceId: 'INV-001',
// 				accountId: 'ACC-001',
// 				invoiceNumber: 'INV-001',
// 				invoiceBalance: 100,
// 				applyCreditToAccountBalanceResult: {
// 					applyCreditToAccountBalanceAttempt: {
// 						Success: true,
// 					},
// 				},
// 				activeSubResult: {
// 					checkForActiveSubAttempt: {
// 						Success: true,
// 					},
// 					hasActiveSubscription: true,
// 				},
// 				activePaymentMethodResult: {
// 					checkForActivePaymentMethodAttempt: {
// 						Success: true,
// 					},
// 					hasActivePaymentMethod: true,
// 					activePaymentMethods: [],
// 				},
// 			},
// 		];
// 		const result = await failureExistsOnInvoiceProcessingAttempt(
// 			processedInvoices,
// 			'error',
// 		);
// 		expect(result).toBe(true);
// 	});
// });
