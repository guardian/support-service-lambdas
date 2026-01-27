import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type { OrderAction } from '@modules/zuora/orders/orderActions';
import type { OrderRequest } from '@modules/zuora/orders/orderRequests';
import type {
	GetInvoiceResponse,
	ZuoraUpperCaseSuccess,
} from '@modules/zuora/types';
import {
	zuoraAccountSchema,
	zuoraSubscriptionSchema,
} from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import zuoraCatalogFixture from '../../../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import { DoPreviewAction } from '../../../src/changePlan/action/preview';
import { DoSwitchAction } from '../../../src/changePlan/action/switch';
import { getAccountInformation } from '../../../src/changePlan/prepare/accountInformation';
import { SwitchOrderRequestBuilder } from '../../../src/changePlan/prepare/buildSwitchOrderRequest';
import { getSubscriptionInformation } from '../../../src/changePlan/prepare/subscriptionInformation';
import type { TargetInformation } from '../../../src/changePlan/prepare/targetInformation';
import type { ZuoraSwitchResponse } from '../../../src/changePlan/schemas';
import { supporterPlusTargetInformation } from '../../../src/changePlan/switchDefinition/supporterPlusTargetInformation';
import accountJson from '../../fixtures/account.json';
import pendingAmendmentsJson from '../../fixtures/pendingAmendments.json';
import { loadSubscription } from '../prepare/subscriptionInformation.test';

const mockZuoraClient = {
	get: jest.fn(),
	post: jest.fn(),
	delete: jest.fn(),
};

const productCatalog = generateProductCatalog(zuoraCatalogFixture);

const { guardianSubscriptionWithKeys } = loadSubscription(
	zuoraSubscriptionSchema.parse(pendingAmendmentsJson),
	dayjs('2024-12-05'),
);
const account = zuoraAccountSchema.parse(accountJson);
//
// const today = dayjs('2024-12-05T22:42:06');

const getTestTargetInformation = async () =>
	await supporterPlusTargetInformation(
		productCatalog.SupporterPlus.ratePlans.Annual,
		{
			mode: 'switchToBasePrice',
			currency: 'GBP',
			previousAmount: 10,
			// 'CODE',
			// { preview: false },
			// subscription,
			// account,
			// productCatalog,
			// new Lazy(() => Promise.resolve([]), 'test'),
			// today,
		},
	);

function getOrderData() {
	const [url, body] = mockZuoraClient.post.mock.calls[0] as [string, string];
	const parsedBody = JSON.parse(body) as OrderRequest;
	const orderActions = parsedBody.subscriptions[0]?.orderActions ?? [];
	const orderTypes = orderActions.map((action: OrderAction) => action.type);
	return { url, orderTypes };
}

