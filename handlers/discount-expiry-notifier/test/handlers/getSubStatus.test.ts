import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { handler } from '../../src/handlers/getSubStatus';
import { BigQueryRecordSchema } from '../../src/types';

jest.mock('@modules/zuora/zuoraClient');
jest.mock('@modules/zuora/getSubscription');
describe('getSubStatus handler', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		process.env.Stage = 'CODE';
	});

	it('should return subscription status when event is valid', async () => {
		const mockEvent = {
			billingAccountId: 'A-S001',
			firstName: 'David',
			nextPaymentDate: '2025-03-22',
			paymentAmount: 1.23,
			paymentCurrency: 'GBP',
			paymentFrequency: 'Month',
			productName: 'GW',
			sfContactId: '0039E00001HiIGlQAN',
			zuoraSubName: 'A-S00424163',
			workEmail: 'david.pepper@guardian.co.uk',
			contactCountry: 'united states of america',
			sfBuyerContactMailingCountry: 'united states of america',
			sfBuyerContactOtherCountry: 'united states of america',
			sfRecipientContactMailingCountry: 'united states of america',
			sfRecipientContactOtherCountry: 'united states of america',
			subStatus: 'Active',
		};

		const mockParsedEvent = BigQueryRecordSchema.parse(mockEvent);
		const mockZuoraClient = { someClientProperty: 'value' };
		const mockGetSubResponse = { status: 'Active' };

		(ZuoraClient.create as jest.Mock).mockResolvedValue(mockZuoraClient);
		(getSubscription as jest.Mock).mockResolvedValue(mockGetSubResponse);

		const result = await handler(mockEvent);

		expect(result).toEqual({
			...mockParsedEvent,
			subStatus: 'Active',
		});
	});

	it('should return error status when an error occurs', async () => {
		const mockEvent = {
			billingAccountId: 'A-S001',
			firstName: 'David',
			nextPaymentDate: '2025-03-22',
			paymentAmount: 1.23,
			paymentCurrency: 'GBP',
			paymentFrequency: 'Month',
			productName: 'GW',
			sfContactId: '0039E00001HiIGlQAN',
			zuoraSubName: 'A-S00424163',
			workEmail: 'david.pepper@guardian.co.uk',
			contactCountry: 'united states of america',
			sfBuyerContactMailingCountry: 'united states of america',
			sfBuyerContactOtherCountry: 'united states of america',
			sfRecipientContactMailingCountry: 'united states of america',
			sfRecipientContactOtherCountry: 'united states of america',
			subStatus: 'Active',
		};

		const mockError = new Error('Some error');
		(ZuoraClient.create as jest.Mock).mockRejectedValue(mockError);

		const result = await handler(mockEvent);

		expect(result).toEqual({
			...mockEvent,
			subStatus: 'Error',
			errorDetail: 'Some error',
		});
	});
});
