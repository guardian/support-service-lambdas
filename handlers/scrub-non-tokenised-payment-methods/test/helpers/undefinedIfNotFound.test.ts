/**
 * @group unit
 */
import { undefinedIfNotFound } from '../../src/helpers';
import { zuoraErrorFixture } from '../fixtures';

it('turns a not-found into undefined so the caller can skip', () => {
	expect(
		undefinedIfNotFound(zuoraErrorFixture('50000040', 'Cannot find entity')),
	).toBeUndefined();
});

it('rethrows anything else', () => {
	const other = zuoraErrorFixture('99999999', 'Something else went wrong');

	expect(() => undefinedIfNotFound(other)).toThrow('Something else went wrong');
});
