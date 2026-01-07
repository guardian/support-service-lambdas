import { z } from 'zod';
import { stringify } from '../src/stringify';

test('stringify should not serialise any stray values in the object, for security reasons', () => {
	const testSchema = z.object({
		response: z.string(),
	});

	const input = {
		response: 'hello',
		dontLeakThisToClient: 'nuclearLaunchCodes',
	};

	const expected = {
		response: 'hello',
	};

	const actual = stringify(input, testSchema);

	expect(JSON.parse(actual)).toEqual(expected);
});
