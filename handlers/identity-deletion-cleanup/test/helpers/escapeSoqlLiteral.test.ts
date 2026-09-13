import { escapeSoqlLiteral } from '../../src/helpers';

describe('escapeSoqlLiteral', () => {
	it('escapes backslashes and single quotes', () => {
		expect(escapeSoqlLiteral("old\\identity'id")).toBe("old\\\\identity\\'id");
	});
});
