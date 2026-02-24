import { DataExtensionNames, sendEmail } from '@modules/email/email';
import type { Stage } from '@modules/stage';
import type { EmailSender } from '../domain/ports';
import type { VoucherRecord } from '../domain/schemas';

export class BrazeEmailSender implements EmailSender {
	constructor(private readonly stage: Stage) {}

	async sendVoucherConfirmation(record: VoucherRecord): Promise<void> {
		await sendEmail(this.stage, {
			DataExtensionName: DataExtensionNames.imovoVoucherReward,
			IdentityUserId: record.identityId,
			To: {
				Address: record.email,
				ContactAttributes: {
					SubscriberAttributes: {
						voucher_code: record.voucherCode,
						expiry_date: record.expiryDate,
						voucher_type: record.voucherType,
					},
				},
			},
		});
	}
}
