import type { SfClient } from '@modules/salesforce/sfClient';
import { doCompositeCallout } from '@modules/salesforce/updateRecords';
import { clearSalesforceContactIds } from '../../src/services';

jest.mock('@modules/salesforce/updateRecords', () => ({
	doCompositeCallout: jest.fn(),
}));

const mockDoCompositeCallout = jest.mocked(doCompositeCallout);

describe('clearSalesforceContactIds', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('clears every Contact using Salesforce null updates in batches', async () => {
		const contactIds = Array.from(
			{ length: 201 },
			(_, index) => `contact-${index}`,
		);
		mockDoCompositeCallout
			.mockResolvedValueOnce(
				Array.from({ length: 200 }, () => ({ success: true, errors: [] })),
			)
			.mockResolvedValueOnce([{ success: true, errors: [] }]);

		await expect(
			clearSalesforceContactIds({} as SfClient, contactIds),
		).resolves.toBe(201);

		expect(mockDoCompositeCallout).toHaveBeenCalledTimes(2);
		const firstCall = mockDoCompositeCallout.mock.calls[0];
		if (firstCall === undefined) {
			throw new Error('Expected a Salesforce composite call');
		}
		const [, path, body] = firstCall;
		expect(path).toBe('/services/data/v59.0/composite/sobjects');
		if (!('allOrNone' in body) || !('records' in body)) {
			throw new Error('Expected a Salesforce composite request');
		}
		if (!Array.isArray(body.records)) {
			throw new Error('Expected Salesforce composite records');
		}
		expect(body.allOrNone).toBe(false);
		expect(body.records).toHaveLength(200);
		expect(body.records[0]).toEqual({
			attributes: { type: 'Contact' },
			Id: 'contact-0',
			IdentityID__c: null,
		});
	});

	it('fails the message when Salesforce does not update every Contact', async () => {
		mockDoCompositeCallout.mockResolvedValueOnce([
			{ success: false, errors: [{ message: 'update failed', fields: [] }] },
		]);

		await expect(
			clearSalesforceContactIds({} as SfClient, ['contact-1']),
		).rejects.toThrow('Salesforce did not clear the Identity ID');
	});
});
