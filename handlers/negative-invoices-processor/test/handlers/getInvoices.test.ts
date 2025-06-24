import { getCODEData } from '../../src/handlers/getInvoices';
import { CODEDataMockQueryResponse } from './data/CODEDataMockQueryResponse';

describe('getCODEData', () => {
	it('should resolve to CODEDataMockQueryResponse', async () => {
		const data = await getCODEData();
		expect(data).toEqual(CODEDataMockQueryResponse);
	});

	it('should return an array', async () => {
		const data = await getCODEData();
		expect(Array.isArray(data)).toBe(true);
	});

	it('should return the correct number of records', async () => {
		const data = await getCODEData();
		expect(data.length).toBe(CODEDataMockQueryResponse.length);
	});

	it('should return records with expected fields', async () => {
		const data = await getCODEData();
		if (data.length > 0) {
			expect(data[0]).toHaveProperty('id');
			expect(data[0]).toHaveProperty('invoiceNumber');
			expect(data[0]).toHaveProperty('accountId');
			expect(data[0]).toHaveProperty('invoiceBalance');
		}
	});
});
