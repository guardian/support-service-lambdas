/**
 * @group unit
 */
import { isNotFoundInZuora } from '../../src/helpers';
import { zuoraErrorFixture } from '../fixtures';

it('recognises the Zuora code for a thing that is not there', () => {
	expect(
		isNotFoundInZuora(zuoraErrorFixture('50000040', 'Cannot find entity')),
	).toBe(true);
});

it('does not recognise any other Zuora error', () => {
	// Narrow on purpose. Widening this would start swallowing real failures.
	expect(
		isNotFoundInZuora(zuoraErrorFixture('50000030', 'Cannot delete')),
	).toBe(false);
});

it('does not recognise something that is not a Zuora error at all', () => {
	expect(isNotFoundInZuora(new Error('50000040'))).toBe(false);
	expect(isNotFoundInZuora('50000040')).toBe(false);
	expect(isNotFoundInZuora(undefined)).toBe(false);
});
