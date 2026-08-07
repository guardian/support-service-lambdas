/**
 * @group unit
 */
import { isSameWorkList } from '../../src/helpers';
import type { PaymentMethodToScrub } from '../../src/types';

const item = (id: string): PaymentMethodToScrub => ({
	payment_method_id: id,
	account_id: `acc-${id}`,
	account_number: `A0000${id}`,
});

it('the same payment methods in a different order is still the same work list', () => {
	expect(isSameWorkList([item('1'), item('2')], [item('2'), item('1')])).toBe(
		true,
	);
});

it('one payment method having dropped out means the last run achieved something', () => {
	expect(isSameWorkList([item('1'), item('2')], [item('1')])).toBe(false);
});

it('a swapped payment method is a different work list', () => {
	expect(isSameWorkList([item('1')], [item('2')])).toBe(false);
});

it('two empty lists are the same, so the caller has to exclude that case', () => {
	expect(isSameWorkList([], [])).toBe(true);
});
