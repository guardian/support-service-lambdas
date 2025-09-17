// modules/zuora/test/buildCreateSubscriptionRequest.test.ts
import {
	buildCreateSubscriptionRequest,
	CreateSubscriptionInputFields,
} from '../src/createSubscription/createSubscription';
import { ReaderType } from '../src/createSubscription/readerType';
import { AppliedPromotion, Promotion } from '@modules/promotions/schema';
import dayjs from 'dayjs';
import { IsoCurrency } from '@modules/internationalisation/currency';
import { Stage } from '@modules/stage';
import { CreditCardReferenceTransaction } from '@modules/zuora/orders/paymentMethods';
import { prettyLog } from '@modules/prettyPrint';
import { CreateSubscriptionOrderAction } from '@modules/zuora/orders/orderActions';

jest.mock('../src/createSubscription/chargeOverride', () => ({
	getChargeOverride: jest.fn(() => undefined),
}));
jest.mock('../src/createSubscription/getProductRatePlan', () => ({
	getProductRatePlan: jest.fn(() => ({
		id: 'ratePlanId',
		termType: 'Recurring',
		termLengthInMonths: 12,
	})),
}));
jest.mock('../src/createSubscription/subscriptionDates', () => ({
	getSubscriptionDates: jest.fn(() => ({
		contractEffectiveDate: dayjs('2024-06-01'),
		customerAcceptanceDate: dayjs('2024-06-05'),
	})),
}));
jest.mock('@modules/promotions/validatePromotion', () => ({
	validatePromotion: jest.fn(() => ({
		discountPercentage: 10,
		durationInMonths: 3,
		promoCode: 'PROMO10',
	})),
}));

const productCatalog = {} as any;
const promotions: Promotion[] = [
	{
		name: 'Test Promo',
		promotionType: { name: 'percent_discount', amount: 10, durationMonths: 3 },
		appliesTo: {
			countries: new Set(['GB']),
			productRatePlanIds: new Set(['ratePlanId']),
		},
		codes: { 'Channel 0': ['PROMO10'] },
		starts: new Date('2024-01-01'),
		expires: new Date('2025-01-01'),
	},
];

const paymentMethod = {
	type: 'CreditCardReferenceTransaction' as const,
	tokenId: 'test_token_id',
	secondTokenId: 'test_second_token_id',
	cardNumber: '42424242424242',
	cardType: 'Visa',
	expirationMonth: 12,
	expirationYear: 2099,
};

const baseInput: CreateSubscriptionInputFields<CreditCardReferenceTransaction> =
	{
		stage: 'CODE' as Stage,
		accountName: 'Test Account',
		createdRequestId: 'req-123',
		salesforceAccountId: 'sf-acc-1',
		salesforceContactId: 'sf-con-1',
		identityId: 'id-1',
		currency: 'GBP' as IsoCurrency,
		paymentGateway: 'Stripe PaymentIntents GNM Membership',
		paymentMethod: paymentMethod,
		billToContact: {
			firstName: 'A',
			lastName: 'B',
			workEmail: 'test@test.com',
			country: 'GB',
		},
		productPurchase: {
			product: 'SupporterPlus',
			ratePlan: 'Monthly',
			amount: 12,
		},
	};

const isCreateSubscriptionOrderAction = (
	obj: any,
): obj is CreateSubscriptionOrderAction => {
	return (
		obj &&
		typeof obj === 'object' &&
		'type' in obj &&
		obj.type === 'CreateSubscription'
	);
};

describe('buildCreateSubscriptionRequest', () => {
	it('builds request without promotion or gift', () => {
		const request = buildCreateSubscriptionRequest(
			productCatalog,
			promotions,
			baseInput,
		);
		prettyLog(request);
		if (!('newAccount' in request)) {
			throw new Error('Expected newAccount in request');
		}
		expect(request.newAccount.name).toEqual('Test Account');
		expect(request.subscriptions[0]?.orderActions[0]?.type).toBe(
			'CreateSubscription',
		);
		expect(request.subscriptions[0]?.customFields?.ReaderType__c).toBe(
			ReaderType.Direct,
		);
		expect(request.processingOptions.runBilling).toBe(true);
		expect(request.processingOptions.collectPayment).toBe(true);
	});

	it('builds request with applied promotion', () => {
		const input = {
			...baseInput,
			appliedPromotion: {
				promoCode: 'PROMO10',
				countryGroupId: 'uk',
			} as AppliedPromotion,
		};
		const req = buildCreateSubscriptionRequest(
			productCatalog,
			promotions,
			input,
		);
		const orderAction = req.subscriptions[0]?.orderActions[0];
		if (!isCreateSubscriptionOrderAction(orderAction)) {
			throw new Error('Expected CreateOrderRequest');
		}

		expect(orderAction.createSubscription.subscribeToRatePlans.length).toBe(2);
		expect(req.subscriptions[0]?.customFields?.ReaderType__c).toBe(
			ReaderType.Direct,
		);
	});

	it('builds request with gift recipient', () => {
		const input = {
			...baseInput,
			giftRecipient: {
				email: 'gift@domain.com',
				firstName: 'Gift',
				lastName: 'Recipient',
			},
		};
		const req = buildCreateSubscriptionRequest(
			productCatalog,
			promotions,
			input,
		);
		expect(req.subscriptions[0]?.customFields?.ReaderType__c).toBe(
			ReaderType.Gift,
		);
	});

	it('sets the correct ReaderType for a patron promotion', () => {
		const input = {
			...baseInput,
			appliedPromotion: {
				promoCode: 'SOMETHINGPATRON',
				countryGroupId: 'uk',
			} as AppliedPromotion,
		};
		const req = buildCreateSubscriptionRequest(
			productCatalog,
			promotions,
			input,
		);
		expect(req.subscriptions[0]?.customFields?.ReaderType__c).toBe(
			ReaderType.Patron,
		);
	});

	it('sets runBilling and collectPayment to false if specified', () => {
		const input = {
			...baseInput,
			runBilling: false,
			collectPayment: false,
		};
		const req = buildCreateSubscriptionRequest(
			productCatalog,
			promotions,
			input,
		);
		expect(req.processingOptions.runBilling).toBe(false);
		expect(req.processingOptions.collectPayment).toBe(false);
	});
});
