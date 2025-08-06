import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	AnyOrderRequest,
	executeOrderRequest,
} from '@modules/zuora/orders/orderRequests';
import { z } from 'zod';
import { Currency } from '@modules/internationalisation/currency';
import {
	buildNewAccountObject,
	Contact,
	PaymentGateway,
	PaymentMethod,
} from '@modules/zuora/orders/newAccount';
import dayjs, { Dayjs } from 'dayjs';
import { buildCreateSubscriptionOrderAction } from '@modules/zuora/orders/orderActions';
import { zuoraDateFormat } from '@modules/zuora/utils';

const createSubscriptionResponseSchema = z.object({
	orderNumber: z.string(),
	accountNumber: z.string(),
	subscriptionNumbers: z.array(z.string()),
	invoiceNumbers: z.array(z.string()).optional(),
	paymentNumber: z.string().optional(),
	paidAmount: z.number().optional(),
});

export type CreateSubscriptionResponse = z.infer<
	typeof createSubscriptionResponseSchema
>;

type CreateSubscriptionInputFields<T extends PaymentMethod> = {
	accountName: string;
	createdRequestId: string;
	salesforceAccountId: string;
	salesforceContactId: string;
	identityId: string;
	currency: Currency;
	paymentGateway: PaymentGateway<T>;
	paymentMethod: T;
	billToContact: Contact;
	soldToContact?: Contact;
	productRatePlanId: string;
	contractEffectiveDate: Dayjs;
	customerAcceptanceDate?: Dayjs;
	chargeOverride?: { productRatePlanChargeId: string; overrideAmount: number };
	runBilling?: boolean;
	collectPayment?: boolean;
};

const buildCreateSubscriptionRequest = <T extends PaymentMethod>({
	accountName,
	createdRequestId,
	salesforceAccountId,
	salesforceContactId,
	identityId,
	currency,
	paymentGateway,
	paymentMethod,
	billToContact,
	soldToContact,
	productRatePlanId,
	contractEffectiveDate,
	customerAcceptanceDate,
	chargeOverride,
	runBilling,
	collectPayment,
}: CreateSubscriptionInputFields<T>): AnyOrderRequest => {
	const newAccount = buildNewAccountObject({
		accountName: accountName,
		createdRequestId: createdRequestId,
		salesforceAccountId: salesforceAccountId,
		salesforceContactId: salesforceContactId,
		identityId: identityId,
		currency: currency,
		paymentGateway: paymentGateway,
		paymentMethod: paymentMethod,
		billToContact: billToContact,
		soldToContact: soldToContact,
	});
	const createSubscriptionOrderAction = buildCreateSubscriptionOrderAction({
		productRatePlanId: productRatePlanId,
		contractEffectiveDate: contractEffectiveDate,
		customerAcceptanceDate: customerAcceptanceDate,
		chargeOverride: chargeOverride,
	});
	return {
		newAccount: newAccount,
		orderDate: zuoraDateFormat(dayjs()),
		description: `Created by createSubscription.ts in support-service-lambdas`,
		subscriptions: [
			{
				orderActions: [createSubscriptionOrderAction],
			},
		],
		processingOptions: {
			runBilling: runBilling ?? false,
			collectPayment: collectPayment ?? false,
		},
	};
};
export const createSubscription = async <T extends PaymentMethod>(
	zuoraClient: ZuoraClient,
	inputFields: CreateSubscriptionInputFields<T>,
): Promise<CreateSubscriptionResponse> => {
	return executeOrderRequest(
		zuoraClient,
		buildCreateSubscriptionRequest(inputFields),
		createSubscriptionResponseSchema,
	);
};
