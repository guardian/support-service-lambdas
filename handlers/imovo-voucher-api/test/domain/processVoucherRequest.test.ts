import type {
	VoucherProvider,
	VoucherRepository,
} from '../../src/domain/ports';
import { processVoucherRequest } from '../../src/domain/processVoucherRequest';
import type { SqsMessage, VoucherRecord } from '../../src/domain/schemas';

const testMessage: SqsMessage = {
	email: 'test@example.com',
	identityId: 'user-123',
	voucherType: 'DIGITAL_REWARD',
};

const fakeProvider: VoucherProvider = {
	requestVoucher: () =>
		Promise.resolve({
			VoucherCode: 'TEST-CODE',
			ExpiryDate: '2026-12-31',
		}),
};

describe('processVoucherRequest', () => {
	it('processes a voucher request and saves it', async () => {
		const savedRecords: VoucherRecord[] = [];
		const fakeRepository: VoucherRepository = {
			save: (record) => {
				savedRecords.push(record);
				return Promise.resolve();
			},
		};

		const result = await processVoucherRequest(
			testMessage,
			fakeProvider,
			fakeRepository,
		);

		expect(result.voucherCode).toBe('TEST-CODE');
		expect(result.expiryDate).toBe('2026-12-31');
		expect(result.identityId).toBe('user-123');
		expect(result.email).toBe('test@example.com');
		expect(result.voucherType).toBe('DIGITAL_REWARD');
		expect(result.status).toBe('SUCCESS');
		expect(result.requestTimestamp).toBeDefined();
		expect(savedRecords).toHaveLength(1);
		expect(savedRecords[0]).toEqual(result);
	});

	it('propagates provider errors', async () => {
		const failingProvider: VoucherProvider = {
			requestVoucher: () => Promise.reject(new Error('API unavailable')),
		};
		const fakeRepository: VoucherRepository = {
			save: () => Promise.resolve(),
		};

		await expect(
			processVoucherRequest(testMessage, failingProvider, fakeRepository),
		).rejects.toThrow('API unavailable');
	});

	it('propagates repository errors', async () => {
		const failingRepository: VoucherRepository = {
			save: () => Promise.reject(new Error('DynamoDB error')),
		};

		await expect(
			processVoucherRequest(testMessage, fakeProvider, failingRepository),
		).rejects.toThrow('DynamoDB error');
	});
});
