import { getCODEData, getPRODData } from '../../src/handlers/getInvoices';
import {
	InvoiceRecordsArraySchema,
	InvoiceSchema,
} from '../../src/types/handlerInputsAndOutputs/ApplyCreditToAccountBalance';
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
			const keys = InvoiceSchema.keyof().options;
			for (const key of keys) {
				expect(data[0]).toHaveProperty(key);
			}
		}
	});
});

jest.mock('@modules/aws/ssm', () => ({
	getSSMParam: jest.fn().mockResolvedValue('mock-gcp-config'),
}));
jest.mock('@modules/bigquery/src/bigquery', () => ({
	buildAuthClient: jest.fn().mockResolvedValue('mock-auth-client'),
	runQuery: jest.fn().mockResolvedValue([
		[
			{
				invoiceId: '1',
				invoiceNumber: 'INV-001',
				accountId: 'ACC-001',
				invoiceBalance: 100,
			},
		],
	]),
}));
jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn().mockReturnValue('PROD'),
}));

describe('getPRODData', () => {
	it('should return parsed invoice records from BigQuery', async () => {
		const data = await getPRODData();
		expect(Array.isArray(data)).toBe(true);
		const keys = InvoiceSchema.keyof().options;
		for (const key of keys) {
			expect(data[0]).toHaveProperty(key);
		}

		expect(() => InvoiceRecordsArraySchema.parse(data)).not.toThrow();
	});
});
