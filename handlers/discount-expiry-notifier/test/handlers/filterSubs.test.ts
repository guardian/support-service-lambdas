import { getIfDefined } from '@modules/nullAndUndefined';
import { handler } from '../../src/handlers/filterSubs';
// import { testQueryResponse } from '../../src/testQueryResponse';

jest.mock('@modules/nullAndUndefined');

describe('filterSubs handler', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		process.env.FILTER_BY_REGIONS = 'United States,United States of America';
	});

	it('should filter subscriptions based on region', async () => {
		(getIfDefined as jest.Mock).mockImplementation((envVar, errorMessage) => {
			if (envVar === process.env.FILTER_BY_REGIONS) {
				return process.env.FILTER_BY_REGIONS;
			}
			throw new Error(errorMessage as string);
		});

		const event = {
			discountExpiresOnDate: '2024-03-21',
			allRecordsFromBigQuery: [
				{
					firstName: 'John',
					nextPaymentDate: '2024-04-21',
					paymentAmount: 100,
					paymentCurrency: 'USD',
					paymentFrequency: 'Monthly',
					productName: 'Product A',
					sfContactId: '001',
					zuoraSubName: 'A-S001',
					workEmail: 'john@example.com',
					contactCountry: 'United States',
					sfBuyerContactMailingCountry: 'Canada',
					sfBuyerContactOtherCountry: 'Mexico',
					sfRecipientContactMailingCountry: 'Brazil',
					sfRecipientContactOtherCountry: 'Argentina',
				},
				{
					firstName: 'Jane',
					nextPaymentDate: '2024-05-21',
					paymentAmount: 200,
					paymentCurrency: 'USD',
					paymentFrequency: 'Monthly',
					productName: 'Product B',
					sfContactId: '002',
					zuoraSubName: 'A-S002',
					workEmail: 'jane@example.com',
					contactCountry: '',
					sfBuyerContactMailingCountry: 'United states of america',
					sfBuyerContactOtherCountry: 'Mexico',
					sfRecipientContactMailingCountry: 'Brazil',
					sfRecipientContactOtherCountry: 'Argentina',
				},
				{
					firstName: 'Doe',
					nextPaymentDate: '2024-06-21',
					paymentAmount: 300,
					paymentCurrency: 'USD',
					paymentFrequency: 'Monthly',
					productName: 'Product C',
					sfContactId: '003',
					zuoraSubName: 'A-S003',
					workEmail: 'doe@example.com',
					contactCountry: 'Canada',
					sfBuyerContactMailingCountry: 'Mexico',
					sfBuyerContactOtherCountry: 'Mexico',
					sfRecipientContactMailingCountry: 'Brazil',
					sfRecipientContactOtherCountry: 'Argentina',
				},
			],
		};

		const result = await handler(event);

		expect(result).toBeDefined();
		expect(result.recordsForEmailSend).toBeInstanceOf(Array);
		expect(result.recordsForEmailSend.length).toBe(2);
		expect(
			result.recordsForEmailSend.some((sub) => sub.zuoraSubName === 'A-S001'),
		).toBe(true);
		expect(
			result.recordsForEmailSend.some((sub) => sub.zuoraSubName === 'A-S002'),
		).toBe(true);
		expect(
			result.recordsForEmailSend.some((sub) => sub.zuoraSubName === 'A-S003'),
		).toBe(false);
	});

	// it('should return an empty array if no subscriptions match the regions', async () => {
	// 	(getIfDefined as jest.Mock).mockReturnValue('UK');

	// 	const event = {
	// 		discountExpiresOnDate: '2024-03-21',
	// 		allRecordsFromBigQuery: testQueryResponse,
	// 	};

	// 	const result = await handler(event);

	// 	expect(result).toBeDefined();
	// 	expect(result.recordsForEmailSend).toBeInstanceOf(Array);
	// 	expect(result.recordsForEmailSend.length).toBe(0);
	// });

	// it('should throw an error if FILTER_BY_REGIONS is not set', async () => {
	// 	(getIfDefined as jest.Mock).mockImplementation(() => {
	// 		throw new Error('FILTER_BY_REGIONS environment variable not set');
	// 	});

	// 	const event = {
	// 		discountExpiresOnDate: '2024-03-21',
	// 		allRecordsFromBigQuery: testQueryResponse,
	// 	};

	// 	await expect(handler(event)).rejects.toThrow(
	// 		'FILTER_BY_REGIONS environment variable not set',
	// 	);
	// });
});
