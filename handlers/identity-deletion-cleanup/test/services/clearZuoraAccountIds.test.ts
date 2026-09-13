import { update } from '@modules/zuora/actions';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { clearZuoraAccountIds } from '../../src/services';

jest.mock('@modules/zuora/actions', () => ({
	update: jest.fn(),
}));

const mockUpdate = jest.mocked(update);

describe('clearZuoraAccountIds', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('clears every Customer Account through action/update in batches', async () => {
		const accountIds = Array.from(
			{ length: 51 },
			(_, index) => `account-${index}`,
		);
		mockUpdate
			.mockResolvedValueOnce(
				Array.from({ length: 50 }, (_, index) => ({
					Id: `account-${index}`,
					Success: true,
				})),
			)
			.mockResolvedValueOnce([{ Id: 'account-50', Success: true }]);

		await expect(
			clearZuoraAccountIds({} as ZuoraClient, accountIds),
		).resolves.toBe(51);

		expect(mockUpdate).toHaveBeenCalledTimes(2);
		const firstCall = mockUpdate.mock.calls[0];
		if (firstCall === undefined) {
			throw new Error('Expected a Zuora action/update call');
		}
		const [, rawBody] = firstCall;
		const body: unknown = JSON.parse(rawBody);
		if (
			typeof body !== 'object' ||
			body === null ||
			!('type' in body) ||
			!('objects' in body)
		) {
			throw new Error('Expected a Zuora action/update request');
		}
		if (!Array.isArray(body.objects)) {
			throw new Error('Expected Zuora action/update objects');
		}
		expect(body.type).toBe('Account');
		expect(body.objects).toHaveLength(50);
		expect(body.objects[0]).toEqual({
			Id: 'account-0',
			fieldsToNull: ['IdentityId__c'],
		});
	});

	it('fails the message when Zuora does not update every Customer Account', async () => {
		mockUpdate.mockResolvedValueOnce([
			{ Id: 'account-1', Success: false, Errors: [] },
		]);

		await expect(
			clearZuoraAccountIds({} as ZuoraClient, ['account-1']),
		).rejects.toThrow('Zuora did not clear the Identity ID');
	});
});
