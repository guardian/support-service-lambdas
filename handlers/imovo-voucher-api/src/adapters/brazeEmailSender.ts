import { DataExtensionNames, sendEmail } from '@modules/email/email';
import type { Stage } from '@modules/stage';
import type { EmailSender } from '../domain/ports';
import type { VoucherRecord } from '../domain/schemas';

function formatVoucherEndDate(isoDate: string): string {
	const date = new Date(isoDate);
	return date.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
}

export class BrazeEmailSender implements EmailSender {
	constructor(
		private readonly stage: Stage,
		private readonly voucherBaseUrl: string,
	) {}

	async sendVoucherConfirmation(record: VoucherRecord): Promise<void> {
		const voucherUrl = `${this.voucherBaseUrl}/${record.voucherCode}/go`;
		const voucherEndDate = formatVoucherEndDate(record.expiryDate);

		await sendEmail(this.stage, {
			DataExtensionName: DataExtensionNames.imovoVoucherReward,
			IdentityUserId: record.identityId,
			To: {
				Address: record.email,
				ContactAttributes: {
					SubscriberAttributes: {
						voucher_code: record.voucherCode,
						voucher_url: voucherUrl,
						expiry_date: record.expiryDate,
						voucher_end_date: voucherEndDate,
						voucher_type: record.voucherType,
					},
				},
			},
		});
	}
}
