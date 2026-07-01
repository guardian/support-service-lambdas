import type { EmailMessageWithUserId } from '@modules/email/email';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type { GetInvoiceResponse } from '@modules/zuora/types';
import {
	zuoraAccountSchema,
	zuoraSubscriptionSchema,
} from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import dayjs from 'dayjs';
import zuoraCatalogFixture from '../../../../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import type { CreateSwitchOrder } from '../../../../src/changePlan/action/createSwitchOrder';
import { DoSwitchAction } from '../../../../src/changePlan/action/switch';
import { getAccountInformation } from '../../../../src/changePlan/prepare/accountInformation';
import { SwitchOrderRequestBuilder } from '../../../../src/changePlan/prepare/buildSwitchOrderRequest';
import { getSubscriptionInformation } from '../../../../src/changePlan/prepare/subscriptionInformation';
import { supporterPlusTargetInformation } from '../../../../src/changePlan/switchDefinition/supporterPlusTargetInformation';
import accountJson from '../../../fixtures/account.json';
import subscriptionJson from '../../../fixtures/pendingAmendments.json';
import { loadSubscription } from '../../prepare/subscriptionInformation.test';

const mockZuoraClient = {
	get: jest.fn(),
	post: jest.fn(),
	delete: jest.fn(),
};

const productCatalog = generateProductCatalog(
	zuoraCatalogSchema.parse(zuoraCatalogFixture),
);

const { subscription } = loadSubscription(
	zuoraSubscriptionSchema.parse(subscriptionJson),
	dayjs('2024-12-05'),
);
const account = zuoraAccountSchema.parse(accountJson);

const targetInformation = supporterPlusTargetInformation.fromUserInformation(
	productCatalog.SupporterPlus.ratePlans.Annual,
	{
		mode: 'switchToBasePrice',
		currency: 'GBP',
		previousAmount: 10,
		includesContribution: false,
	},
);

const subscriptionInformation = getSubscriptionInformation(subscription);
const accountInformation = getAccountInformation(account);

const switchInformation = {
	account: accountInformation,
	subscription: subscriptionInformation,
	target: targetInformation,
};

const orderRequest = new SwitchOrderRequestBuilder(
	targetInformation.productRatePlanId,
	targetInformation.contributionCharge,
	targetInformation.discount?.productRatePlanId['CODE'],
	subscriptionInformation,
);

// Zero-amount invoice so takePaymentOrAdjustInvoice returns immediately without a payment call
const zeroAmountInvoice: GetInvoiceResponse = {
	id: 'invoice-1',
	amount: 0,
	amountWithoutTax: 0,
	balance: 0,
	accountId: 'acc-1',
};

const buildDoSwitchAction = (
	createSwitchOrder: CreateSwitchOrder,
	sendEmail = jest.fn().mockResolvedValue(undefined),
) =>
	new DoSwitchAction(
		mockZuoraClient as unknown as ZuoraClient,
		'CODE',
		dayjs('2025-09-16'),
		createSwitchOrder,
		sendEmail,
	);

describe('DoSwitchAction', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('next payment in the email is assumed to be the catalog price, one billing period after today', async () => {
		const nextPaymentTotal = 120;

		mockZuoraClient.get.mockResolvedValueOnce(zeroAmountInvoice);

		const createSwitchOrderMock = {
			execute: jest.fn().mockImplementation(() => {
				return Promise.resolve('invoice-id');
			}),
		} as unknown as CreateSwitchOrder;

		const sendEmailMock = jest.fn().mockResolvedValue(undefined);

		await buildDoSwitchAction(createSwitchOrderMock, sendEmailMock).switch(
			{ caseId: 'case-1', csrUserId: 'csr-1' },
			switchInformation,
			orderRequest,
		);

		// email contains the values from the billing preview, not any precomputed amount
		const [, emailMessage] = sendEmailMock.mock.calls[0] as [
			unknown,
			EmailMessageWithUserId,
		];
		const attrs = emailMessage.To.ContactAttributes.SubscriberAttributes;
		expect(attrs.next_payment_amount).toBe(nextPaymentTotal.toFixed(2));
		expect(attrs.date_of_next_payment).toBe('16 September 2026');
	});
});
