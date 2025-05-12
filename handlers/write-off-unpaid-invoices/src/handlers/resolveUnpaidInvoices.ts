import {
	createInvoiceItemAdjustments,
	type CreateInvoiceItemAdjustmentsInput,
} from '../services/createInvoiceItemAdjustments';
import {
	type WriteOffInvoiceInput,
	writeOffInvoices,
} from '../services/writeOffInvoices';

type RemediationStrategy = 'WriteOffInvoices' | 'CreateInvoiceItemAdjustments';

export type LambdaEvent<T> = {
	Items: Array<{
		item: T;
		comment: string;
		reasonCode: string;
		remediationStrategy: RemediationStrategy;
	}>;
};

export const handler = async (
	event: LambdaEvent<WriteOffInvoiceInput | CreateInvoiceItemAdjustmentsInput>,
) => {
	console.log(JSON.stringify(event, null, 2));

	const strategy = event.Items[0]?.remediationStrategy;

	if (strategy === 'WriteOffInvoices') {
		const castedEvent = event as LambdaEvent<WriteOffInvoiceInput>;
		await writeOffInvoices(castedEvent);
	} else if (strategy === 'CreateInvoiceItemAdjustments') {
		const castedEvent = event as LambdaEvent<CreateInvoiceItemAdjustmentsInput>;
		await createInvoiceItemAdjustments(castedEvent);
	} else {
		throw new Error('Please provide remediation strategy as input string');
	}
};
