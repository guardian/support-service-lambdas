import type { Logger } from '@modules/routing/logger';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ListenDisputeCreatedRequestBody } from '../dtos';
import type { ZuoraInvoiceFromStripeChargeIdResult } from '../interfaces';
import {
	upsertSalesforceObject,
	zuoraGetInvoiceFromStripeChargeId,
} from '../services';
import type { SalesforceUpsertResponse } from '../types';

export async function handleListenDisputeCreated(
	logger: Logger,
	webhookData: ListenDisputeCreatedRequestBody,
	disputeId: string,
): Promise<SalesforceUpsertResponse | null> {
	logger.log(`Processing dispute creation for dispute ${disputeId}`);

	// Skip SEPA payment disputes (they don't have payment_method_details)
	if (!webhookData.data.object.payment_method_details) {
		logger.log(
			`Skipping dispute ${disputeId} - no payment_method_details (likely SEPA payment)`,
		);
		return null;
	}

	const paymentId = webhookData.data.object.charge;
	logger.log(`Payment ID from dispute: ${paymentId}`);

	// Get Zuora invoice data
	let invoiceFromZuora: ZuoraInvoiceFromStripeChargeIdResult | undefined;
	try {
		const stage = stageFromEnvironment();
		const zuoraClient: ZuoraClient = await ZuoraClient.create(stage);

		invoiceFromZuora = await zuoraGetInvoiceFromStripeChargeId(
			paymentId,
			zuoraClient,
		);

		logger.log(
			'Zuora invoice data retrieved:',
			JSON.stringify(invoiceFromZuora),
		);
	} catch (error) {
		logger.error('Failed to fetch Zuora invoice data:', error);
		// Continue without Zuora data - it's better to create the Salesforce record without complete data than to fail entirely
	}

	const upsertSalesforceObjectResponse: SalesforceUpsertResponse =
		await upsertSalesforceObject(logger, webhookData, invoiceFromZuora);

	logger.log(
		'Salesforce upsert response for dispute creation:',
		JSON.stringify(upsertSalesforceObjectResponse),
	);

	logger.log(
		`Successfully processed dispute creation for dispute ${disputeId}`,
	);

	return upsertSalesforceObjectResponse;
}
