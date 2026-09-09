import { getCurrentIsoTime } from '../../src/helpers/getCurrentIsoTime';
import { defaultDeps } from '../../src/services/defaultDeps';
import { getBrazeUuidFromIdapi } from '../../src/services/getBrazeUuidFromIdapi';
import { sendPaymentFailureExitEvent } from '../../src/services/sendPaymentFailureExitEvent';

describe('defaultDeps', () => {
	it('wires the production implementations into the controller dependencies', () => {
		expect(defaultDeps).toEqual({
			getBrazeUuidFromIdapi,
			sendPaymentFailureExitEvent,
			now: getCurrentIsoTime,
		});
	});
});
