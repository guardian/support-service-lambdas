import {
	buildCreateSubscriptionRequest,
	CreateSubscriptionInputFields,
} from '../src/createSubscription/createSubscription';
import { ReaderType } from '../src/createSubscription/readerType';
import { AppliedPromotion, Promotion } from '@modules/promotions/schema';
import dayjs from 'dayjs';
import { IsoCurrency } from '@modules/internationalisation/currency';
import { Stage } from '@modules/stage';
import {
	CreditCardReferenceTransaction,
	PaymentGateway,
} from '@modules/zuora/orders/paymentMethods';
import { CreateSubscriptionOrderAction } from '@modules/zuora/orders/orderActions';
import code from '../../zuora-catalog/test/fixtures/catalog-code.json';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { SupportRegionId } from '@modules/internationalisation/countryGroup';

const contractEffectiveDate = dayjs('2025-09-01');
const customerAcceptanceDate = dayjs('2025-09-05');

jest.mock('../src/createSubscription/subscriptionDates', () => ({
	getSubscriptionDates: jest.fn(() => ({
		contractEffectiveDate: dayjs(contractEffectiveDate),
		customerAcceptanceDate: dayjs(customerAcceptanceDate),
	})),
}));

const productCatalog = generateProductCatalog(code);
const promotions: Promotion[] = [
	{
		name: 'Test Promo',
		promotionType: { name: 'percent_discount', amount: 10, durationMonths: 3 },
		appliesTo: {
			countries: new Set(['GB']),
			productRatePlanIds: new Set(['8ad08cbd8586721c01858804e3275376']),
		},
		codes: { 'Channel 0': ['PROMO10'] },
		starts: new Date('2024-01-01'),
		expires: new Date('2099-01-01'),
	},
	{
		name: 'Patron Promo',
		promotionType: { name: 'percent_discount', amount: 10, durationMonths: 3 },
		appliesTo: {
			countries: new Set(['GB']),
			productRatePlanIds: new Set(['8ad08cbd8586721c01858804e3275376']),
		},
		codes: { 'Channel 0': ['TEST_PATRON'] },
		starts: new Date('2024-01-01'),
		expires: new Date('2099-01-01'),
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

const baseStripeInput = {
	stage: 'CODE' as Stage,
	accountName: 'Test Account',
	createdRequestId: 'request-123',
	salesforceAccountId: 'sf-acc-1',
	salesforceContactId: 'sf-con-1',
	identityId: 'id-1',
	currency: 'GBP' as IsoCurrency,
	paymentGateway:
		'Stripe PaymentIntents GNM Membership' as PaymentGateway<CreditCardReferenceTransaction>,
	paymentMethod: paymentMethod,
	billToContact: {
		firstName: 'A',
		lastName: 'B',
		workEmail: 'test@test.com',
		country: 'GB',
	},
};

const supporterPlusInput: CreateSubscriptionInputFields<CreditCardReferenceTransaction> =
	{
		...baseStripeInput,
		productPurchase: {
			product: 'SupporterPlus',
			ratePlan: 'Monthly',
			amount: 12,
		},
	};
const guardianWeeklyGiftInput: CreateSubscriptionInputFields<CreditCardReferenceTransaction> =
	{
		...baseStripeInput,
		productPurchase: {
			product: 'GuardianWeeklyDomestic',
			ratePlan: 'OneYearGift',
			firstDeliveryDate: dayjs().add(1, 'month').toDate(),
			deliveryContact: {
				firstName: 'G',
				lastName: 'W',
				workEmail: 'test@test.com',
				country: 'GB',
				address1: '90 York Way',
				city: 'London',
				postalCode: 'N19GU',
			},
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

describe('the buildCreateSubscriptionRequest function', () => {
	it('builds request without promotion or gift', () => {
		const request = buildCreateSubscriptionRequest(
			productCatalog,
			promotions,
			supporterPlusInput,
		);
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
		expect(request).toMatchSnapshot();
	});

	it('builds request with applied promotion', () => {
		const input = {
			...supporterPlusInput,
			appliedPromotion: {
				promoCode: 'PROMO10',
				supportRegionId: SupportRegionId.UK,
			} as AppliedPromotion,
		};
		const request = buildCreateSubscriptionRequest(
			productCatalog,
			promotions,
			input,
		);
		const orderAction = request.subscriptions[0]?.orderActions[0];
		if (!isCreateSubscriptionOrderAction(orderAction)) {
			throw new Error('Expected CreateOrderRequest');
		}

		expect(orderAction.createSubscription.subscribeToRatePlans.length).toBe(2);
		expect(request.subscriptions[0]?.customFields?.ReaderType__c).toBe(
			ReaderType.Direct,
		);
		expect(request).toMatchSnapshot();
	});

	it('builds request with gift recipient', () => {
		const input = {
			...guardianWeeklyGiftInput,
			giftRecipient: {
				email: 'gift@domain.com',
				firstName: 'Gift',
				lastName: 'Recipient',
			},
		};
		const request = buildCreateSubscriptionRequest(
			productCatalog,
			promotions,
			input,
		);
		expect(request.subscriptions[0]?.customFields?.ReaderType__c).toBe(
			ReaderType.Gift,
		);
		expect(request).toMatchSnapshot();
	});

	it('sets the correct ReaderType for a patron promotion', () => {
		const input = {
			...supporterPlusInput,
			appliedPromotion: {
				promoCode: 'TEST_PATRON',
				supportRegionId: SupportRegionId.UK,
			} as AppliedPromotion,
		};
		const request = buildCreateSubscriptionRequest(
			productCatalog,
			promotions,
			input,
		);
		expect(request.subscriptions[0]?.customFields?.ReaderType__c).toBe(
			ReaderType.Patron,
		);
	});

	it('sets runBilling and collectPayment to false if specified', () => {
		const input = {
			...supporterPlusInput,
			runBilling: false,
			collectPayment: false,
		};
		const request = buildCreateSubscriptionRequest(
			productCatalog,
			promotions,
			input,
		);
		expect(request.processingOptions.runBilling).toBe(false);
		expect(request.processingOptions.collectPayment).toBe(false);
	});
});
