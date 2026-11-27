import { z } from 'zod';
import { parseStepInput } from '../../../src/refund/handlers/stepInput';
import { PermanentError } from '../../../src/refund/permanentError';

describe('parseStepInput', () => {
	const schema = z.object({ invoiceId: z.string() });

	it('returns the parsed input', () => {
		expect(parseStepInput(schema, { invoiceId: 'invoice-1' })).toEqual({
			invoiceId: 'invoice-1',
		});
	});

	it('throws a PermanentError for invalid input', () => {
		expect(() => parseStepInput(schema, {})).toThrow(PermanentError);
	});
});
