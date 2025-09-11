import type { Logger } from '@modules/logger';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import type {
	ListenDisputeClosedRequestBody,
	ListenDisputeCreatedRequestBody,
} from '../dtos';
import type {
	PaymentDisputeRecord,
	ZuoraInvoiceFromStripeChargeIdResult,
} from '../interfaces';
import { mapStripeDisputeToSalesforce } from '../mappers';
import type {
	SalesforceAuthResponse,
	SalesforceCredentials,
	SalesforceUpsertResponse,
} from '../types';
import { authenticateWithSalesforce } from './salesforceAuth';
import { upsertPaymentDisputeInSalesforce } from './salesforceCreate';

export const upsertSalesforceObject = async (
	logger: Logger,
	dataFromStripe:
		| ListenDisputeCreatedRequestBody
		| ListenDisputeClosedRequestBody,
	zuoraData?: ZuoraInvoiceFromStripeChargeIdResult,
): Promise<SalesforceUpsertResponse> => {
	logger.log('Starting upsertSalesforceObject process');

	const salesforceCredentials = await getSecretValue<SalesforceCredentials>(
		`${stageFromEnvironment()}/Salesforce/ConnectedApp/StripeDisputeWebhooks`,
	);

	const salesforceAuth: SalesforceAuthResponse =
		await authenticateWithSalesforce(logger, salesforceCredentials);

	const paymentDisputeRecord: PaymentDisputeRecord =
		mapStripeDisputeToSalesforce(dataFromStripe, zuoraData);

	logger.log(
		'Mapped Payment Dispute record:',
		JSON.stringify(paymentDisputeRecord),
	);

	return upsertPaymentDisputeInSalesforce(
		salesforceAuth,
		paymentDisputeRecord,
		logger,
	);
};