// pending amendment means the chargedThroughDate disappears to null, and the effective start date goes to "next payment date"
describe('pendingAmendments, e.g. contribution amount changes, are dealt with correctly', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('preview=true doesnt preview term changes as zuora wont allow it', async () => {
		mockZuoraClient.post.mockResolvedValueOnce({
			success: true,
			previewResult: {
				invoices: [
					{
						amount: 75,
						amountWithoutTax: 75,
						taxAmount: 0,
						targetDate: '2025-11-09',
						invoiceItems: [
							{
								serviceStartDate: '2025-11-09',
								serviceEndDate: '2025-11-09',
								amountWithoutTax: 75,
								taxAmount: 0,
								chargeName: 'splus',
								processingType: 'Charge',
								productName: 'Contributor',
								productRatePlanChargeId: '8a12892d85fc6df4018602451322287f',
								unitPrice: 75,
								subscriptionNumber: 'A-S12345984',
								additionalInfo: {
									quantity: 1,
									unitOfMeasure: '',
									numberOfDeliveries: 0.0,
								},
							},
							{
								serviceStartDate: '2025-11-09',
								serviceEndDate: '2025-11-09',
								amountWithoutTax: 75,
								taxAmount: 0,
								chargeName: 'splus',
								processingType: 'Charge',
								productName: 'Contributor',
								productRatePlanChargeId: '8a128ed885fc6ded01860228f7cb3d5f',
								unitPrice: 75,
								subscriptionNumber: 'A-S12345984',
								additionalInfo: {
									quantity: 1,
									unitOfMeasure: '',
									numberOfDeliveries: 0.0,
								},
							},
							{
								serviceStartDate: '2025-11-09',
								serviceEndDate: '2025-11-09',
								amountWithoutTax: 75,
								taxAmount: 0,
								chargeName: 'contrib',
								processingType: 'Charge',
								productName: 'Contributor',
								productRatePlanChargeId: '2c92a0fc5e1dc084015e37f58c7b0f34',
								unitPrice: 75,
								subscriptionNumber: 'A-S12345984',
								additionalInfo: {
									quantity: 1,
									unitOfMeasure: '',
									numberOfDeliveries: 0.0,
								},
							},
						],
					},
				],
			},
		});

		const switchInformation: TargetInformation =
			await getTestTargetInformation();

		const subscriptionInformation = getSubscriptionInformation(
			guardianSubscriptionWithKeys,
		);

		const orderRequest: SwitchOrderRequestBuilder =
			new SwitchOrderRequestBuilder(
				switchInformation.productRatePlanId,
				switchInformation.contributionCharge,
				switchInformation.discount?.productRatePlanId['CODE'],
				subscriptionInformation,
				true,
			);

		const result = await new DoPreviewAction(
			mockZuoraClient as unknown as ZuoraClient,
			'CODE',
			dayjs('2025-09-16'),
		).preview(subscriptionInformation, switchInformation, orderRequest);

		expect(result.amountPayableToday).toBe(75);
		expect(result.targetCatalogPrice).toBe(150);
		expect(result.proratedRefundAmount).toBe(75);
		expect(result.nextPaymentDate).toBe('2025-11-10');

		expect(mockZuoraClient.post).toHaveBeenCalled();
		const postCall = getOrderData();
		expect(postCall).toEqual({
			url: '/v1/orders/preview',
			orderTypes: ['ChangePlan'],
		});
		// redundant assertions just for clarity - T&C is used here to shorten the term - however there may be future dated amendments
		expect(postCall.orderTypes).not.toContain('TermsAndConditions');
		expect(postCall.orderTypes).not.toContain('RenewSubscription');
	});

	test('preview=false deletes the amendments and does include the term changes', async () => {
		// return a pending amendment on first call, then undefined
		let getCallCount = 0;
		mockZuoraClient.get.mockImplementation(() => {
			if (getCallCount === 0) {
				getCallCount++;
				return Promise.resolve({
					id: 'amendment-id',
					customerAcceptanceDate: '2099-01-01',
					status: 'Completed',
					type: 'UpdateProduct',
				});
			} else {
				return Promise.resolve(undefined);
			}
		});
		// Mock delete to resolve immediately
		mockZuoraClient.delete.mockResolvedValue({ success: true });

		// order
		mockZuoraClient.post.mockResolvedValueOnce({
			success: true,
			invoiceIds: ['invoice-id'],
		} as ZuoraSwitchResponse);

		// getInvoices
		mockZuoraClient.get.mockResolvedValueOnce({
			success: true,
			id: 'invinv0328',
			amount: 12,
			amountWithoutTax: 12,
			balance: 0,
			accountId: 'accid1234555',
		} as GetInvoiceResponse);

		// createPayment
		mockZuoraClient.post.mockResolvedValueOnce({
			Success: true,
		} as ZuoraUpperCaseSuccess);

		const takePaymentOrAdjustInvoice = jest.fn().mockResolvedValue(75);
		const sendThankYouEmail = jest.fn().mockResolvedValue(undefined);
		const sendSalesforceTracking = jest.fn().mockResolvedValue(undefined);
		const sendToSupporterProductData = jest.fn().mockResolvedValue(undefined);

		jest.doMock('../../../src/payment', () => ({
			takePaymentOrAdjustInvoice,
		}));
		jest.doMock('../../../src/changePlan/action/productSwitchEmail', () => ({
			sendThankYouEmail,
		}));
		jest.doMock('../../../src/salesforceTracking', () => ({
			sendSalesforceTracking,
		}));
		jest.doMock('../../../src/supporterProductData', () => ({
			sendToSupporterProductData,
		}));

		const targetInformation: TargetInformation =
			await getTestTargetInformation();

		const subscriptionInformation = getSubscriptionInformation(
			guardianSubscriptionWithKeys,
		);

		const orderRequest: SwitchOrderRequestBuilder =
			new SwitchOrderRequestBuilder(
				targetInformation.productRatePlanId,
				targetInformation.contributionCharge,
				targetInformation.discount?.productRatePlanId['CODE'],
				subscriptionInformation,
				false,
			);

		const accountInformation = getAccountInformation(account);

		const result = await new DoSwitchAction(
			mockZuoraClient as unknown as ZuoraClient,
			'CODE',
			dayjs('2025-09-16'),
		).switchToSupporterPlus(
			{ caseId: 'asdfCaseId', csrUserId: 'asdfCsrUserId' },
			{
				account: accountInformation,
				subscription: subscriptionInformation,
				target: targetInformation,
			},
			orderRequest,
		);

		expect(result.message).toContain('Product move completed successfully');
		expect(mockZuoraClient.post).toHaveBeenCalled();
		const postCall = getOrderData();
		expect(postCall).toEqual({
			url: 'v1/orders?returnIds=true',
			orderTypes: ['ChangePlan', 'TermsAndConditions', 'RenewSubscription'],
		});
		// TODO might be worth checking that it actually removed the pending amendments - need to mock the getLatestAmendment call
	});
});
