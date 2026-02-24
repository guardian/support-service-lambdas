import type { VoucherProvider, VoucherRepository } from './ports';
import type { SqsMessage, VoucherRecord } from './schemas';

export async function processVoucherRequest(
	message: SqsMessage,
	voucherProvider: VoucherProvider,
	voucherRepository: VoucherRepository,
): Promise<VoucherRecord> {
	const voucher = await voucherProvider.requestVoucher(message.voucherType);

	const record: VoucherRecord = {
		identityId: message.identityId,
		requestTimestamp: new Date().toISOString(),
		email: message.email,
		voucherType: message.voucherType,
		voucherCode: voucher.voucherCode,
		expiryDate: voucher.expiryDate,
		status: 'SUCCESS',
	};

	await voucherRepository.save(record);
	return record;
}
