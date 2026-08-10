/**
 * @group unit
 */
import { stillBillingReason } from '../../src/services';
import {
	activeSubscription,
	cancelledAtEndOfTermSubscription,
	cancelledSubscription,
} from '../fixtures';

it('says nothing when every subscription is cancelled and out of term', () => {
	expect(
		stillBillingReason([cancelledSubscription, cancelledSubscription]),
	).toBeUndefined();
});

it('an account with no subscriptions never had one to cancel', () => {
	expect(stillBillingReason([])).toBe('no subscriptions');
});

it('counts the subscriptions that are not cancelled', () => {
	expect(stillBillingReason([cancelledSubscription, activeSubscription])).toBe(
		'1 subscription(s) that are not cancelled',
	);
});

it('holds off while a cancellation is dated to the end of the term', () => {
	expect(stillBillingReason([cancelledAtEndOfTermSubscription])).toBe(
		'1 cancelled subscription(s) whose term has not ended yet',
	);
});

it('one subscription still in term is enough to hold the whole account', () => {
	expect(
		stillBillingReason([
			cancelledSubscription,
			cancelledAtEndOfTermSubscription,
		]),
	).toBe('1 cancelled subscription(s) whose term has not ended yet');
});
