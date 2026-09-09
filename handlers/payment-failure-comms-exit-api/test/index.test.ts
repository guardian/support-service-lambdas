import { handler } from '../src';
import { handler as entrypointHandler } from '../src/handlers/paymentFailureCommsExitHandler';

describe('package entrypoint', () => {
	it('exports the Lambda handler', () => {
		expect(handler).toBe(entrypointHandler);
	});
});
