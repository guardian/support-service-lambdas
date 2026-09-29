import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { zuoraSubscriptionSchema } from '@modules/zuora/types';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import zuoraCatalogFixture from '../../zuora-catalog/test/fixtures/catalog-prod.json';
import { GuardianSubscriptionParser } from '../src/guardianSubscriptionParser';
import echoLegacyWithMissingChargesJson from './fixtures/echoLegacyWithMissingCharges.json';
import legacyHolidayCreditMismatchSubscriptionJson from './fixtures/legacyHolidayCreditMismatchSubscription.json';

const zuoraCatalog = zuoraCatalogSchema.parse(zuoraCatalogFixture);
const productCatalog = generateProductCatalog(zuoraCatalog);
const guardianSubscriptionParser = new GuardianSubscriptionParser(
	zuoraCatalog,
	productCatalog,
);

test("discards the known broken legacy holiday credit, while retaining the subscription's other rate plans", () => {
	const subscription = zuoraSubscriptionSchema.parse(
		legacyHolidayCreditMismatchSubscriptionJson,
	);

	const guardianSubscription =
		guardianSubscriptionParser.toGuardianSubscription(subscription);

	// the broken legacy rate plan should be dropped, not crash the request
	expect(
		guardianSubscription.productsNotInCatalog.some(
			(rp) => rp.productRatePlan.id === '2c92a0fc5b42d2c9015b6259f7f40040',
		),
	).toBe(false);

	// the subscription's real, current rate plan must still be present and unaffected
	expect(guardianSubscription.ratePlans).toHaveLength(1);
	expect(guardianSubscription.ratePlans[0]?.productRatePlanId).toBe(
		'2c92a0fe6619b4b301661aa494392ee2',
	);
});

test('throws a clear error where echo-legacy is missing most of its charges', () => {
	const subscription = zuoraSubscriptionSchema.parse(
		echoLegacyWithMissingChargesJson,
	);

	let thrown: unknown;
	try {
		guardianSubscriptionParser.toGuardianSubscription(subscription);
	} catch (err) {
		thrown = err;
	}

	/*
	actual error should be like this

    Failed to join charges between rate plan "Newspaper Delivery/Echo-Legacy" (id: 7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a7a) and product rate plan "Echo-Legacy" (id: 2c92a0ff56fe33f001572334561765c1)

      at indexAndJoinZuoraRatePlanCharges (src/reprocessRatePlans/zuoraRatePlanBuilder.ts:154:9)
          at Array.map (<anonymous>)
      at GuardianSubscriptionParser.toGuardianSubscription (src/guardianSubscriptionParser.ts:169:47)
      at Object.<anonymous> (test/legacyHolidayCreditMismatch.test.ts:45:30)

    Cause:
    Different keys detected when joining product rate plan charges with rate plan charges:
      "Monday (2c92a0ff56fe33f001572334573865f8)" - OK
    - "Friday (2c92a0ff56fe33f00157233456b965de)" - only in product rate plan charges
    - "Saturday (2c92a0ff56fe33f00157233457be6611)" - only in product rate plan charges
    - "Sunday (2c92a0ff56fe33f001572334577d6606)" - only in product rate plan charges
    - "Thursday (2c92a0ff56fe33f001572334567b65d4)" - only in product rate plan charges
    - "Tuesday (2c92a0ff56fe33f001572334564265c9)" - only in product rate plan charges
    - "Wednesday (2c92a0ff56fe33f00157233456f865eb)" - only in product rate plan charges

	 */
	expect(thrown).toBeInstanceOf(Error);
	expect((thrown as Error).message).toContain(
		'Failed to join charges between rate plan "Newspaper Delivery/Echo-Legacy"',
	);

	const cause = (thrown as Error).cause;
	expect(cause).toBeInstanceOf(Error);
	expect((cause as Error).message).toContain(
		'Different keys detected when joining product rate plan charges with rate plan charges',
	);
	expect((cause as Error).message).toContain(
		'"Monday (2c92a0ff56fe33f001572334573865f8)" - OK',
	);
	expect((cause as Error).message).toContain(
		'- "Friday (2c92a0ff56fe33f00157233456b965de)" - only in product rate plan charges',
	);
});
