import dayjs from 'dayjs';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { removePendingUpdateAmendments } from '../../../src/changePlan/action/amendments';

const mockZuoraClient = {
	get: vi.fn(),
	delete: vi.fn(),
};

const today = dayjs('2025-09-16');

const pendingUpdateAmendment = {
	id: 'amendment-id',
	customerAcceptanceDate: '2099-01-01', // future = pending
	status: 'Completed',
	type: 'UpdateProduct',
};

describe('removePendingUpdateAmendments', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('deletes a pending amendment then rechecks and stops when none remain', async () => {
		mockZuoraClient.get
			.mockResolvedValueOnce(pendingUpdateAmendment)
			.mockResolvedValueOnce(undefined);
		mockZuoraClient.delete.mockResolvedValue({ success: true });

		await removePendingUpdateAmendments(
			mockZuoraClient as unknown as ZuoraClient,
			'A-S12345',
			today,
		);

		expect(mockZuoraClient.delete).toHaveBeenCalledTimes(1);
		expect(mockZuoraClient.delete).toHaveBeenCalledWith(
			'v1/object/amendment/amendment-id',
			expect.anything(),
		);
		expect(mockZuoraClient.get).toHaveBeenCalledTimes(2);
	});

	test('deletes multiple amendments recursively until none remain', async () => {
		mockZuoraClient.get
			.mockResolvedValueOnce({ ...pendingUpdateAmendment, id: 'amendment-1' })
			.mockResolvedValueOnce({ ...pendingUpdateAmendment, id: 'amendment-2' })
			.mockResolvedValueOnce(undefined);
		mockZuoraClient.delete.mockResolvedValue({ success: true });

		await removePendingUpdateAmendments(
			mockZuoraClient as unknown as ZuoraClient,
			'A-S12345',
			today,
		);

		expect(mockZuoraClient.delete).toHaveBeenCalledTimes(2);
		expect(mockZuoraClient.get).toHaveBeenCalledTimes(3);
	});

	test('does not delete when no amendment exists', async () => {
		mockZuoraClient.get.mockResolvedValueOnce(undefined);

		await removePendingUpdateAmendments(
			mockZuoraClient as unknown as ZuoraClient,
			'A-S12345',
			today,
		);

		expect(mockZuoraClient.delete).not.toHaveBeenCalled();
	});

	test('does not delete when amendment customerAcceptanceDate is in the past', async () => {
		mockZuoraClient.get.mockResolvedValueOnce({
			...pendingUpdateAmendment,
			customerAcceptanceDate: '2020-01-01',
		});

		await removePendingUpdateAmendments(
			mockZuoraClient as unknown as ZuoraClient,
			'A-S12345',
			today,
		);

		expect(mockZuoraClient.delete).not.toHaveBeenCalled();
	});

	test('does not delete when amendment type is not UpdateProduct', async () => {
		mockZuoraClient.get.mockResolvedValueOnce({
			...pendingUpdateAmendment,
			type: 'NewProduct',
		});

		await removePendingUpdateAmendments(
			mockZuoraClient as unknown as ZuoraClient,
			'A-S12345',
			today,
		);

		expect(mockZuoraClient.delete).not.toHaveBeenCalled();
	});

	test('does not delete when amendment status is not Completed', async () => {
		mockZuoraClient.get.mockResolvedValueOnce({
			...pendingUpdateAmendment,
			status: 'Pending',
		});

		await removePendingUpdateAmendments(
			mockZuoraClient as unknown as ZuoraClient,
			'A-S12345',
			today,
		);

		expect(mockZuoraClient.delete).not.toHaveBeenCalled();
	});
});
