import type { Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	getLastPaymentDateBeforeDiscountExpiry,
	getPastInvoiceItems,
	handleTargetDateBeforeToday,
} from '../../src/handlers/getOldPaymentAmount';
import type { GetOldPaymentAmountInput } from '../../src/handlers/getOldPaymentAmount';

jest.mock('@modules/zuora/zuoraClient');
jest.mock('@modules/zuora/query');
jest.mock('@modules/zuora/billingPreview');

jest.mock(
	'../../src/handlers/getOldPaymentAmount/getLastPaymentDateBeforeDiscountExpiry',
);
jest.mock('../../src/handlers/getOldPaymentAmount/getPastInvoiceItems');

// jest.mock('../../src/handlers/getOldPaymentAmount', () => ({
// 	getPastInvoiceItems: jest.fn(),
// }));

const stage: Stage = 'CODE';

describe('handleTargetDateBeforeToday', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const mockParsedEvent: GetOldPaymentAmountInput = {
		billingAccountId: 'A12345678',
		firstName: 'David',
		firstPaymentDateAfterDiscountExpiry: '2025-03-28',
		paymentCurrency: 'USD',
		paymentFrequency: 'Annual',
		productName: 'Digital Pack',
		sfContactId: '0030J00002Fy123456',
		zuoraSubName: 'A-S12345678',
		workEmail: 'david@guardian.co.uk',
		contactCountry: 'United States',
		sfBuyerContactMailingCountry: null,
		sfBuyerContactOtherCountry: 'United States',
		sfRecipientContactMailingCountry: null,
		sfRecipientContactOtherCountry: 'United States',
		subStatus: 'Active',
	};

	const mockLastPaymentDateBeforeDiscountExpiry = '2024-03-28';

	test('should return old payment amount when target date is before today', async () => {
		const zuoraClient = await ZuoraClient.create(stage);
		const mockOldPaymentAmount = 100;

		(getPastInvoiceItems as jest.Mock).mockResolvedValue({
			size: 1,
			records: [
				{
					SubscriptionNumber: 'A-S12345678',
					ServiceStartDate: '2024-03-28',
					ChargeAmount: mockOldPaymentAmount,
					TaxAmount: 0,
				},
			],
			done: true,
		});

		const result = await handleTargetDateBeforeToday(
			zuoraClient,
			mockParsedEvent,
			mockLastPaymentDateBeforeDiscountExpiry,
		);

		expect(result).toEqual({
			...mockParsedEvent,
			lastPaymentDateBeforeDiscountExpiry:
				mockLastPaymentDateBeforeDiscountExpiry,
			oldPaymentAmount: mockOldPaymentAmount,
		});
	}, 30000);
});
