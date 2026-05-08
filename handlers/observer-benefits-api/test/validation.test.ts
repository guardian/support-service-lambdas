import type { GuardianSubscription } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import type { ZuoraAccount } from '@modules/zuora/types';
import { isValid } from '../src/validation';

function makeSubscription(
	productKey: string,
	productRatePlanKey: string,
): GuardianSubscription {
	return {
		ratePlan: { productKey, productRatePlanKey },
	} as unknown as GuardianSubscription;
}

function makeAccount(zipCode: string | null): ZuoraAccount {
	return {
		billToContact: {
			zipCode,
		},
	} as unknown as ZuoraAccount;
}

describe('isValid', () => {
	describe('returns true', () => {
		test('when postcode and product match', () => {
			const subscription = makeSubscription('HomeDelivery', 'Everyday');
			const account = makeAccount('N1 9GU');

			const result = isValid(subscription, account, 'N1 9GU');

			expect(result).toBe(true);
		});

		test('when postcodes match case-insensitively', () => {
			const subscription = makeSubscription('HomeDelivery', 'Weekend');
			const account = makeAccount('n1 9gu');

			const result = isValid(subscription, account, 'N1 9GU');

			expect(result).toBe(true);
		});

		test('when postcodes match ignoring spaces', () => {
			const subscription = makeSubscription('HomeDelivery', 'Sunday');
			const account = makeAccount('N19GU');

			const result = isValid(subscription, account, 'N1 9GU');

			expect(result).toBe(true);
		});

		test.each([
			['Everyday'],
			['EverydayPlus'],
			['Weekend'],
			['WeekendPlus'],
			['Sunday'],
			['SundayPlus'],
		])('when rate plan key is %s', (ratePlanKey) => {
			const subscription = makeSubscription('HomeDelivery', ratePlanKey);
			const account = makeAccount('N1 9GU');

			const result = isValid(subscription, account, 'N1 9GU');

			expect(result).toBe(true);
		});

		test.each([
			['HomeDelivery'],
			['NationalDelivery'],
			['SubscriptionCard'],
			['NewspaperVoucher'],
		])('when newspaper product key is %s', (productKey) => {
			const subscription = makeSubscription(productKey, 'Everyday');
			const account = makeAccount('N1 9GU');

			const result = isValid(subscription, account, 'N1 9GU');
			expect(result).toBe(true);
		});
	});

	describe('returns false', () => {
		test('when postcode does not match', () => {
			const subscription = makeSubscription('HomeDelivery', 'Everyday');
			const account = makeAccount('N1 9GU');

			const result = isValid(subscription, account, 'N1 9GX');

			expect(result).toBe(false);
		});

		test('when product is not a newspaper product', () => {
			const subscription = makeSubscription('Contribution', 'Monthly');
			const account = makeAccount('N1 9GU');

			const result = isValid(subscription, account, 'N1 9GU');

			expect(result).toBe(false);
		});

		test('when rate plan key is not an observer rate plan', () => {
			const subscription = makeSubscription('HomeDelivery', 'Sixday');
			const account = makeAccount('N1 9GU');

			const result = isValid(subscription, account, 'N1 9GU');

			expect(result).toBe(false);
		});
	});
});
