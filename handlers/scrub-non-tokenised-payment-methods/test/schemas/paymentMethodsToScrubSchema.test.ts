/**
 * @group unit
 */
import { paymentMethodsToScrubSchema } from '../../src/schemas';

const row = {
	payment_method_id: 'pm-1',
	account_id: 'acc-1',
	account_number: 'A00000001',
};

it('accepts what the query selects today', () => {
	expect(paymentMethodsToScrubSchema.parse([row])).toEqual([row]);
});

it('accepts an empty result', () => {
	expect(paymentMethodsToScrubSchema.parse([])).toEqual([]);
});

it('rejects a renamed column rather than passing undefined ids on', () => {
	const { payment_method_id: _, ...renamed } = row;

	expect(() =>
		paymentMethodsToScrubSchema.parse([
			{ ...renamed, paymentMethodId: 'pm-1' },
		]),
	).toThrow();
});

it('rejects an empty id, which would look like a missing account to Zuora', () => {
	expect(() =>
		paymentMethodsToScrubSchema.parse([{ ...row, account_number: '' }]),
	).toThrow();
});
